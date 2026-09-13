"""FastAPI dependencies for user authentication and session verification."""

from typing import Optional

from fastapi import HTTPException, Request, status

from app.auth.session import (
    COOKIE_NAME,
    User,
    decode_session_token,
)


def get_optional_current_user(request: Request) -> Optional[User]:
    """Retrieve and verify authenticated user from tracekit_session cookie if present.
    
    Returns None if no session cookie exists or if the token is invalid/expired.
    Does not accept user identity from query parameters, request bodies, or headers.
    """
    token = request.cookies.get(COOKIE_NAME)
    if not token or not token.strip():
        return None

    try:
        return decode_session_token(token)
    except Exception:
        # Return None cleanly without leaking token errors for optional user context
        return None


def get_current_user(request: Request) -> User:
    """Enforce and retrieve the authenticated user from the tracekit_session cookie.
    
    Raises HTTP 401 Unauthorized if the cookie is missing, expired, or invalid.
    Strictly ignores any client-supplied headers, query parameters, or body values.
    """
    token = request.cookies.get(COOKIE_NAME)
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return decode_session_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        # Catch unexpected configuration errors (e.g. missing secret) without leaking details
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )
