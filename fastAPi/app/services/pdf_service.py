import logging
import os
from pathlib import Path
from typing import List

import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session

from app.core.config import settings
from app.exceptions.handlers import (
    FileTooLargeError,
    InvalidFileTypeError,
    PDFProcessingError,
)
from app.models.pdf import PDF
from app.repositories.pdf_repository import pdf_repository
from app.services.chroma_service import chroma_service
from app.services.embedding_service import embedding_service

logger = logging.getLogger("app")

CHUNK_SIZE = 512
CHUNK_OVERLAP = 50


class PDFService:

    def validate_file(self, filename: str, file_size_bytes: int) -> None:
        """Validate file type and size before processing."""
        if not filename.lower().endswith(".pdf"):
            raise InvalidFileTypeError(filename)
        max_bytes = settings.max_file_size_mb * 1024 * 1024
        if file_size_bytes > max_bytes:
            raise FileTooLargeError(settings.max_file_size_mb)

    def save_file(self, user_id: int, pdf_id: int, content: bytes) -> str:
        """Save the raw PDF bytes to disk and return the storage path."""
        upload_dir = Path(settings.upload_dir) / str(user_id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        path = upload_dir / f"{pdf_id}.pdf"
        path.write_bytes(content)
        return str(path)

    def extract_pages(self, content: bytes) -> List[dict]:
        """
        Use PyMuPDF to extract text page-by-page.
        Returns list of {page_number, text} dicts.
        """
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            pages = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text").strip()
                if text:  # skip blank pages
                    pages.append({"page_number": page_num + 1, "text": text})
            doc.close()
            return pages
        except Exception as exc:
            raise PDFProcessingError(f"Failed to parse PDF: {exc}") from exc

    def chunk_pages(self, pages: List[dict]) -> List[dict]:
        """
        Chunk each page's text using RecursiveCharacterTextSplitter.
        Returns list of {text, page_number, chunk_index} dicts.
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks = []
        chunk_index = 0
        for page in pages:
            page_chunks = splitter.split_text(page["text"])
            for chunk_text in page_chunks:
                chunks.append(
                    {
                        "text": chunk_text,
                        "page_number": page["page_number"],
                        "chunk_index": chunk_index,
                    }
                )
                chunk_index += 1
        return chunks

    def process_pdf(self, db: Session, pdf: PDF, content: bytes) -> PDF:
        """
        Full pipeline:
        1. Extract page-wise text (PyMuPDF)
        2. Chunk with RecursiveCharacterTextSplitter
        3. Embed all chunks (BAAI/bge-base-en-v1.5)
        4. Store in Chroma Cloud
        5. Update PDF status in SQLite
        """
        # Mark as parsing
        pdf_repository.update_status(db, pdf.id, "parsing")

        try:
            # Step 1: Extract
            pages = self.extract_pages(content)
            if not pages:
                raise PDFProcessingError("PDF contains no extractable text")

            # Step 2: Chunk
            chunks = self.chunk_pages(pages)
            if not chunks:
                raise PDFProcessingError("No text chunks generated from PDF")

            # Step 3: Embed
            pdf_repository.update_status(db, pdf.id, "embedding")
            texts = [c["text"] for c in chunks]
            embeddings = embedding_service.embed_texts(texts)

            # Step 4: Store in Chroma
            pdf_repository.update_status(db, pdf.id, "indexing")
            chunk_ids = [f"pdf_{pdf.id}_chunk_{c['chunk_index']}" for c in chunks]
            metadatas = [
                {
                    "pdf_id": str(pdf.id),
                    "page_number": c["page_number"],
                    "chunk_index": c["chunk_index"],
                    "filename": pdf.filename,
                }
                for c in chunks
            ]
            chroma_service.add_chunks(
                pdf_id=pdf.id,
                chunk_ids=chunk_ids,
                texts=texts,
                embeddings=embeddings,
                metadatas=metadatas,
            )

            # Step 5: Update status to done
            updated = pdf_repository.update_status(
                db, pdf.id, "done",
                page_count=len(pages),
                chunk_count=len(chunks),
            )
            logger.info(
                "PDF processed: id=%d pages=%d chunks=%d",
                pdf.id, len(pages), len(chunks),
            )
            return updated

        except (PDFProcessingError, InvalidFileTypeError):
            pdf_repository.update_status(db, pdf.id, "failed")
            raise
        except Exception as exc:
            pdf_repository.update_status(db, pdf.id, "failed")
            raise PDFProcessingError(f"Unexpected error during processing: {exc}") from exc


pdf_service = PDFService()
