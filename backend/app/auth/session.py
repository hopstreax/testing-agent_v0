"""Session token encoding, decoding, and cookie handling for TraceKit."""

from datetime import datetime, timedelta, timezone
import os
from typing import Any, Dict, Optional

from fastapi import Response
import jwt
from pydantic import BaseModel, Field, field_validator

COOKIE_NAME = "tracekit_session"
DEFAULT_SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60  # 7 days (604,800s)
JWT_ALGORITHM = "HS256"


class User(BaseModel):
    """Authenticated user domain model.
    
    The id attribute corresponds to the immutable, permanent Google subject identifier (sub).
    Email is stored for display and contact, but must never be used as the ownership identifier.
    """

    id: str = Field(..., description="Stable user identifier (Google sub)")
    email: Optional[str] = Field(None, description="User email address")
    name: Optional[str] = Field(None, description="User display name")
    picture: Optional[str] = Field(None, description="User avatar URL")

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("User id (sub) cannot be empty.")
        return s

    @property
    def sub(self) -> str:
        """Alias for id matching OAuth standard sub claim."""
        return self.id


def get_session_secret_key() -> str:
    """Retrieve the session secret key from environment configuration."""
    secret = os.getenv("SESSION_SECRET_KEY", "").strip()
    if not secret:
        raise RuntimeError("SESSION_SECRET_KEY is not configured in the environment.")
    return secret


def create_session_token(
    user: User,
    secret_key: Optional[str] = None,
    lifetime_seconds: int = DEFAULT_SESSION_LIFETIME_SECONDS,
) -> str:
    """Create a signed HS256 JWT session token for an authenticated user.
    
    Contains only minimum essential session claims: sub, email, name, picture, iat, exp.
    """
    if not user.id or not str(user.id).strip():
        raise ValueError("User id (sub) cannot be empty.")

    key = secret_key or get_session_secret_key()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=lifetime_seconds)

    payload: Dict[str, Any] = {
        "sub": str(user.id).strip(),
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }

    return jwt.encode(payload, key, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str, secret_key: Optional[str] = None) -> User:
    """Decode and verify an HS256 JWT session token, returning the User.
    
    Validates token signature, expiration, and presence of a valid non-empty subject.
    """
    if not token or not token.strip():
        raise ValueError("Session token is missing or empty.")

    key = secret_key or get_session_secret_key()

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "iat", "exp"]},
        )
    except jwt.ExpiredSignatureError:
        raise ValueError("Session token has expired.")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid session token.")

    sub = payload.get("sub")
    if not sub or not str(sub).strip():
        raise ValueError("Session token is missing a valid subject identifier (sub).")

    return User(
        id=str(sub).strip(),
        email=payload.get("email"),
        name=payload.get("name"),
        picture=payload.get("picture"),
    )


def is_production_environment() -> bool:
    """Check whether the server is running in a production environment."""
    env = os.getenv("ENVIRONMENT", "").strip().lower()
    return env in {"production", "prod"}


def set_session_cookie(
    response: Response,
    token: str,
    max_age: int = DEFAULT_SESSION_LIFETIME_SECONDS,
    secure: Optional[bool] = None,
) -> None:
    """Set the HttpOnly TraceKit session cookie on an HTTP response.
    
    Security attributes enforced:
    - HttpOnly=True (inaccessible to JavaScript)
    - SameSite=Lax (safe navigation, CSRF protection)
    - Path=/
    - Max-Age=604800 (7 days)
    - Secure=True in production, False in local development
    """
    is_secure = secure if secure is not None else is_production_environment()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=max_age,
        expires=max_age,
        path="/",
        domain=None,
        secure=is_secure,
        httponly=True,
        samesite="lax",
    )


def clear_session_cookie(
    response: Response,
    secure: Optional[bool] = None,
) -> None:
    """Clear the HttpOnly TraceKit session cookie from an HTTP response."""
    is_secure = secure if secure is not None else is_production_environment()
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        domain=None,
        secure=is_secure,
        httponly=True,
        samesite="lax",
    )
