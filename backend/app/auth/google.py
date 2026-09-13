"""Google OAuth 2.0 authorization, code exchange, and ID token verification."""

import hmac
import os
import secrets
from typing import Any, Dict, List, Optional
import urllib.parse

from fastapi import Response
import httpx
import jwt
from jwt import PyJWKClient

from app.auth.session import (
    User,
    is_production_environment,
)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]

OAUTH_STATE_COOKIE_NAME = "tracekit_oauth_state"
OAUTH_STATE_COOKIE_MAX_AGE = 600  # 10 minutes
GOOGLE_JWKS_CACHE_LIFESPAN = 3600  # 1 hour

_cached_jwks_client: Optional[PyJWKClient] = None


def get_google_oauth_config() -> Dict[str, str]:
    """Retrieve and validate Google OAuth configuration from environment variables."""
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "").strip()

    if not client_id or not client_secret or not redirect_uri:
        raise RuntimeError(
            "Google OAuth configuration is incomplete. "
            "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI must be configured."
        )

    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }


def generate_oauth_state() -> str:
    """Generate a high-entropy cryptographically random state parameter."""
    return secrets.token_urlsafe(32)


def set_oauth_state_cookie(
    response: Response,
    state: str,
    max_age: int = OAUTH_STATE_COOKIE_MAX_AGE,
    secure: Optional[bool] = None,
) -> None:
    """Store the OAuth state in a short-lived HttpOnly SameSite=Lax cookie.
    
    Security attributes enforced:
    - HttpOnly=True (inaccessible to JavaScript)
    - SameSite=Lax (safe navigation, CSRF protection)
    - Path=/
    - Max-Age=600 (10 minutes)
    - Secure=True in production, False in local development
    """
    is_secure = secure if secure is not None else is_production_environment()
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=state,
        max_age=max_age,
        expires=max_age,
        path="/",
        domain=None,
        secure=is_secure,
        httponly=True,
        samesite="lax",
    )


def clear_oauth_state_cookie(
    response: Response,
    secure: Optional[bool] = None,
) -> None:
    """Clear the temporary OAuth state cookie."""
    is_secure = secure if secure is not None else is_production_environment()
    response.delete_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        path="/",
        domain=None,
        secure=is_secure,
        httponly=True,
        samesite="lax",
    )


def validate_oauth_state(
    received_state: Optional[str],
    stored_state: Optional[str],
) -> bool:
    """Validate callback state against stored cookie state using constant-time comparison."""
    if not received_state or not str(received_state).strip():
        return False
    if not stored_state or not str(stored_state).strip():
        return False
    return hmac.compare_digest(received_state.strip(), stored_state.strip())


def build_google_authorization_url(
    state: str,
    client_id: str,
    redirect_uri: str,
) -> str:
    """Construct Google's OAuth 2.0 authorization URL with minimal required scopes."""
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


async def exchange_google_code_for_tokens(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    http_client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Any]:
    """Exchange authorization code server-to-server with Google for tokens.
    
    Safe error handling: never leaks client_secret, code, or raw token data in errors.
    """
    token_payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        if http_client is not None:
            resp = await http_client.post(GOOGLE_TOKEN_URL, data=token_payload)
        else:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(GOOGLE_TOKEN_URL, data=token_payload)
    except Exception:
        raise ValueError("Failed to connect to Google OAuth token endpoint.")

    if resp.status_code != 200:
        raise ValueError("Google rejected authorization code exchange.")

    try:
        data = resp.json()
    except Exception:
        raise ValueError("Malformed token response from Google.")

    if not isinstance(data, dict) or "id_token" not in data:
        raise ValueError("Google token response did not include an ID token.")

    return data


def get_google_jwks_client() -> PyJWKClient:
    """Retrieve or create cached PyJWKClient for Google's public JWKS keys."""
    global _cached_jwks_client
    if _cached_jwks_client is None:
        _cached_jwks_client = PyJWKClient(
            GOOGLE_JWKS_URL,
            cache_jwk_set=True,
            lifespan=GOOGLE_JWKS_CACHE_LIFESPAN,
        )
    return _cached_jwks_client


def verify_google_id_token(
    id_token: str,
    client_id: str,
    jwks_client: Optional[Any] = None,
    signing_key_override: Optional[Any] = None,
) -> User:
    """Cryptographically verify Google ID token and return a validated User model.
    
    Validates:
    - Signature via Google published JWKS RS256 public keys
    - Issuer == https://accounts.google.com or accounts.google.com
    - Audience == GOOGLE_CLIENT_ID
    - Expiration (exp) and issued-at (iat)
    - Presence of immutable subject identifier (sub)
    
    Does NOT use email as stable identity; User.id is strictly sub.
    """
    if not id_token or not id_token.strip():
        raise ValueError("ID token is missing or empty.")

    if signing_key_override is not None:
        key = signing_key_override
    else:
        client = jwks_client or get_google_jwks_client()
        try:
            signing_key = client.get_signing_key_from_jwt(id_token)
            key = signing_key.key
        except Exception:
            raise ValueError("Failed to retrieve matching public key for Google ID token.")

    try:
        payload = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=GOOGLE_ISSUERS,
            leeway=10,
            options={
                "require": ["sub", "iat", "exp", "aud", "iss"],
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": True,
                "verify_iss": True,
            },
        )
    except jwt.ExpiredSignatureError:
        raise ValueError("Google ID token has expired.")
    except jwt.InvalidIssuerError:
        raise ValueError("Google ID token has an invalid issuer.")
    except jwt.InvalidAudienceError:
        raise ValueError("Google ID token has an invalid audience.")
    except jwt.InvalidSignatureError:
        raise ValueError("Google ID token signature verification failed.")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid Google ID token.")
    except Exception:
        raise ValueError("Failed to verify Google ID token.")

    sub = payload.get("sub")
    if not sub or not str(sub).strip():
        raise ValueError("Google ID token is missing a valid subject identifier (sub).")

    return User(
        id=str(sub).strip(),
        email=payload.get("email"),
        name=payload.get("name"),
        picture=payload.get("picture"),
    )
