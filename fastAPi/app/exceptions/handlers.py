from fastapi import Request, status
from fastapi.responses import JSONResponse


# ─── Custom Exception Classes ─────────────────────────────────────────────────

class PDFNotFoundException(Exception):
    def __init__(self, pdf_id: int):
        self.pdf_id = pdf_id
        super().__init__(f"PDF with id {pdf_id} not found")


class PDFProcessingError(Exception):
    def __init__(self, message: str):
        super().__init__(message)


class FileTooLargeError(Exception):
    def __init__(self, max_mb: int):
        super().__init__(f"File exceeds maximum allowed size of {max_mb}MB")


class InvalidFileTypeError(Exception):
    def __init__(self, filename: str):
        super().__init__(f"'{filename}' is not a valid PDF file")


class ChromaDBError(Exception):
    def __init__(self, message: str):
        super().__init__(f"Chroma DB error: {message}")


class LLMError(Exception):
    def __init__(self, message: str):
        super().__init__(f"LLM error: {message}")


# ─── Exception Handlers (register in main.py) ────────────────────────────────

def _error_response(status_code: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": error, "message": message, "status_code": status_code},
    )


async def pdf_not_found_handler(request: Request, exc: PDFNotFoundException) -> JSONResponse:
    return _error_response(status.HTTP_404_NOT_FOUND, "PDFNotFoundException", str(exc))


async def pdf_processing_error_handler(request: Request, exc: PDFProcessingError) -> JSONResponse:
    return _error_response(status.HTTP_422_UNPROCESSABLE_ENTITY, "PDFProcessingError", str(exc))


async def file_too_large_handler(request: Request, exc: FileTooLargeError) -> JSONResponse:
    return _error_response(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "FileTooLargeError", str(exc))


async def invalid_file_type_handler(request: Request, exc: InvalidFileTypeError) -> JSONResponse:
    return _error_response(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "InvalidFileTypeError", str(exc))


async def chroma_db_error_handler(request: Request, exc: ChromaDBError) -> JSONResponse:
    return _error_response(status.HTTP_503_SERVICE_UNAVAILABLE, "ChromaDBError", str(exc))


async def llm_error_handler(request: Request, exc: LLMError) -> JSONResponse:
    return _error_response(status.HTTP_503_SERVICE_UNAVAILABLE, "LLMError", str(exc))
