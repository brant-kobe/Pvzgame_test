"""连接探测。"""
from __future__ import annotations

from fastapi import APIRouter

from .. import config, database

router = APIRouter()


@router.get("/health")
def health() -> dict:
    with database.engine().connect() as connection:
        connection.exec_driver_sql("SELECT 1")
    return {"ok": True, "service": "blockline-account", "schemaVersion": config.SCHEMA_VERSION}
