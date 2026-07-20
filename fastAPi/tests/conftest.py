"""
Test configuration and shared fixtures.

All tests use an isolated in-memory SQLite database.
Heavy services (embedding, Chroma, Groq) are mocked
so tests run fast without any external network calls.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import MagicMock, patch

from app.database.database import Base
from app.database.session import get_db
from app.main import app

# ─── In-memory test database ──────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once for the test session."""
    import app.models  # noqa — registers all models
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db():
    """Fresh DB session per test, with rollback after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """TestClient with overridden DB dependency and mocked external services."""
    app.dependency_overrides[get_db] = lambda: db

    # Mock embedding service to avoid loading the model in tests
    with patch("app.services.embedding_service.load_model") as mock_model:
        mock_model.return_value = MagicMock(
            encode=MagicMock(return_value=[[0.1] * 384])
        )
        with patch("app.services.chroma_service.get_chroma_client") as mock_chroma:
            mock_collection = MagicMock()
            mock_collection.query.return_value = {
                "documents": [["Sample context from the PDF."]],
                "metadatas": [[{"pdf_id": "1", "page_number": 1, "chunk_index": 0, "filename": "test.pdf"}]],
                "distances": [[0.15]],
            }
            mock_chroma.return_value.get_or_create_collection.return_value = mock_collection
            with patch("app.services.rag_service.get_groq_client") as mock_groq:
                mock_completion = MagicMock()
                mock_completion.choices[0].message.content = "This is a test answer from Groq."
                mock_completion.usage.total_tokens = 42
                mock_groq.return_value.chat.completions.create.return_value = mock_completion
                with TestClient(app) as c:
                    yield c

    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    """Pre-registered user fixture. Returns the response JSON."""
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPass123!",
    })
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def auth_headers(client, registered_user):
    """Login and return Bearer auth headers."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!",
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def refresh_token(client, registered_user):
    """Return the refresh token from login."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!",
    })
    return resp.json()["refresh_token"]
