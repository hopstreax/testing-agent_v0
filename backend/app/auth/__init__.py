"""Authentication package for TraceKit."""

from app.auth.session import (
    COOKIE_NAME,
    DEFAULT_SESSION_LIFETIME_SECONDS,
    User,
    clear_session_cookie,
    create_session_token,
    decode_session_token,
    set_session_cookie,
)
from app.auth.dependencies import (
    get_current_user,
    get_optional_current_user,
)
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

__all__ = [
    "COOKIE_NAME",
    "DEFAULT_SESSION_LIFETIME_SECONDS",
    "OAUTH_STATE_COOKIE_NAME",
    "User",
    "build_google_authorization_url",
    "clear_oauth_state_cookie",
    "clear_session_cookie",
    "create_session_token",
    "decode_session_token",
    "exchange_google_code_for_tokens",
    "generate_oauth_state",
    "get_current_user",
    "get_google_oauth_config",
    "get_optional_current_user",
    "set_oauth_state_cookie",
    "set_session_cookie",
    "validate_oauth_state",
    "verify_google_id_token",
]
