"""SQLite 连接、会话工厂与声明式基类。"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

_engine = None
_session_factory = None


class Base(DeclarativeBase):
    pass


def init_engine(db_path: Path | str):
    global _engine, _session_factory
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    _engine = create_engine("sqlite:///" + path.as_posix(), future=True, connect_args={"check_same_thread": False})

    @event.listens_for(_engine, "connect")
    def _configure_connection(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

    _session_factory = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False, class_=Session)
    return _engine


def engine():
    if _engine is None:
        raise RuntimeError("数据库引擎尚未初始化")
    return _engine


def create_all() -> None:
    Base.metadata.create_all(engine())
    _migrate_gem_lock()


def _migrate_gem_lock() -> None:
    columns = {column["name"] for column in inspect(engine()).get_columns("gems")}
    if "locked" in columns:
        return
    with engine().begin() as connection:
        connection.execute(text("ALTER TABLE gems ADD COLUMN locked BOOLEAN NOT NULL DEFAULT 0"))


def session_scope() -> Session:
    if _session_factory is None:
        raise RuntimeError("数据库会话工厂尚未初始化")
    return _session_factory()


def get_db():
    db = session_scope()
    try:
        yield db
    finally:
        db.close()
