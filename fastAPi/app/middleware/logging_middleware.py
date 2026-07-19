import logging
import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("app")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every incoming request with:
    - A unique request ID for tracing
    - HTTP method and path
    - Response status code
    - Total response time in milliseconds
    """

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        logger.info(
            "[%s] --> %s %s",
            request_id,
            request.method,
            request.url.path,
        )

        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "[%s] <-- %s %s | status=%d | %.1fms",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )

        # Add request ID to response headers for client-side tracing
        response.headers["X-Request-ID"] = request_id
        return response
