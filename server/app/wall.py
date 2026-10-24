"""城墙领域逻辑：钢材升级、血量成长与稀土突破节点。"""
from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import config, models


def max_breakthroughs() -> int:
    return (config.WALL_MAX_LEVEL - 1) // config.WALL_BREAKTHROUGH_STEP


def _level(level: int) -> int:
    return max(1, min(config.WALL_MAX_LEVEL, int(level)))


def _breakthroughs(value: int) -> int:
    return max(0, min(max_breakthroughs(), int(value)))


def ensure_state(db: Session, account_id: int) -> models.WallState:
    row = db.get(models.WallState, account_id)
    if row is None:
        row = models.WallState(account_id=account_id, level=1, breakthroughs=0)
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            row = db.get(models.WallState, account_id)
    return row


def hp_bonus(level: int) -> int:
    return (max(1, _level(level)) - 1) * config.WALL_HP_PER_LEVEL


def steel_cost(level: int) -> int | None:
    current = _level(level)
    if current >= config.WALL_MAX_LEVEL:
        return None
    return config.WALL_STEEL_PER_LEVEL * current


def next_breakthrough_level(breakthroughs: int) -> int | None:
    completed = _breakthroughs(breakthroughs)
    if completed >= max_breakthroughs():
        return None
    return (completed + 1) * config.WALL_BREAKTHROUGH_STEP


def rare_earth_cost(breakthroughs: int) -> int | None:
    completed = _breakthroughs(breakthroughs)
    if completed >= max_breakthroughs():
        return None
    return config.WALL_BREAKTHROUGH_BASE_COST + config.WALL_BREAKTHROUGH_STEP_COST * completed


def breakthrough_required(row: models.WallState) -> bool:
    level = _level(row.level)
    if level >= config.WALL_MAX_LEVEL:
        return False
    checkpoint = next_breakthrough_level(row.breakthroughs)
    return checkpoint is not None and level >= checkpoint


def payload(row: models.WallState) -> dict:
    level = _level(row.level)
    completed = _breakthroughs(row.breakthroughs)
    checkpoint = next_breakthrough_level(completed)
    return {
        "level": level,
        "maxLevel": config.WALL_MAX_LEVEL,
        "hpBonus": hp_bonus(level),
        "hpPerLevel": config.WALL_HP_PER_LEVEL,
        "nextSteelCost": steel_cost(level),
        "breakthrough": {
            "required": breakthrough_required(row),
            "atLevel": checkpoint,
            "cost": rare_earth_cost(completed),
            "completed": completed,
            "max": max_breakthroughs(),
        },
        "maxed": level >= config.WALL_MAX_LEVEL,
    }
