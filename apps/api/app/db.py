from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from . import config


def _asyncpg_url(url: str) -> str:
    return url.replace("postgres://", "postgresql+asyncpg://", 1).replace("postgresql://", "postgresql+asyncpg://", 1)


# Supabase's transaction pooler needs the prepared-statement cache disabled (harmless direct too).
engine = create_async_engine(_asyncpg_url(config.DATABASE_URL), connect_args={"statement_cache_size": 0})
_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        yield session
