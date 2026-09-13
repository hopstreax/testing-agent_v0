"""Unit tests for M8 Slice 1: Backend Authentication Core & Session Engine."""

import os
from unittest.mock import patch
import pytest
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.testclient import TestClient

from app.auth import (
    COOKIE_NAME,
    DEFAULT_SESSION_LIFETIME_SECONDS,
    User,
    clear_session_cookie,
    create_session_token,
    decode_session_token,
    get_current_user,
    get_optional_current_user,
    set_session_cookie,
)

TEST_SECRET = "deterministic-test-session-secret-key-32bytes!!"


@pytest.fixture(autouse=True)
def set_test_env():
    """Ensure SESSION_SECRET_KEY is consistently set for tests."""
    with patch.dict(os.environ, {"SESSION_SECRET_KEY": TEST_SECRET, "ENVIRONMENT": "development"}):
        yield


# ---------------------------------------------------------------------------
# 1, 2, 3: Create, decode, and User extraction
# ---------------------------------------------------------------------------

def test_create_and_decode_valid_session():
    """Verify that a valid User can be converted into a signed JWT and cleanly decoded."""
    user = User(
        id="google_sub_1082938471928374",
        email="developer@example.com",
        name="Test Developer",
        picture="https://example.com/avatar.png",
    )

    token = create_session_token(user, secret_key=TEST_SECRET)
    assert isinstance(token, str)
    assert len(token) > 20

    decoded_user = decode_session_token(token, secret_key=TEST_SECRET)
    assert decoded_user.id == user.id
    assert decoded_user.sub == user.sub
    assert decoded_user.email == user.email
    assert decoded_user.name == user.name
    assert decoded_user.picture == user.picture


def test_user_minimal_fields():
    """Verify that a User with only id/sub works with session generation."""
    user = User(id="google_sub_9999999999")
    token = create_session_token(user, secret_key=TEST_SECRET)
    decoded_user = decode_session_token(token, secret_key=TEST_SECRET)

    assert decoded_user.id == "google_sub_9999999999"
    assert decoded_user.sub == "google_sub_9999999999"
    assert decoded_user.email is None
    assert decoded_user.name is None
    assert decoded_user.picture is None


# ---------------------------------------------------------------------------
# 4, 5, 6, 7, 8: Token validation and failure cases
# ---------------------------------------------------------------------------

def test_decode_empty_token_raises():
    """Verify that empty or whitespace tokens are rejected."""
    with pytest.raises(ValueError, match="missing or empty"):
        decode_session_token("", secret_key=TEST_SECRET)

    with pytest.raises(ValueError, match="missing or empty"):
        decode_session_token("   ", secret_key=TEST_SECRET)


def test_decode_malformed_token_raises():
    """Verify that malformed tokens raise an invalid token ValueError."""
    with pytest.raises(ValueError, match="Invalid session token"):
        decode_session_token("not.a.valid.jwt.token", secret_key=TEST_SECRET)


def test_decode_invalid_signature_raises():
    """Verify that tampering with the token or signing with another secret raises invalid token."""
    user = User(id="google_sub_123")
    token = create_session_token(user, secret_key="wrong-secret-key-abcdef123456789")

    with pytest.raises(ValueError, match="Invalid session token"):
        decode_session_token(token, secret_key=TEST_SECRET)


def test_decode_expired_token_raises():
    """Verify that expired tokens raise an expired session ValueError."""
    user = User(id="google_sub_123")
    # Generate token with negative lifetime to simulate expired token
    expired_token = create_session_token(user, secret_key=TEST_SECRET, lifetime_seconds=-60)

    with pytest.raises(ValueError, match="expired"):
        decode_session_token(expired_token, secret_key=TEST_SECRET)


def test_missing_or_empty_sub_raises():
    """Verify that tokens missing sub or having an empty sub are rejected."""
    with pytest.raises(ValueError, match="User id \\(sub\\) cannot be empty"):
        User(id="")

    import jwt
    # Handcraft payload missing sub
    payload = {"email": "no-sub@example.com", "iat": 1000, "exp": 9999999999}
    bad_token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
    with pytest.raises(ValueError, match="Invalid session token"):
        decode_session_token(bad_token, secret_key=TEST_SECRET)


def test_missing_secret_key_raises():
    """Verify that missing SESSION_SECRET_KEY in environment raises a configuration error."""
    with patch.dict(os.environ, {"SESSION_SECRET_KEY": ""}):
        user = User(id="google_sub_123")
        with pytest.raises(RuntimeError, match="SESSION_SECRET_KEY is not configured"):
            create_session_token(user)

        with pytest.raises(RuntimeError, match="SESSION_SECRET_KEY is not configured"):
            decode_session_token("some.jwt.token")


# ---------------------------------------------------------------------------
# 9 & 10: Cookie helpers (setting, clearing, attributes)
# ---------------------------------------------------------------------------

def test_set_session_cookie_attributes():
    """Verify set_session_cookie sets all required security attributes."""
    response = Response()
    set_session_cookie(response, token="fake_token_value", secure=False)

    cookie_header = response.headers.get("set-cookie")
    assert cookie_header is not None
    assert f"{COOKIE_NAME}=fake_token_value" in cookie_header
    assert "HttpOnly" in cookie_header
    assert "Path=/" in cookie_header
    assert "SameSite=lax" in cookie_header
    assert f"Max-Age={DEFAULT_SESSION_LIFETIME_SECONDS}" in cookie_header
    assert "Secure" not in cookie_header


def test_set_session_cookie_production_secure():
    """Verify set_session_cookie enables Secure in production environment."""
    response = Response()
    with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
        set_session_cookie(response, token="prod_token")
        cookie_header = response.headers.get("set-cookie")
        assert "Secure" in cookie_header


def test_clear_session_cookie_attributes():
    """Verify clear_session_cookie zeroes out max-age/expires cleanly."""
    response = Response()
    clear_session_cookie(response, secure=False)

    cookie_header = response.headers.get("set-cookie")
    assert cookie_header is not None
    assert f"{COOKIE_NAME}=" in cookie_header
    assert "Max-Age=0" in cookie_header or 'max-age=0' in cookie_header.lower()
    assert "HttpOnly" in cookie_header
    assert "SameSite=lax" in cookie_header


# ---------------------------------------------------------------------------
# 11 & 12: FastAPI dependencies in an isolated test app
# ---------------------------------------------------------------------------

def create_test_auth_app() -> FastAPI:
    """Create a minimal FastAPI app to test get_current_user and get_optional_current_user."""
    app = FastAPI()

    @app.get("/protected")
    def protected_route(user: User = Depends(get_current_user)):
        return {"user_id": user.id, "email": user.email}

    @app.get("/optional")
    def optional_route(user: User | None = Depends(get_optional_current_user)):
        if user is None:
            return {"authenticated": False}
        return {"authenticated": True, "user_id": user.id}

    return app


def test_dependency_missing_cookie_returns_401():
    """Verify request with missing cookie returns 401 Unauthorized."""
    client = TestClient(create_test_auth_app())
    res = client.get("/protected")
    assert res.status_code == 401
    assert res.json() == {"detail": "Authentication required."}


def test_dependency_invalid_cookie_returns_401():
    """Verify request with malformed/tampered cookie returns 401 Unauthorized."""
    client = TestClient(create_test_auth_app())
    client.cookies.set(COOKIE_NAME, "invalid-token-tampered")
    res = client.get("/protected")
    assert res.status_code == 401
    assert "Invalid or expired" in res.json().get("detail", "")


def test_dependency_expired_cookie_returns_401():
    """Verify request with expired cookie returns 401 Unauthorized."""
    client = TestClient(create_test_auth_app())
    user = User(id="sub_expired_user")
    expired_token = create_session_token(user, secret_key=TEST_SECRET, lifetime_seconds=-10)
    client.cookies.set(COOKIE_NAME, expired_token)

    res = client.get("/protected")
    assert res.status_code == 401
    assert "Invalid or expired" in res.json().get("detail", "")


def test_dependency_valid_cookie_returns_user():
    """Verify request with valid session cookie succeeds and extracts User model."""
    client = TestClient(create_test_auth_app())
    user = User(id="google_sub_12345", email="jane@tracekit.dev")
    token = create_session_token(user, secret_key=TEST_SECRET)
    client.cookies.set(COOKIE_NAME, token)

    res = client.get("/protected")
    assert res.status_code == 200
    assert res.json() == {"user_id": "google_sub_12345", "email": "jane@tracekit.dev"}


def test_dependency_ignores_client_supplied_headers():
    """Verify client-supplied headers or params cannot spoof authenticated identity."""
    client = TestClient(create_test_auth_app())
    res = client.get(
        "/protected",
        headers={"X-User-Id": "attacker", "Authorization": "Bearer attacker"},
        params={"user_id": "attacker"},
    )
    assert res.status_code == 401


def test_optional_user_dependency_no_cookie():
    """Verify optional-user dependency returns None / authenticated=False when unauthenticated."""
    client = TestClient(create_test_auth_app())
    res = client.get("/optional")
    assert res.status_code == 200
    assert res.json() == {"authenticated": False}


def test_optional_user_dependency_with_cookie():
    """Verify optional-user dependency returns User when valid cookie present."""
    client = TestClient(create_test_auth_app())
    user = User(id="google_sub_optional_123")
    token = create_session_token(user, secret_key=TEST_SECRET)
    client.cookies.set(COOKIE_NAME, token)

    res = client.get("/optional")
    assert res.status_code == 200
    assert res.json() == {"authenticated": True, "user_id": "google_sub_optional_123"}


def test_optional_user_dependency_with_invalid_cookie():
    """Verify optional-user dependency gracefully returns None when cookie is malformed."""
    client = TestClient(create_test_auth_app())
    client.cookies.set(COOKIE_NAME, "malformed-garbage")

    res = client.get("/optional")
    assert res.status_code == 200
    assert res.json() == {"authenticated": False}
