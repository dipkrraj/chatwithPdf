import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.chat_repository import chat_repository
from app.schemas.chat import ChatHistoryResponse, ChatRequest, ChatResponse, SourceChunk
from app.services.rag_service import rag_service

logger = logging.getLogger("app")

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


def _parse_source_chunks(raw: Optional[str]) -> Optional[List[SourceChunk]]:
    """Deserialize source_chunks JSON string back to SourceChunk list."""
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return [SourceChunk(**item) for item in data]
    except Exception:
        return None


@router.post(
    "/",
    response_model=ChatResponse,
    summary="Ask a question about a PDF using RAG + Groq LLM",
)
def ask_question(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = rag_service.answer(
        db=db,
        pdf_id=payload.pdf_id,
        user_id=current_user.id,
        question=payload.question,
    )
    logger.info("Chat answered: pdf_id=%d user_id=%d", payload.pdf_id, current_user.id)
    return result


@router.get(
    "/history/{pdf_id}",
    response_model=ChatHistoryResponse,
    summary="Get paginated chat history for a PDF",
)
def get_history(
    pdf_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = chat_repository.get_history(db, pdf_id=pdf_id, skip=skip, limit=limit)
    chat_items = []
    for msg in items:
        chat_items.append(
            ChatResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                source_chunks=_parse_source_chunks(msg.source_chunks),
                created_at=msg.created_at,
            )
        )
    return ChatHistoryResponse(items=chat_items, total=total, skip=skip, limit=limit)


@router.delete(
    "/history/{pdf_id}",
    status_code=status.HTTP_200_OK,
    summary="Clear all chat history for a PDF",
)
def clear_history(
    pdf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = chat_repository.clear_history(db, pdf_id=pdf_id)
    return {"message": f"Cleared {deleted} messages for pdf_id={pdf_id}"}
