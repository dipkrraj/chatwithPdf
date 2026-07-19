import json
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.chat import Chat


class ChatRepository:

    def save_message(
        self,
        db: Session,
        pdf_id: int,
        user_id: int,
        role: str,
        content: str,
        source_chunks: Optional[list] = None,
    ) -> Chat:
        chat = Chat(
            pdf_id=pdf_id,
            user_id=user_id,
            role=role,
            content=content,
            source_chunks=json.dumps(source_chunks) if source_chunks else None,
        )
        db.add(chat)
        db.commit()
        db.refresh(chat)
        return chat

    def get_history(
        self, db: Session, pdf_id: int, skip: int = 0, limit: int = 20
    ) -> Tuple[List[Chat], int]:
        query = db.query(Chat).filter(Chat.pdf_id == pdf_id)
        total = query.count()
        items = query.order_by(Chat.created_at.asc()).offset(skip).limit(limit).all()
        return items, total

    def get_recent(self, db: Session, pdf_id: int, n: int = 5) -> List[Chat]:
        """Fetch the last N messages for conversation memory context."""
        return (
            db.query(Chat)
            .filter(Chat.pdf_id == pdf_id)
            .order_by(Chat.created_at.desc())
            .limit(n)
            .all()[::-1]  # reverse to chronological order
        )

    def clear_history(self, db: Session, pdf_id: int) -> int:
        deleted = db.query(Chat).filter(Chat.pdf_id == pdf_id).delete()
        db.commit()
        return deleted


chat_repository = ChatRepository()
