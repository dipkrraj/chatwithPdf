import logging
import logging.config
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import Base, engine
from app.exceptions.handlers import (
    ChromaDBError,
    FileTooLargeError,
    InvalidFileTypeError,
    LLMError,
    PDFNotFoundException,
    PDFProcessingError,
    chroma_db_error_handler,
    file_too_large_handler,
    invalid_file_type_handler,
    llm_error_handler,
    pdf_not_found_handler,
    pdf_processing_error_handler,
)
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.routers import auth, chat, pdf

# ─── Logging Configuration ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("app")


# ─── Lifespan: startup + shutdown ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up AI PDF Chat API...")

    # Create database tables automatically only for local SQLite setup
    # (Production deployment schemas are fully managed by Alembic migrations)
    from app.database.database import DATABASE_URL
    if DATABASE_URL.startswith("sqlite"):
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Local SQLite database tables initialized")



    yield  # App is running

    # Shutdown
    logger.info("Shutting down AI PDF Chat API...")


# ─── App Instance ─────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    description=(
        "A production-grade RAG (Retrieval Augmented Generation) API. "
        "Upload PDFs, parse and embed them, then chat with them using Groq LLM and Chroma vector search."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

# ─── Exception Handlers ───────────────────────────────────────────────────────
app.add_exception_handler(PDFNotFoundException, pdf_not_found_handler)
app.add_exception_handler(PDFProcessingError, pdf_processing_error_handler)
app.add_exception_handler(FileTooLargeError, file_too_large_handler)
app.add_exception_handler(InvalidFileTypeError, invalid_file_type_handler)
app.add_exception_handler(ChromaDBError, chroma_db_error_handler)
app.add_exception_handler(LLMError, llm_error_handler)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(pdf.router)
app.include_router(chat.router)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }
