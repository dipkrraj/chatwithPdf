import hashlib
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import get_refresh_token_expiry
from app.models.refresh_token import RefreshToken


def _hash_token(raw_token: str) -> str:
    """SHA-256 hash a raw token before storing — never store raw tokens."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


class RefreshTokenRepository:

    def save(self, db: Session, user_id: int, raw_token: str) -> RefreshToken:
        rt = RefreshToken(
            token_hash=_hash_token(raw_token),
            user_id=user_id,
            expires_at=get_refresh_token_expiry(),
        )
        db.add(rt)
        db.commit()
        db.refresh(rt)
        return rt

    def get_valid(self, db: Session, raw_token: str) -> Optional[RefreshToken]:
        token_hash = _hash_token(raw_token)
        return (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )

    def revoke(self, db: Session, raw_token: str) -> bool:
        rt = self.get_valid(db, raw_token)
        if not rt:
            return False
        rt.is_revoked = True
        db.commit()
        return True

    def revoke_all_for_user(self, db: Session, user_id: int) -> None:
        """Revoke all active refresh tokens for a user (e.g., on password change)."""
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,
        ).update({"is_revoked": True})
        db.commit()


refresh_token_repository = RefreshTokenRepository()
