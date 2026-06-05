from pydantic_settings import BaseSettings
from sqlalchemy.engine import make_url

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1,
        )

    try:
        url = make_url(database_url)
    except Exception:
        return database_url

    if url.drivername != "postgresql+asyncpg":
        return database_url

    unsupported_asyncpg_params = {"pgbouncer"}
    url = url.difference_update_query(unsupported_asyncpg_params)

    if "pooler.supabase.com" in (url.host or "") and "prepared_statement_cache_size" not in url.query:
        url = url.update_query_dict({"prepared_statement_cache_size": "0"})

    return url.render_as_string(hide_password=False)


settings = Settings()
settings.DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)
