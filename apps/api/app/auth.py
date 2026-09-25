import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import config

# scheme_name="bearerAuth" so the generated OpenAPI document names the scheme the contract expects.
_bearer = HTTPBearer(scheme_name="bearerAuth", auto_error=False)

# Cached, refetched automatically on an unknown kid (key rotation): PyJWKClient's default behaviour.
_jwks_client = jwt.PyJWKClient(f"{config.SUPABASE_URL}/auth/v1/.well-known/jwks.json", cache_keys=True)
_issuer = f"{config.SUPABASE_URL}/auth/v1"


def _locked() -> HTTPException:
    return HTTPException(status_code=401, detail={"error": "locked"})


def _not_allowed() -> HTTPException:
    return HTTPException(status_code=403, detail={"error": "not allowed"})


async def current_mind(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    """The signed-in mind's id, verified against the project's published signing keys. A missing,
    expired, wrong-issuer or unknown-key token all get the same 401: the client's only correct
    move in every case is to refresh the session."""
    if credentials is None:
        raise _locked()
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(
            credentials.credentials, signing_key.key, algorithms=["ES256"], audience="authenticated", issuer=_issuer
        )
    except jwt.PyJWTError as exc:
        raise _locked() from exc
    sub = claims.get("sub")
    if not isinstance(sub, str):
        raise _locked()
    if config.ALLOWLIST:
        email = claims.get("email")
        if not isinstance(email, str) or email.lower() not in config.ALLOWLIST:
            raise _not_allowed()
    return sub
