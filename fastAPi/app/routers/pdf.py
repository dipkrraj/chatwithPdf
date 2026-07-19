import logging
import os

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.pdf_repository import pdf_repository
from app.schemas.pdf import PDFListResponse, PDFResponse
from app.services.chroma_service import chroma_service
from app.services.pdf_service import pdf_service

logger = logging.getLogger("app")

router = APIRouter(prefix="/api/v1/pdfs", tags=["PDFs"])


def _process_in_background(pdf_id: int, user_id: int, content: bytes, filename: str, db: Session):
    """Background task: run full PDF processing pipeline."""
    from app.repositories.pdf_repository import pdf_repository as repo
    pdf = repo.get_by_id(db, pdf_id)
    # Save to disk
    pdf.storage_path = pdf_service.save_file(user_id, pdf_id, content)
    db.commit()
    # Process pipeline
    pdf_service.process_pdf(db, pdf, content)


@router.post(
    "/upload",
    response_model=PDFResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF file — processing happens in the background",
)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    # Validate file before anything
    pdf_service.validate_file(file.filename, len(content))

    # Create DB record immediately (status=pending)
    pdf = pdf_repository.create(
        db, user_id=current_user.id, filename=file.filename, storage_path=""
    )

    # Queue background processing
    background_tasks.add_task(
        _process_in_background,
        pdf_id=pdf.id,
        user_id=current_user.id,
        content=content,
        filename=file.filename,
        db=db,
    )

    logger.info("PDF upload queued: id=%d user_id=%d filename=%s", pdf.id, current_user.id, file.filename)
    return pdf


@router.get(
    "/",
    response_model=PDFListResponse,
    summary="List all PDFs uploaded by the current user (paginated)",
)
def list_pdfs(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = pdf_repository.get_by_user(db, current_user.id, skip=skip, limit=limit)
    return PDFListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get(
    "/{pdf_id}",
    response_model=PDFResponse,
    summary="Get a specific PDF's details and processing status",
)
def get_pdf(
    pdf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf = pdf_repository.get_by_id(db, pdf_id)
    return pdf


@router.delete(
    "/{pdf_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a PDF and all its associated chunks from Chroma",
)
def delete_pdf(
    pdf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf_repository.get_by_id(db, pdf_id)  # raises 404 if not found
    chroma_service.delete_by_pdf_id(pdf_id)  # delete vectors
    pdf_repository.delete(db, pdf_id)  # delete from SQLite
    logger.info("PDF deleted: id=%d user_id=%d", pdf_id, current_user.id)


@router.get(
    "/{pdf_id}/file",
    summary="Download or stream the uploaded PDF document",
)
def get_pdf_file(
    pdf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf = pdf_repository.get_by_id(db, pdf_id)
    if pdf.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if not pdf.storage_path or not os.path.exists(pdf.storage_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
    return FileResponse(pdf.storage_path, media_type="application/pdf")
