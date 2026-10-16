"""时间工具：全库统一使用本地时间的朴素 datetime。"""
from __future__ import annotations

from datetime import datetime


def now() -> datetime:
    return datetime.now()


def iso(value: datetime | None) -> str | None:
    return value.isoformat(timespec="seconds") if value else None
