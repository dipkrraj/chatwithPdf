"""Tests for authentication endpoints."""
import pytest


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "StrongPass123!",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser@example.com"
        assert data["username"] == "newuser"
        assert "id" in data
        assert "created_at" in data
        assert "password" not in data  # Never expose password

    def test_register_duplicate_email(self, client, registered_user):
        resp = client.post("/api/v1/auth/register", json={
            "email": "test@example.com",  # already registered
            "username": "different_user",
            "password": "Pass123!",
        })
        assert resp.status_code == 400
        assert "Email already registered" in resp.json()["detail"]

    def test_register_duplicate_username(self, client, registered_user):
        resp = client.post("/api/v1/auth/register", json={
            "email": "different@example.com",
            "username": "testuser",  # already taken
            "password": "Pass123!",
        })
        assert resp.status_code == 400
        assert "Username already taken" in resp.json()["detail"]

    def test_register_invalid_email(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "username": "user123",
            "password": "Pass123!",
        })
        assert resp.status_code == 422  # Pydantic validation error

    def test_register_missing_fields(self, client):
        resp = client.post("/api/v1/auth/register", json={"email": "a@b.com"})
        assert resp.status_code == 422


class TestLogin:
    def test_login_success(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "TestPass123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "WrongPassword!",
        })
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.json()["detail"]

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "ghost@example.com",
            "password": "Pass123!",
        })
        assert resp.status_code == 401


class TestRefreshAndLogout:
    def test_refresh_token_success(self, client, refresh_token):
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # Rotated — new refresh token should be different
        assert data["refresh_token"] != refresh_token

    def test_refresh_token_invalid(self, client):
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid-token"})
        assert resp.status_code == 401

    def test_logout_success(self, client, refresh_token):
        resp = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "Logged out" in resp.json()["message"]

    def test_logout_already_revoked(self, client, refresh_token):
        client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
        # Try again — should fail
        resp = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
        assert resp.status_code == 400


class TestGetMe:
    def test_get_me_authenticated(self, client, auth_headers, registered_user):
        resp = client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"
        assert data["username"] == "testuser"

    def test_get_me_unauthenticated(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401  # HTTPBearer returns 401 when no header
