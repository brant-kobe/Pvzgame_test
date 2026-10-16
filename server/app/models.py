"""数据表模型：账户、登录会话、关卡进度与资源。"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import times
from .database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(32, collation="NOCASE"), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=times.now)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class LoginSession(Base):
    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=times.now)
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    account: Mapped[Account] = relationship()


class LevelProgress(Base):
    __tablename__ = "level_progress"

    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True)
    level_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    best_time: Mapped[float | None] = mapped_column(Float, default=None)
    best_kills: Mapped[int | None] = mapped_column(Integer, default=None)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    wins: Mapped[int] = mapped_column(Integer, default=0)


class Resource(Base):
    __tablename__ = "resources"

    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True)
    resource_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    amount: Mapped[int] = mapped_column(Integer, default=0)


class SchemaVersion(Base):
    __tablename__ = "schema_version"

    version: Mapped[int] = mapped_column(Integer, primary_key=True)
