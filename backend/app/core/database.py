import socket

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


def _engine_options() -> dict:
    try:
        url = make_url(settings.DATABASE_URL)
    except Exception:
        return {}

    if url.drivername == "postgresql+asyncpg" and "pooler.supabase.com" in (url.host or ""):
        return {
            "connect_args": {
                "statement_cache_size": 0,
            },
        }

    return {}


engine = create_async_engine(settings.DATABASE_URL, echo=False, **_engine_options())
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def explain_database_error(error: Exception) -> str:
    message = str(error)
    if isinstance(error, socket.gaierror) or "getaddrinfo failed" in message:
        return (
            "Database host could not be resolved. Check DATABASE_URL in backend/.env. "
            "If you are using Supabase, use the IPv4-compatible Session Pooler "
            "connection string from Project Settings > Database instead of the direct "
            "db.<project-ref>.supabase.co URL."
        )
    return message
