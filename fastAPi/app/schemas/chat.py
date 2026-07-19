from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    pdf_id: int
    question: str


class SourceChunk(BaseModel):
    chunk_id: str
    page_number: int
    text_preview: str


class ChatResponse(BaseModel):
    id: int
    role: str
    content: str
    source_chunks: Optional[List[SourceChunk]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    items: List[ChatResponse]
    total: int
    skip: int
    limit: int
