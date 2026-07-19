from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.exceptions.handlers import PDFNotFoundException
from app.models.pdf import PDF


class PDFRepository:

    def create(self, db: Session, user_id: int, filename: str, storage_path: str) -> PDF:
        pdf = PDF(filename=filename, storage_path=storage_path, user_id=user_id, status="pending")
        db.add(pdf)
        db.commit()
        db.refresh(pdf)
        return pdf

    def get_by_id(self, db: Session, pdf_id: int) -> PDF:
        pdf = db.query(PDF).filter(PDF.id == pdf_id).first()
        if not pdf:
            raise PDFNotFoundException(pdf_id)
        return pdf

    def get_by_user(self, db: Session, user_id: int, skip: int = 0, limit: int = 10) -> Tuple[List[PDF], int]:
        query = db.query(PDF).filter(PDF.user_id == user_id)
        total = query.count()
        items = query.order_by(PDF.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def update_status(self, db: Session, pdf_id: int, status: str, page_count: int = 0, chunk_count: int = 0) -> PDF:
        pdf = self.get_by_id(db, pdf_id)
        pdf.status = status
        if page_count:
            pdf.page_count = page_count
        if chunk_count:
            pdf.chunk_count = chunk_count
        db.commit()
        db.refresh(pdf)
        return pdf

    def delete(self, db: Session, pdf_id: int) -> None:
        pdf = self.get_by_id(db, pdf_id)
        db.delete(pdf)
        db.commit()


pdf_repository = PDFRepository()
