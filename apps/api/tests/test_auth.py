import time
import types

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat, PublicFormat

from app import auth, config


@pytest.fixture
def keypair():
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())
    public_pem = private_key.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    return private_pem, public_pem


@pytest.fixture
def stub_signing_key(monkeypatch, keypair):
    """Stands in for `PyJWKClient.get_signing_key_from_jwt`, so token *content* (exp, iss, kid) can
    be tested without a real, network-fetched Supabase project."""
    _, public_pem = keypair

    def fake(_token: str):
        return types.SimpleNamespace(key=public_pem)

    monkeypatch.setattr(auth._jwks_client, "get_signing_key_from_jwt", fake)


def _token(private_pem: bytes, **claims) -> str:
    payload = {
        "sub": "11111111-1111-1111-1111-111111111111",
        "aud": "authenticated",
        "iss": f"{config.SUPABASE_URL}/auth/v1",
        "exp": int(time.time()) + 3600,
        **claims,
    }
    return jwt.encode(payload, private_pem, algorithm="ES256", headers={"kid": "test-kid"})


async def test_expired_token_is_401(client: httpx.AsyncClient, keypair, stub_signing_key):
    private_pem, _ = keypair
    token = _token(private_pem, exp=int(time.time()) - 10)
    r = await client.get("/api/cards", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert r.json() == {"error": "locked"}


async def test_wrong_issuer_token_is_401(client: httpx.AsyncClient, keypair, stub_signing_key):
    private_pem, _ = keypair
    token = _token(private_pem, iss="https://not-this-project.supabase.co/auth/v1")
    r = await client.get("/api/cards", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


async def test_unknown_signing_key_is_401(client: httpx.AsyncClient, keypair, monkeypatch):
    private_pem, _ = keypair

    def raise_unknown_kid(_token: str):
        raise jwt.exceptions.PyJWKClientError("Unable to find a signing key that matches")

    monkeypatch.setattr(auth._jwks_client, "get_signing_key_from_jwt", raise_unknown_kid)
    token = _token(private_pem)
    r = await client.get("/api/cards", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


async def test_staging_allowlist_refuses_unlisted_email(
    client: httpx.AsyncClient, keypair, stub_signing_key, monkeypatch
):
    monkeypatch.setattr(config, "ALLOWLIST", {"allowed@test.local"})
    private_pem, _ = keypair
    token = _token(private_pem, email="someone-else@test.local")
    r = await client.get("/api/cards", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
    assert r.json() == {"error": "not allowed"}


async def test_staging_allowlist_accepts_listed_email(
    client: httpx.AsyncClient, keypair, stub_signing_key, monkeypatch
):
    monkeypatch.setattr(config, "ALLOWLIST", {"allowed@test.local"})
    private_pem, _ = keypair
    token = _token(private_pem, email="allowed@test.local")
    r = await client.get("/api/cards", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


async def test_empty_allowlist_accepts_any_email(client: httpx.AsyncClient, keypair, stub_signing_key):
    """The default (production and local dev): no ZEN_ALLOWLIST means every verified mind passes."""
    private_pem, _ = keypair
    token = _token(private_pem, email="anyone@test.local")
    r = await client.get("/api/cards", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
