from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.database import Base


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    pdf_id = Column(Integer, ForeignKey("pdfs.id", ondelete="CASCADE"), nullable=True)
    role = Column(String, nullable=False)   # "user" | "assistant"
    content = Column(Text, nullable=False)
    source_chunks = Column(Text, nullable=True)  # JSON list of chunk IDs + page numbers used
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="chats")
    pdf = relationship("PDF", back_populates="chats")
