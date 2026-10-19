"""装备领域逻辑：六部位默认数据、随机元素、成长与升级消耗。"""
from __future__ import annotations

import secrets

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import config, models


def _rows_by_slot(db: Session, account_id: int) -> dict[str, models.Equipment]:
    statement = select(models.Equipment).where(models.Equipment.account_id == account_id)
    return {row.slot_id: row for row in db.execute(statement).scalars().all()}


def ensure_rows(db: Session, account_id: int) -> list[models.Equipment]:
    rows = _rows_by_slot(db, account_id)
    missing = [slot_id for slot_id in config.EQUIPMENT_SLOTS if slot_id not in rows]
    if missing:
        elements = secrets.SystemRandom().sample(list(config.EQUIPMENT_ELEMENTS), len(missing))
        for slot_id, element_id in zip(missing, elements):
            row = models.Equipment(account_id=account_id, slot_id=slot_id, element_id=element_id, level=1)
            db.add(row)
            rows[slot_id] = row
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            rows = _rows_by_slot(db, account_id)
    return [rows[slot_id] for slot_id in config.EQUIPMENT_SLOTS if slot_id in rows]


def _level(level: int) -> int:
    return max(1, min(config.EQUIPMENT_MAX_LEVEL, int(level)))


def attack_bonus(level: int) -> int:
    return config.EQUIPMENT_ATTACK_BASE + config.EQUIPMENT_ATTACK_PER_LEVEL * (_level(level) - 1)


def element_bonus(level: int) -> int:
    return config.EQUIPMENT_ELEMENT_BASE + config.EQUIPMENT_ELEMENT_PER_LEVEL * (_level(level) - 1)


def cost_for(level: int, slot_id: str) -> dict[str, int] | None:
    current = _level(level)
    if current >= config.EQUIPMENT_MAX_LEVEL:
        return None
    blueprint_id = config.EQUIPMENT_BLUEPRINTS[slot_id]
    coin = config.EQUIPMENT_COIN_BASE + config.EQUIPMENT_COIN_PER_LEVEL * (current - 1)
    blueprint = config.EQUIPMENT_BLUEPRINT_BASE + config.EQUIPMENT_BLUEPRINT_PER_LEVEL * (current - 1)
    return {"coin": coin, blueprint_id: blueprint}


def slot_payload(row: models.Equipment) -> dict:
    level = _level(row.level)
    blueprint_id = config.EQUIPMENT_BLUEPRINTS[row.slot_id]
    return {
        "slotId": row.slot_id,
        "element": row.element_id,
        "level": level,
        "maxLevel": config.EQUIPMENT_MAX_LEVEL,
        "attackBonus": attack_bonus(level),
        "elementBonus": element_bonus(level),
        "blueprintId": blueprint_id,
        "nextCost": cost_for(level, row.slot_id),
    }


def payload(rows) -> dict:
    return {row.slot_id: slot_payload(row) for row in rows if row.slot_id in config.EQUIPMENT_BLUEPRINTS}
