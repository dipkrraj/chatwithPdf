from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.database import Base


class PDF(Base):
    __tablename__ = "pdfs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending | processing | done | failed
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="pdfs")
    chats = relationship("Chat", back_populates="pdf", cascade="all, delete-orphan")
