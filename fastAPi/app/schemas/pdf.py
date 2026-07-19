from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class PDFResponse(BaseModel):
    id: int
    filename: str
    storage_path: str
    status: str
    page_count: int
    chunk_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PDFListResponse(BaseModel):
    items: List[PDFResponse]
    total: int
    skip: int
    limit: int
