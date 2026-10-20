"""宝石领域逻辑：部位绑定、六槽镶嵌、五合一与调试注入。"""
from __future__ import annotations

import secrets

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import config, models
from .errors import ApiError


def rows(db: Session, account_id: int) -> list[models.Gem]:
    statement = select(models.Gem).where(models.Gem.account_id == account_id).order_by(models.Gem.id)
    return list(db.execute(statement).scalars().all())


def _quality(value: int) -> int:
    return max(0, min(config.GEM_MAX_QUALITY, int(value)))


def _affix(affix_id: str) -> dict:
    return config.GEM_AFFIXES.get(affix_id) or config.GEM_AFFIXES["attack"]


def affix_value(affix_id: str, quality: int) -> int | float:
    info = _affix(affix_id)
    return info["values"][_quality(quality)]


def affix_payload(affix_id: str, quality: int) -> dict:
    info = _affix(affix_id)
    value = affix_value(affix_id, _quality(quality))
    if info.get("percent"):
        text = "{} +{}%".format(info["name"], "{:g}".format(round(value * 100, 4)))
    else:
        text = "{} +{}".format(info["name"], value)
    return {
        "id": affix_id if affix_id in config.GEM_AFFIXES else "attack",
        "kind": info["kind"],
        "element": info.get("element"),
        "name": info["name"],
        "value": value,
        "percent": bool(info.get("percent")),
        "text": text,
    }


def gem_payload(row: models.Gem) -> dict:
    return {
        "id": row.id,
        "partId": row.part_id,
        "quality": _quality(row.quality),
        "slotIndex": row.slot_index,
        "affix": affix_payload(row.affix_id, row.quality),
    }


def payload(items) -> list[dict]:
    return [gem_payload(row) for row in items]


def random_affix(rng=None) -> str:
    return (rng or secrets.SystemRandom()).choice(config.GEM_AFFIX_IDS)


def create(db: Session, account_id: int, part_id: str, quality: int, affix_id: str | None = None, rng=None) -> models.Gem:
    row = models.Gem(account_id=account_id, part_id=part_id, quality=_quality(quality), affix_id=affix_id or random_affix(rng), slot_index=None)
    db.add(row)
    return row


def first_free_slot(items, part_id: str) -> int | None:
    used = {row.slot_index for row in items if row.part_id == part_id and row.slot_index is not None}
    for index in range(config.GEM_SOCKETS):
        if index not in used:
            return index
    return None


def _owned(db: Session, account_id: int, gem_id: int) -> models.Gem:
    row = db.get(models.Gem, int(gem_id))
    if row is None or row.account_id != account_id:
        raise ApiError(422, "gem_not_found", "宝石不存在")
    return row


def socket(db: Session, account_id: int, gem_id: int) -> dict:
    row = _owned(db, account_id, gem_id)
    if row.slot_index is not None:
        return {"gems": payload(rows(db, account_id)), "gemId": row.id, "slotIndex": row.slot_index}
    items = rows(db, account_id)
    slot = first_free_slot(items, row.part_id)
    if slot is None:
        raise ApiError(422, "gem_slots_full", "该部位宝石槽位已满")
    row.slot_index = slot
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "gem_slot_conflict", "宝石槽位冲突，请重试")
    return {"gems": payload(rows(db, account_id)), "gemId": row.id, "slotIndex": slot}


def unsocket(db: Session, account_id: int, gem_id: int) -> dict:
    row = _owned(db, account_id, gem_id)
    row.slot_index = None
    db.commit()
    return {"gems": payload(rows(db, account_id)), "gemId": row.id}


def synthesize(db: Session, account_id: int, part_id: str, quality: int) -> dict:
    if part_id not in config.EQUIPMENT_SLOTS:
        raise ApiError(422, "unknown_gem_part", "未知装备部位")
    quality = int(quality)
    if quality < 0 or quality > config.GEM_MAX_QUALITY:
        raise ApiError(422, "invalid_gem_quality", "宝石品质不合法")
    if quality >= config.GEM_MAX_QUALITY:
        raise ApiError(422, "gem_max_quality", "红色宝石已是最高品质")
    candidates = [
        row for row in rows(db, account_id)
        if row.part_id == part_id and row.quality == quality and row.slot_index is None
    ][:config.GEM_SYNTHESIS_COST]
    if len(candidates) < config.GEM_SYNTHESIS_COST:
        raise ApiError(422, "not_enough_gems", "同部位同品质的未镶嵌宝石不足 5 颗")
    consumed = [row.id for row in candidates]
    for row in candidates:
        db.delete(row)
    created = create(db, account_id, part_id, quality + 1)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "gem_slot_conflict", "宝石合成冲突，请重试")
    return {"gems": payload(rows(db, account_id)), "gem": gem_payload(created), "consumedIds": consumed}


def grant(db: Session, account_id: int, part_id: str, quality: int, count: int) -> dict:
    if part_id not in config.EQUIPMENT_SLOTS:
        raise ApiError(422, "unknown_gem_part", "未知装备部位")
    quality = int(quality)
    if quality < 0 or quality > config.GEM_MAX_QUALITY:
        raise ApiError(422, "invalid_gem_quality", "宝石品质不合法")
    count = int(count)
    if count < 1 or count > config.GEM_MAX_GRANT:
        raise ApiError(422, "invalid_gem_count", "单次注入数量需要为 1 到 100")
    created = []
    for _ in range(count):
        created.append(create(db, account_id, part_id, quality))
    db.commit()
    return {"gems": payload(rows(db, account_id)), "granted": payload(created)}
