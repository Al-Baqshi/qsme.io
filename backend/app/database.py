"""Database connection. Re-exports from infrastructure for backward compatibility."""

from __future__ import annotations

from app.infrastructure.database.connection import (
    Base,
    DATABASE_URL,
    engine,
    get_db,
    SessionLocal,
)

__all__ = ["Base", "DATABASE_URL", "engine", "get_db", "SessionLocal"]
