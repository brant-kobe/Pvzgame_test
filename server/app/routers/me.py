"""当前账户：信息、关卡进度与资源。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .. import config, equipment, models, security, times
from ..database import get_db
from ..errors import ApiError
from ..schemas import EquipmentUpgrade, PasswordConfirm, ProgressReport, ResourceChange
from ..serializers import account_payload, equipment_payload, level_payload, progress_payload, resource_payload

router = APIRouter()


def _progress_rows(db: Session, account_id: int):
    statement = select(models.LevelProgress).where(models.LevelProgress.account_id == account_id)
    return db.execute(statement).scalars().all()


def _resource_rows(db: Session, account_id: int):
    statement = select(models.Resource).where(models.Resource.account_id == account_id)
    return db.execute(statement).scalars().all()


@router.get("")
def me(account: models.Account = Depends(security.current_account), db: Session = Depends(get_db)) -> dict:
    equipment_rows = equipment.ensure_rows(db, account.id)
    return {
        "account": account_payload(account),
        "progress": progress_payload(_progress_rows(db, account.id)),
        "resources": resource_payload(_resource_rows(db, account.id)),
        "equipment": equipment_payload(equipment_rows),
    }


@router.post("/progress")
def report_progress(
    payload: ProgressReport,
    account: models.Account = Depends(security.current_account),
    db: Session = Depends(get_db),
) -> dict:
    if payload.levelId < 1 or payload.levelId > config.MAX_LEVEL_ID:
        raise ApiError(422, "invalid_level", "关卡编号不合法")
    row = db.get(models.LevelProgress, (account.id, payload.levelId))
    if row is None:
        row = models.LevelProgress(account_id=account.id, level_id=payload.levelId, attempts=0, wins=0)
        db.add(row)
    row.attempts += 1
    if payload.win:
        row.wins += 1
        if row.completed_at is None:
            row.completed_at = times.now()
        if payload.time is not None and (row.best_time is None or payload.time < row.best_time):
            row.best_time = round(float(payload.time), 3)
        if payload.kills is not None and (row.best_kills is None or payload.kills > row.best_kills):
            row.best_kills = int(payload.kills)
    db.commit()
    return {"level": level_payload(row)}


@router.get("/resources")
def get_resources(account: models.Account = Depends(security.current_account), db: Session = Depends(get_db)) -> dict:
    return {"resources": resource_payload(_resource_rows(db, account.id))}


@router.post("/resources")
def change_resources(
    payload: ResourceChange,
    account: models.Account = Depends(security.current_account),
    db: Session = Depends(get_db),
) -> dict:
    if payload.resourceId not in config.RESOURCE_IDS:
        raise ApiError(422, "unknown_resource", "未知资源类型")
    row = db.get(models.Resource, (account.id, payload.resourceId))
    if row is None:
        row = models.Resource(account_id=account.id, resource_id=payload.resourceId, amount=0)
        db.add(row)
    row.amount = max(0, row.amount + int(payload.delta))
    db.commit()
    return {"resources": resource_payload([row])}


@router.post("/equipment/upgrade")
def upgrade_equipment(
    payload: EquipmentUpgrade,
    account: models.Account = Depends(security.current_account),
    db: Session = Depends(get_db),
) -> dict:
    slot_id = (payload.slotId or "").strip()
    if slot_id not in config.EQUIPMENT_SLOTS:
        raise ApiError(422, "unknown_equipment_slot", "未知装备部位")
    equipment_rows = equipment.ensure_rows(db, account.id)
    row = next((item for item in equipment_rows if item.slot_id == slot_id), None)
    if row is None:
        raise ApiError(422, "unknown_equipment_slot", "未知装备部位")
    if row.level >= config.EQUIPMENT_MAX_LEVEL:
        raise ApiError(422, "max_equipment_level", "装备已满级")
    cost = equipment.cost_for(row.level, slot_id)
    if cost is None:
        raise ApiError(422, "max_equipment_level", "装备已满级")
    owned = {item.resource_id: item.amount for item in _resource_rows(db, account.id)}
    for resource_id, amount in cost.items():
        if owned.get(resource_id, 0) < amount:
            raise ApiError(422, "not_enough_resources", "金币或专属图纸不足")
    for resource_id, amount in cost.items():
        resource = db.get(models.Resource, (account.id, resource_id))
        if resource is not None:
            resource.amount -= amount
    row.level += 1
    db.commit()
    return {
        "equipment": equipment_payload(equipment_rows),
        "resources": resource_payload(_resource_rows(db, account.id)),
        "slotId": row.slot_id,
        "level": row.level,
    }


@router.delete("", status_code=204)
def delete_account(
    payload: PasswordConfirm,
    request: Request,
    response: Response,
    account: models.Account = Depends(security.current_account),
    db: Session = Depends(get_db),
) -> None:
    if not security.verify_password(payload.password, account.password_hash):
        raise ApiError(403, "bad_password", "密码不正确")
    db.execute(delete(models.LoginSession).where(models.LoginSession.account_id == account.id))
    db.delete(account)
    db.commit()
    response.delete_cookie(config.SESSION_COOKIE, path="/")
