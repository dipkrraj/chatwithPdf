import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.refresh_token_repository import refresh_token_repository
from app.repositories.user_repository import user_repository
import httpx
from app.core.config import settings
from app.schemas.user import (
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
    GoogleLoginRequest,
)

logger = logging.getLogger("app")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if user_repository.get_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if user_repository.get_by_username(db, payload.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    user = user_repository.create_user(
        db,
        email=payload.email,
        username=payload.username,
        hashed_password=get_password_hash(payload.password),
    )
    logger.info("New user registered: id=%d email=%s", user.id, user.email)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get access + refresh tokens",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = user_repository.get_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access_token = create_access_token({"sub": str(user.id)})
    raw_refresh = create_refresh_token()
    refresh_token_repository.save(db, user.id, raw_refresh)
    logger.info("User logged in: id=%d", user.id)
    return TokenResponse(access_token=access_token, refresh_token=raw_refresh)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange a refresh token for a new access token",
)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    rt = refresh_token_repository.get_valid(db, payload.refresh_token)
    if not rt:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    # Rotate: revoke old, issue new
    refresh_token_repository.revoke(db, payload.refresh_token)
    new_access = create_access_token({"sub": str(rt.user_id)})
    new_refresh = create_refresh_token()
    refresh_token_repository.save(db, rt.user_id, new_refresh)
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.post(
    "/logout",
    summary="Logout and revoke refresh token",
)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    revoked = refresh_token_repository.revoke(db, payload.refresh_token)
    if not revoked:
        raise HTTPException(status_code=400, detail="Token not found or already revoked")
    return {"message": "Logged out successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Login or Register using a Google Sign-In ID Token",
)
async def login_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    # 1. Verify the credential token with Google's tokeninfo endpoint
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": payload.credential},
                timeout=10.0,
            )
        except Exception as exc:
            logger.error("Google tokeninfo connection error: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not contact Google verification service",
            )

    if resp.status_code != 200:
        logger.warning("Google token verification failed with status: %d", resp.status_code)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential",
        )

    token_info = resp.json()

    # 2. Verify client ID match
    aud = token_info.get("aud")
    if aud != settings.google_client_id:
        logger.warning("Google token aud mismatch: %s vs %s", aud, settings.google_client_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid audience claim in token",
        )

    # 3. Check email
    email = token_info.get("email")
    email_verified = token_info.get("email_verified")
    if not email or email_verified != "true":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unverified Google email address",
        )

    # 4. Check if user already exists
    user = user_repository.get_by_email(db, email)
    picture_url = token_info.get("picture")
    
    if not user:
        # Create a new user automatically
        import time
        username = token_info.get("name") or email.split("@")[0]
        # Clean username to avoid duplicates or spaces
        username = "".join(c for c in username if c.isalnum()).lower()
        if user_repository.get_by_username(db, username):
            username = f"{username}{int(time.time()) % 1000}"

        import secrets
        # generate a random strong password for the oauth user
        random_pass = secrets.token_urlsafe(16)
        hashed_pass = get_password_hash(random_pass)

        user = user_repository.create_user(
            db,
            email=email,
            username=username,
            hashed_password=hashed_pass,
            profile_pic=picture_url,
        )
        logger.info("Automatically registered new Google OAuth user: id=%d email=%s", user.id, user.email)
    else:
        # Update user's profile picture if it changed
        if user.profile_pic != picture_url:
            user.profile_pic = picture_url
            db.commit()
            db.refresh(user)

    # 5. Issue access and refresh tokens
    access_token = create_access_token({"sub": str(user.id)})
    raw_refresh = create_refresh_token()
    refresh_token_repository.save(db, user.id, raw_refresh)
    logger.info("Google OAuth login successful: id=%d", user.id)
    
    avatar_url = token_info.get("picture")
    return TokenResponse(
        access_token=access_token, 
        refresh_token=raw_refresh, 
        avatar_url=avatar_url
    )

