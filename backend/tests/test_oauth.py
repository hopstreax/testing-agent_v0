"""Tests for M8 Slice 2 Google OAuth endpoints and token verification."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
import urllib.parse

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
import jwt
import pytest

from app.auth.google import (
    OAUTH_STATE_COOKIE_NAME,
    build_google_authorization_url,
    clear_oauth_state_cookie,
    exchange_google_code_for_tokens,
    generate_oauth_state,
    get_google_oauth_config,
    set_oauth_state_cookie,
    validate_oauth_state,
    verify_google_id_token,
)
from app.auth.session import (
    COOKIE_NAME,
    User,
    create_session_token,
    decode_session_token,
)
from app.server import RunManager, create_app


# ---------------------------------------------------------------------------
# Fixtures & Test Keys
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def rsa_key_pair():
    """Generate a deterministic RSA key pair for testing RS256 token verification."""
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub = priv.public_key()
    pub_pem = pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return priv, pub_pem


@pytest.fixture(scope="module")
def other_rsa_key_pair():
    """Generate a second distinct RSA key pair for testing invalid signatures."""
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub = priv.public_key()
    pub_pem = pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return priv, pub_pem


@pytest.fixture
def oauth_env(monkeypatch):
    """Set standard test environment variables for Google OAuth and session secret."""
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret-xyz")
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback")
    monkeypatch.setenv("SESSION_SECRET_KEY", "test-session-secret-key-at-least-32-bytes-long!")
    monkeypatch.setenv("ENVIRONMENT", "development")


@pytest.fixture
def client(tmp_path: Path, oauth_env) -> TestClient:
    """Create a FastAPI TestClient configured with test environment."""
    artifacts = tmp_path / "artifacts" / "runs"
    artifacts.mkdir(parents=True, exist_ok=True)
    manager = RunManager(artifacts_base_dir=artifacts)
    app = create_app(artifacts_base_dir=artifacts, run_manager=manager)
    return TestClient(app)


def create_fake_google_id_token(
    rsa_key_pair,
    sub="google-sub-1234567890",
    email="testuser@example.com",
    name="Test User",
    picture="https://example.com/photo.jpg",
    aud="test-client-id.apps.googleusercontent.com",
    iss="https://accounts.google.com",
    expires_delta=timedelta(hours=1),
    headers=None,
):
    """Helper to create a cryptographically signed fake Google ID token."""
    priv, _ = rsa_key_pair
    now = datetime.now(timezone.utc)
    exp = now + expires_delta
    payload = {
        "sub": sub,
        "email": email,
        "name": name,
        "picture": picture,
        "aud": aud,
        "iss": iss,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    jwt_headers = headers or {"kid": "test-key-id"}
    return jwt.encode(payload, priv, algorithm="RS256", headers=jwt_headers)


# ---------------------------------------------------------------------------
# 1 to 7: Login Flow Tests
# ---------------------------------------------------------------------------

def test_oauth_login_redirects_to_google(client: TestClient):
    """1. OAuth login endpoint redirects to Google's authorization URL."""
    res = client.get("/api/auth/google/login", follow_redirects=False)
    assert res.status_code == 307
    location = res.headers.get("location", "")
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth")


def test_oauth_login_url_contains_expected_client_id(client: TestClient):
    """2. Authorization URL contains expected client ID."""
    res = client.get("/api/auth/google/login", follow_redirects=False)
    parsed = urllib.parse.urlparse(res.headers["location"])
    params = urllib.parse.parse_qs(parsed.query)
    assert params.get("client_id") == ["test-client-id.apps.googleusercontent.com"]


def test_oauth_login_redirect_uri_is_correct(client: TestClient):
    """3. Redirect URI matches configuration."""
    res = client.get("/api/auth/google/login", follow_redirects=False)
    parsed = urllib.parse.urlparse(res.headers["location"])
    params = urllib.parse.parse_qs(parsed.query)
    assert params.get("redirect_uri") == ["http://localhost:3000/api/auth/google/callback"]


def test_oauth_login_requested_scope(client: TestClient):
    """4. Requested scope is exactly 'openid email profile'."""
    res = client.get("/api/auth/google/login", follow_redirects=False)
    parsed = urllib.parse.urlparse(res.headers["location"])
    params = urllib.parse.parse_qs(parsed.query)
    assert params.get("scope") == ["openid email profile"]


def test_oauth_login_state_generated(client: TestClient):
    """5. Cryptographically random state is generated with sufficient entropy."""
    res = client.get("/api/auth/google/login", follow_redirects=False)
    parsed = urllib.parse.urlparse(res.headers["location"])
    params = urllib.parse.parse_qs(parsed.query)
    state = params.get("state", [""])[0]
    assert len(state) >= 32


def test_oauth_login_state_cookie_set_securely(client: TestClient):
    """6. State cookie is set with HttpOnly, SameSite=Lax, and matches state param."""
    res = client.get("/api/auth/google/login", follow_redirects=False)
    cookie_header = res.headers.get("set-cookie", "")
    assert OAUTH_STATE_COOKIE_NAME in cookie_header
    assert "HttpOnly" in cookie_header or "httponly" in cookie_header.lower()
    assert "samesite=lax" in cookie_header.lower()
    assert "path=/" in cookie_header.lower()

    parsed = urllib.parse.urlparse(res.headers["location"])
    params = urllib.parse.parse_qs(parsed.query)
    state = params.get("state", [""])[0]
    assert f"{OAUTH_STATE_COOKIE_NAME}={state}" in cookie_header


def test_oauth_login_configuration_failure(client: TestClient, monkeypatch):
    """7. OAuth configuration failure is handled safely without leaking secrets."""
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    res = client.get("/api/auth/google/login", follow_redirects=False)
    assert res.status_code == 500
    data = res.json()
    assert data["detail"] == "Google OAuth is not configured."


# ---------------------------------------------------------------------------
# 8 to 20: Callback Flow Tests
# ---------------------------------------------------------------------------

def test_oauth_callback_google_denial(client: TestClient):
    """Reject OAuth error safely when user cancels or denies access."""
    res = client.get("/api/auth/google/callback?error=access_denied", follow_redirects=False)
    assert res.status_code == 400
    assert "denied or cancelled" in res.json()["detail"].lower()


def test_oauth_callback_missing_code(client: TestClient):
    """Reject callback when code parameter is missing."""
    res = client.get("/api/auth/google/callback?state=xyz", follow_redirects=False)
    assert res.status_code == 400
    assert "Missing authorization code" in res.json()["detail"]


def test_oauth_callback_missing_state(client: TestClient):
    """8. Missing state parameter in query returns HTTP 400."""
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, "valid-state-abc")
    res = client.get("/api/auth/google/callback?code=fake-code", follow_redirects=False)
    assert res.status_code == 400
    assert "Missing OAuth state parameter" in res.json()["detail"]


def test_oauth_callback_missing_stored_state(client: TestClient):
    """9. Missing stored state cookie returns HTTP 400."""
    res = client.get("/api/auth/google/callback?code=fake-code&state=xyz", follow_redirects=False)
    assert res.status_code == 400
    assert "Missing OAuth state parameter" in res.json()["detail"]


def test_oauth_callback_state_mismatch(client: TestClient):
    """10. Mismatched state returns HTTP 400."""
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, "stored-state-111")
    res = client.get(
        "/api/auth/google/callback?code=fake-code&state=attacker-state-222",
        follow_redirects=False,
    )
    assert res.status_code == 400
    assert "OAuth state validation failed" in res.json()["detail"]


def test_oauth_callback_valid_state_proceeds(client: TestClient, rsa_key_pair):
    """11 & 12. Valid state proceeds with server-side authorization code exchange."""
    state = "valid-matching-state-12345"
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, state)

    test_token = create_fake_google_id_token(rsa_key_pair)

    with patch(
        "app.server.exchange_google_code_for_tokens",
        new_callable=AsyncMock,
    ) as mock_exchange, patch(
        "app.server.verify_google_id_token",
    ) as mock_verify:
        mock_exchange.return_value = {
            "access_token": "ya29.google-access-token",
            "id_token": test_token,
            "expires_in": 3600,
            "token_type": "Bearer",
        }
        mock_verify.return_value = User(
            id="google-sub-1234567890",
            email="testuser@example.com",
            name="Test User",
            picture="https://example.com/photo.jpg",
        )

        res = client.get(
            f"/api/auth/google/callback?code=valid-code-xyz&state={state}",
            follow_redirects=False,
        )

        assert res.status_code == 307
        assert res.headers["location"] == "/runs"
        assert mock_exchange.called
        assert mock_exchange.call_args[1]["code"] == "valid-code-xyz"


def test_oauth_callback_invalid_google_token_response(client: TestClient):
    """13. Google token exchange returning no ID token is rejected."""
    state = "matching-state-token-err"
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, state)

    with patch(
        "app.server.exchange_google_code_for_tokens",
        new_callable=AsyncMock,
        return_value={"access_token": "ya29.xyz"},  # Missing id_token
    ):
        res = client.get(
            f"/api/auth/google/callback?code=bad-token-code&state={state}",
            follow_redirects=False,
        )
        assert res.status_code == 400
        assert "Invalid token response" in res.json()["detail"]


def test_oauth_id_token_invalid_signature(rsa_key_pair, other_rsa_key_pair):
    """14. Google ID token signed with wrong key is rejected."""
    token = create_fake_google_id_token(rsa_key_pair)
    _, wrong_pub_pem = other_rsa_key_pair

    with pytest.raises(ValueError, match="signature verification failed"):
        verify_google_id_token(
            token,
            client_id="test-client-id.apps.googleusercontent.com",
            signing_key_override=wrong_pub_pem,
        )


def test_oauth_id_token_wrong_issuer(rsa_key_pair):
    """15. Google ID token with wrong issuer is rejected."""
    token = create_fake_google_id_token(rsa_key_pair, iss="https://evil.issuer.com")
    _, pub_pem = rsa_key_pair

    with pytest.raises(ValueError, match="invalid issuer"):
        verify_google_id_token(
            token,
            client_id="test-client-id.apps.googleusercontent.com",
            signing_key_override=pub_pem,
        )


def test_oauth_id_token_wrong_audience(rsa_key_pair):
    """16. Google ID token issued for another client ID is rejected."""
    token = create_fake_google_id_token(rsa_key_pair, aud="another-app-client-id")
    _, pub_pem = rsa_key_pair

    with pytest.raises(ValueError, match="invalid audience"):
        verify_google_id_token(
            token,
            client_id="test-client-id.apps.googleusercontent.com",
            signing_key_override=pub_pem,
        )


def test_oauth_id_token_expired(rsa_key_pair):
    """17. Expired Google ID token beyond leeway is rejected."""
    token = create_fake_google_id_token(rsa_key_pair, expires_delta=timedelta(seconds=-30))
    _, pub_pem = rsa_key_pair

    with pytest.raises(ValueError, match="expired"):
        verify_google_id_token(
            token,
            client_id="test-client-id.apps.googleusercontent.com",
            signing_key_override=pub_pem,
        )


def test_oauth_id_token_clock_skew_within_leeway_accepted(rsa_key_pair):
    """Google ID token with small future iat (clock skew within 10s leeway) is accepted."""
    priv, pub_pem = rsa_key_pair
    now = datetime.now(timezone.utc)
    # Token issued 2 seconds in future relative to local clock
    token = jwt.encode(
        {
            "sub": "google-sub-skew-ok",
            "email": "skew@example.com",
            "name": "Skew User",
            "aud": "test-client-id.apps.googleusercontent.com",
            "iss": "https://accounts.google.com",
            "iat": int((now + timedelta(seconds=2)).timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
        },
        priv,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )

    user = verify_google_id_token(
        token,
        client_id="test-client-id.apps.googleusercontent.com",
        signing_key_override=pub_pem,
    )
    assert user.id == "google-sub-skew-ok"
    assert user.email == "skew@example.com"


def test_oauth_id_token_clock_skew_beyond_leeway_rejected(rsa_key_pair):
    """Google ID token with future iat beyond 10s leeway is rejected."""
    priv, pub_pem = rsa_key_pair
    now = datetime.now(timezone.utc)
    # Token issued 25 seconds in future relative to local clock (exceeds 10s leeway)
    token = jwt.encode(
        {
            "sub": "google-sub-skew-bad",
            "email": "skew@example.com",
            "aud": "test-client-id.apps.googleusercontent.com",
            "iss": "https://accounts.google.com",
            "iat": int((now + timedelta(seconds=25)).timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
        },
        priv,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )

    with pytest.raises(ValueError, match="Invalid Google ID token"):
        verify_google_id_token(
            token,
            client_id="test-client-id.apps.googleusercontent.com",
            signing_key_override=pub_pem,
        )


def test_oauth_id_token_missing_sub(rsa_key_pair):
    """18. Google ID token with empty or missing sub is rejected."""
    priv, pub_pem = rsa_key_pair
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": "   ",
            "email": "testuser@example.com",
            "aud": "test-client-id.apps.googleusercontent.com",
            "iss": "https://accounts.google.com",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
        },
        priv,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )

    with pytest.raises(ValueError, match="subject identifier"):
        verify_google_id_token(
            token,
            client_id="test-client-id.apps.googleusercontent.com",
            signing_key_override=pub_pem,
        )


def test_oauth_callback_valid_identity_creates_tracekit_session(client: TestClient, rsa_key_pair):
    """19. Valid Google identity creates TraceKit session and clears state cookie."""
    state = "valid-matching-state-12345"
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, state)

    token = create_fake_google_id_token(rsa_key_pair, sub="google-sub-777", email="alice@test.org")

    with patch(
        "app.server.exchange_google_code_for_tokens",
        new_callable=AsyncMock,
        return_value={"id_token": token, "access_token": "ya29.fake"},
    ), patch("app.server.verify_google_id_token") as mock_verify:
        mock_verify.return_value = User(
            id="google-sub-777",
            email="alice@test.org",
            name="Alice",
            picture="https://example.com/alice.png",
        )

        res = client.get(
            f"/api/auth/google/callback?code=auth-code-123&state={state}",
            follow_redirects=False,
        )

        assert res.status_code == 307
        assert res.headers["location"] == "/runs"

        # Check tracekit_session cookie was set
        cookies = res.headers.get_list("set-cookie") if hasattr(res.headers, "get_list") else [res.headers.get("set-cookie", "")]
        all_cookie_str = " ; ".join(cookies)
        assert COOKIE_NAME in all_cookie_str

        # Check state cookie was deleted/cleared
        assert f"{OAUTH_STATE_COOKIE_NAME}=" in all_cookie_str


def test_oauth_tokens_not_in_tracekit_session(client: TestClient, rsa_key_pair):
    """20. Google access and refresh tokens are NOT placed in the TraceKit session token."""
    state = "state-token-leak-test"
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, state)

    token = create_fake_google_id_token(rsa_key_pair)

    with patch(
        "app.server.exchange_google_code_for_tokens",
        new_callable=AsyncMock,
        return_value={
            "id_token": token,
            "access_token": "super-secret-google-access-token-999",
            "refresh_token": "super-secret-google-refresh-token-888",
        },
    ), patch("app.server.verify_google_id_token") as mock_verify:
        mock_verify.return_value = User(
            id="google-sub-12345",
            email="user@test.org",
            name="User",
            picture=None,
        )

        res = client.get(
            f"/api/auth/google/callback?code=auth-code-123&state={state}",
            follow_redirects=False,
        )

        # Retrieve tracekit_session cookie value
        session_cookie = res.cookies.get(COOKIE_NAME)
        assert session_cookie is not None

        # Inspect raw JWT claims
        decoded = jwt.decode(session_cookie, options={"verify_signature": False})
        assert "access_token" not in decoded
        assert "refresh_token" not in decoded
        assert "super-secret-google-access-token-999" not in session_cookie
        assert "super-secret-google-refresh-token-888" not in session_cookie


# ---------------------------------------------------------------------------
# 21 to 23: /api/auth/me Tests
# ---------------------------------------------------------------------------

def test_auth_me_unauthenticated(client: TestClient):
    """21. /api/auth/me returns authenticated=false when no session exists."""
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    data = res.json()
    assert data == {"authenticated": False}


def test_auth_me_authenticated(client: TestClient):
    """22. /api/auth/me returns authenticated=true and user details when session exists."""
    user = User(
        id="google-sub-99999",
        email="bob@example.com",
        name="Bob Smith",
        picture="https://example.com/bob.jpg",
    )
    token = create_session_token(user)
    client.cookies.set(COOKIE_NAME, token)

    res = client.get("/api/auth/me")
    assert res.status_code == 200
    data = res.json()
    assert data["authenticated"] is True
    assert data["user"]["id"] == "google-sub-99999"
    assert data["user"]["email"] == "bob@example.com"
    assert data["user"]["name"] == "Bob Smith"
    assert data["user"]["picture"] == "https://example.com/bob.jpg"


def test_auth_me_no_session_jwt_exposed(client: TestClient):
    """23. /api/auth/me does not expose session JWT or cookies in response body."""
    user = User(id="google-sub-88888", email="carol@example.com")
    token = create_session_token(user)
    client.cookies.set(COOKIE_NAME, token)

    res = client.get("/api/auth/me")
    body_text = res.text
    assert token not in body_text
    assert "jwt" not in body_text.lower()


# ---------------------------------------------------------------------------
# 24 & 25: Logout Tests
# ---------------------------------------------------------------------------

def test_logout_session_cookie_cleared(client: TestClient):
    """24. POST /api/auth/logout clears tracekit_session cookie."""
    user = User(id="google-sub-logout-user", email="logout@example.com")
    token = create_session_token(user)
    client.cookies.set(COOKIE_NAME, token)

    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

    cookies = res.headers.get_list("set-cookie") if hasattr(res.headers, "get_list") else [res.headers.get("set-cookie", "")]
    all_cookie_str = " ; ".join(cookies)
    assert f"{COOKIE_NAME}=" in all_cookie_str


def test_logout_oauth_state_cookies_cleared(client: TestClient):
    """25. POST /api/auth/logout clears lingering OAuth state cookies."""
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, "lingering-state")

    res = client.post("/api/auth/logout")
    assert res.status_code == 200

    cookies = res.headers.get_list("set-cookie") if hasattr(res.headers, "get_list") else [res.headers.get("set-cookie", "")]
    all_cookie_str = " ; ".join(cookies)
    assert f"{OAUTH_STATE_COOKIE_NAME}=" in all_cookie_str


# ---------------------------------------------------------------------------
# 26 to 28: Security Properties Tests
# ---------------------------------------------------------------------------

def test_no_user_id_accepted_from_client_headers(client: TestClient):
    """26. Client headers cannot inject or spoof user identity."""
    headers = {
        "X-User-Id": "attacker-user-id",
        "X-Sub": "attacker-sub",
        "Authorization": "Bearer fake-token-here",
    }
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json() == {"authenticated": False}


def test_no_email_used_as_identity(rsa_key_pair):
    """27. User id is strictly Google sub, never email address."""
    token = create_fake_google_id_token(
        rsa_key_pair,
        sub="stable-google-sub-456",
        email="user.name@company.com",
    )
    _, pub_pem = rsa_key_pair
    user = verify_google_id_token(
        token,
        client_id="test-client-id.apps.googleusercontent.com",
        signing_key_override=pub_pem,
    )
    assert user.id == "stable-google-sub-456"
    assert user.id != "user.name@company.com"


def test_no_credential_leakage_in_error_text(client: TestClient):
    """28. Error responses do not leak secrets, tokens, or codes."""
    state = "secret-leak-check-state"
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, state)

    # Trigger code exchange error
    with patch(
        "app.server.exchange_google_code_for_tokens",
        new_callable=AsyncMock,
        side_effect=ValueError("Failed to connect to Google OAuth token endpoint."),
    ):
        res = client.get(f"/api/auth/google/callback?code=sensitive-code-999&state={state}")
        assert res.status_code == 400
        text = res.text
        assert "test-client-secret-xyz" not in text
        assert "sensitive-code-999" not in text
        assert "test-session-secret-key" not in text
