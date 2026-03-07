"""SQLAlchemy ORM models. Infrastructure layer."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.connection import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    documents: Mapped[List["Document"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_uri: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="uploaded")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="documents")
    pages: Mapped[List["Page"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    image_uri: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    page_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    text_content: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    """Structured extraction: list of { type: paragraph|table|note|dimensions|figure, content: string|string[][] }. Preserves layout for UI and AI."""
    structured_content: Mapped[list] = mapped_column(JSONB, default=list)
    """Raw PP-StructureV3 predict() output for JSON tab. Null when not using structure mode."""
    raw_structure: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    """Extraction engine used: pp_structure_v3, paddle_basic, tesseract, pdf_text."""
    extraction_source: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    tags: Mapped[List[str]] = mapped_column(JSONB, default=list)
    page_scale: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    document: Mapped[Document] = relationship(back_populates="pages")
    overlays: Mapped[List["Overlay"]] = relationship(back_populates="page", cascade="all, delete-orphan")


class Overlay(Base):
    __tablename__ = "overlays"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="manual")

    locked: Mapped[bool] = mapped_column(Boolean, default=False)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)

    confidence: Mapped[dict] = mapped_column(JSONB, default=lambda: {"score": 1.0})
    evidence: Mapped[list] = mapped_column(JSONB, default=list)
    tags: Mapped[List[str]] = mapped_column(JSONB, default=list)
    page_scale: Mapped[dict] = mapped_column(JSONB, default=dict)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    page: Mapped[Page] = relationship(back_populates="overlays")
    room: Mapped[Optional["Room"]] = relationship(back_populates="overlay", uselist=False, cascade="all, delete-orphan")
    opening: Mapped[Optional["Opening"]] = relationship(back_populates="overlay", uselist=False, cascade="all, delete-orphan")
    symbol: Mapped[Optional["Symbol"]] = relationship(back_populates="overlay", uselist=False, cascade="all, delete-orphan")
    measurement: Mapped[Optional["Measurement"]] = relationship(back_populates="overlay", uselist=False, cascade="all, delete-orphan")
    note: Mapped[Optional["Note"]] = relationship(back_populates="overlay", uselist=False, cascade="all, delete-orphan")
    revisions: Mapped[List["OverlayRevision"]] = relationship(back_populates="overlay", cascade="all, delete-orphan")


class OverlayRevision(Base):
    __tablename__ = "overlay_revisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    overlay_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("overlays.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    overlay: Mapped[Overlay] = relationship(back_populates="revisions")


class Room(Base):
    __tablename__ = "rooms"

    overlay_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("overlays.id", ondelete="CASCADE"), primary_key=True)
    geometry: Mapped[dict] = mapped_column(JSONB, default=dict)
    meta_dict: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    overlay: Mapped[Overlay] = relationship(back_populates="room")


class Opening(Base):
    __tablename__ = "openings"

    overlay_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("overlays.id", ondelete="CASCADE"), primary_key=True)
    geometry: Mapped[dict] = mapped_column(JSONB, default=dict)
    meta_dict: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    overlay: Mapped[Overlay] = relationship(back_populates="opening")


class Symbol(Base):
    __tablename__ = "symbols"

    overlay_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("overlays.id", ondelete="CASCADE"), primary_key=True)
    geometry: Mapped[dict] = mapped_column(JSONB, default=dict)
    meta_dict: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    overlay: Mapped[Overlay] = relationship(back_populates="symbol")


class Measurement(Base):
    __tablename__ = "measurements"

    overlay_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("overlays.id", ondelete="CASCADE"), primary_key=True)
    geometry: Mapped[dict] = mapped_column(JSONB, default=dict)
    meta_dict: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    overlay: Mapped[Overlay] = relationship(back_populates="measurement")


class Note(Base):
    __tablename__ = "notes"

    overlay_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("overlays.id", ondelete="CASCADE"), primary_key=True)
    geometry: Mapped[dict] = mapped_column(JSONB, default=dict)
    meta_dict: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    overlay: Mapped[Overlay] = relationship(back_populates="note")


class QuantitySnapshot(Base):
    __tablename__ = "quantity_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    format: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    download_uri: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
