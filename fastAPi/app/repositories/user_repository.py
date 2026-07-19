from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:

    def create_user(
        self, db: Session, email: str, username: str, hashed_password: str, profile_pic: Optional[str] = None
    ) -> User:
        user = User(email=email, username=username, hashed_password=hashed_password, profile_pic=profile_pic)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()


user_repository = UserRepository()
