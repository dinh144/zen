import os
import uuid
from collections.abc import AsyncIterator

# Must be set before `app.*` is imported anywhere (app.config reads them at import time).
os.environ.setdefault("SUPABASE_URL", "http://127.0.0.1:55000")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:55001/postgres")

import asyncpg
import httpx
import pytest_asyncio

from app.main import app

# Supabase CLI's fixed local-dev demo service-role key — the same on every `supabase start`,
# never a real secret. Overridable for a stack whose demo keys were customised.
SERVICE_ROLE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0"
    ".EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
)


@pytest_asyncio.fixture
async def client() -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def db() -> AsyncIterator[asyncpg.Connection]:
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        yield conn
    finally:
        await conn.close()


class Mind:
    def __init__(self, user_id: str, token: str):
        self.id = user_id
        self.token = token
        self.headers = {"Authorization": f"Bearer {token}"}


async def _new_mind() -> Mind:
    email = f"api-2-test-{uuid.uuid4()}@test.local"
    password = "test-pass-123!"
    async with httpx.AsyncClient(base_url=os.environ["SUPABASE_URL"]) as gotrue:
        created = await gotrue.post(
            "/auth/v1/admin/users",
            headers={"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {SERVICE_ROLE_KEY}"},
            json={"email": email, "password": password, "email_confirm": True},
        )
        created.raise_for_status()
        user_id = created.json()["id"]
        signed_in = await gotrue.post(
            "/auth/v1/token?grant_type=password",
            headers={"apikey": SERVICE_ROLE_KEY},
            json={"email": email, "password": password},
        )
        signed_in.raise_for_status()
        token = signed_in.json()["access_token"]
    return Mind(user_id, token)


async def _delete_mind(mind: Mind) -> None:
    async with httpx.AsyncClient(base_url=os.environ["SUPABASE_URL"]) as gotrue:
        await gotrue.delete(
            f"/auth/v1/admin/users/{mind.id}",
            headers={"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {SERVICE_ROLE_KEY}"},
        )
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        await conn.execute("DELETE FROM cards WHERE user_id = $1", uuid.UUID(mind.id))
    finally:
        await conn.close()


@pytest_asyncio.fixture
async def mind_a() -> AsyncIterator[Mind]:
    m = await _new_mind()
    try:
        yield m
    finally:
        await _delete_mind(m)


@pytest_asyncio.fixture
async def mind_b() -> AsyncIterator[Mind]:
    m = await _new_mind()
    try:
        yield m
    finally:
        await _delete_mind(m)
