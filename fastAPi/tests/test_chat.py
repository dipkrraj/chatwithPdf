"""Tests for chat endpoints: RAG querying, history, and clearing."""
import io
import pytest


def _upload_pdf(client, auth_headers) -> int:
    """Helper to upload a dummy PDF and return its id."""
    content = (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R"
        b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        b"4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Hello) Tj ET\nendstream\nendobj\n"
        b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"xref\n0 6\n0000000000 65535 f\n"
        b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF"
    )
    resp = client.post(
        "/api/v1/pdfs/upload",
        headers=auth_headers,
        files={"file": ("chat_test.pdf", io.BytesIO(content), "application/pdf")},
    )
    return resp.json()["id"]


class TestChatQuery:
    def test_ask_question_success(self, client, auth_headers):
        pdf_id = _upload_pdf(client, auth_headers)
        resp = client.post(
            "/api/v1/chat/",
            headers=auth_headers,
            json={"pdf_id": pdf_id, "question": "What is this document about?"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "assistant"
        assert len(data["content"]) > 0
        assert "source_chunks" in data
        assert "created_at" in data

    def test_ask_question_returns_source_pages(self, client, auth_headers):
        pdf_id = _upload_pdf(client, auth_headers)
        resp = client.post(
            "/api/v1/chat/",
            headers=auth_headers,
            json={"pdf_id": pdf_id, "question": "Summarize the content."},
        )
        assert resp.status_code == 200
        source_chunks = resp.json()["source_chunks"]
        assert isinstance(source_chunks, list)
        if source_chunks:
            assert "page_number" in source_chunks[0]
            assert "chunk_id" in source_chunks[0]

    def test_ask_question_unauthenticated(self, client):
        resp = client.post(
            "/api/v1/chat/",
            json={"pdf_id": 1, "question": "Hello?"},
        )
        assert resp.status_code == 401  # HTTPBearer returns 401 when no header


class TestChatHistory:
    def test_history_empty(self, client, auth_headers):
        pdf_id = _upload_pdf(client, auth_headers)
        resp = client.get(f"/api/v1/chat/history/{pdf_id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_history_after_chat(self, client, auth_headers):
        pdf_id = _upload_pdf(client, auth_headers)
        client.post(
            "/api/v1/chat/",
            headers=auth_headers,
            json={"pdf_id": pdf_id, "question": "What is this about?"},
        )
        resp = client.get(f"/api/v1/chat/history/{pdf_id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # Should have at least 2 messages: user + assistant
        assert data["total"] >= 2

    def test_history_pagination(self, client, auth_headers):
        pdf_id = _upload_pdf(client, auth_headers)
        resp = client.get(
            f"/api/v1/chat/history/{pdf_id}?skip=0&limit=5",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["limit"] == 5


class TestClearHistory:
    def test_clear_history_success(self, client, auth_headers):
        pdf_id = _upload_pdf(client, auth_headers)
        # Send a message first
        client.post(
            "/api/v1/chat/",
            headers=auth_headers,
            json={"pdf_id": pdf_id, "question": "Test question."},
        )
        # Clear
        resp = client.delete(f"/api/v1/chat/history/{pdf_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert "Cleared" in resp.json()["message"]

        # Verify empty
        history_resp = client.get(f"/api/v1/chat/history/{pdf_id}", headers=auth_headers)
        assert history_resp.json()["total"] == 0

    def test_clear_history_unauthenticated(self, client):
        resp = client.delete("/api/v1/chat/history/1")
        assert resp.status_code == 401  # HTTPBearer returns 401 when no header
