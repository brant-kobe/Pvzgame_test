"""请求体模型。"""
from __future__ import annotations

from pydantic import BaseModel


class Credentials(BaseModel):
    username: str = ""
    password: str = ""


class PasswordConfirm(BaseModel):
    password: str = ""


class ProgressReport(BaseModel):
    levelId: int
    time: float | None = None
    kills: int | None = None
    win: bool = False


class ResourceChange(BaseModel):
    resourceId: str
    delta: int = 0


class EquipmentUpgrade(BaseModel):
    slotId: str = ""
