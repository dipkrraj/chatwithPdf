"""Tests for PDF upload, listing, status, and deletion endpoints."""
import io
import pytest


def _make_pdf_bytes() -> bytes:
    """Return minimal valid PDF bytes for testing."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R"
        b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        b"4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Hello PDF) Tj ET\nendstream\nendobj\n"
        b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"xref\n0 6\n0000000000 65535 f\n"
        b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF"
    )


class TestUploadPDF:
    def test_upload_success(self, client, auth_headers):
        content = _make_pdf_bytes()
        resp = client.post(
            "/api/v1/pdfs/upload",
            headers=auth_headers,
            files={"file": ("sample.pdf", io.BytesIO(content), "application/pdf")},
        )
        assert resp.status_code == 202
        data = resp.json()
        assert data["filename"] == "sample.pdf"
        assert data["status"] == "pending"
        assert "id" in data

    def test_upload_non_pdf_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/v1/pdfs/upload",
            headers=auth_headers,
            files={"file": ("document.txt", io.BytesIO(b"hello"), "text/plain")},
        )
        assert resp.status_code == 415
        assert "InvalidFileTypeError" in resp.json()["error"]

    def test_upload_unauthenticated(self, client):
        resp = client.post(
            "/api/v1/pdfs/upload",
            files={"file": ("x.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
        )
        assert resp.status_code == 401  # HTTPBearer returns 401 when no header


class TestListPDFs:
    def test_list_empty(self, client, auth_headers):
        resp = client.get("/api/v1/pdfs/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_after_upload(self, client, auth_headers):
        content = _make_pdf_bytes()
        client.post(
            "/api/v1/pdfs/upload",
            headers=auth_headers,
            files={"file": ("a.pdf", io.BytesIO(content), "application/pdf")},
        )
        resp = client.get("/api/v1/pdfs/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert "skip" in data
        assert "limit" in data

    def test_list_pagination(self, client, auth_headers):
        resp = client.get("/api/v1/pdfs/?skip=0&limit=5", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["limit"] == 5


class TestGetPDF:
    def test_get_existing_pdf(self, client, auth_headers):
        content = _make_pdf_bytes()
        upload = client.post(
            "/api/v1/pdfs/upload",
            headers=auth_headers,
            files={"file": ("b.pdf", io.BytesIO(content), "application/pdf")},
        )
        pdf_id = upload.json()["id"]
        resp = client.get(f"/api/v1/pdfs/{pdf_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == pdf_id

    def test_get_nonexistent_pdf(self, client, auth_headers):
        resp = client.get("/api/v1/pdfs/99999", headers=auth_headers)
        assert resp.status_code == 404
        assert "PDFNotFoundException" in resp.json()["error"]


class TestDeletePDF:
    def test_delete_pdf(self, client, auth_headers):
        content = _make_pdf_bytes()
        upload = client.post(
            "/api/v1/pdfs/upload",
            headers=auth_headers,
            files={"file": ("del.pdf", io.BytesIO(content), "application/pdf")},
        )
        pdf_id = upload.json()["id"]
        resp = client.delete(f"/api/v1/pdfs/{pdf_id}", headers=auth_headers)
        assert resp.status_code == 204
        # Confirm it's gone
        get_resp = client.get(f"/api/v1/pdfs/{pdf_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    def test_delete_nonexistent_pdf(self, client, auth_headers):
        resp = client.delete("/api/v1/pdfs/99999", headers=auth_headers)
        assert resp.status_code == 404
