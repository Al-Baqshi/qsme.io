"""Database connection and session. Infrastructure layer."""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

_DEFAULT_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/qsme"


def _normalize_database_url(url: str) -> str:
    """Accept postgres:// or postgresql:// and use postgresql+psycopg for SQLAlchemy."""
    if not url or not url.strip():
        return _DEFAULT_URL
    url = url.strip()
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


_raw_url = os.getenv("DATABASE_URL", _DEFAULT_URL)
DATABASE_URL = _normalize_database_url(_raw_url)


class Base(DeclarativeBase):
    pass


engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
