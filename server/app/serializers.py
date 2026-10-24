"""响应体序列化。"""
from __future__ import annotations

from . import equipment, gems, models, times, wall


def account_payload(account: models.Account) -> dict:
    return {
        "id": account.id,
        "username": account.username,
        "createdAt": times.iso(account.created_at),
        "lastLoginAt": times.iso(account.last_login_at),
    }


def level_payload(row: models.LevelProgress) -> dict:
    return {
        "levelId": row.level_id,
        "completed": row.completed_at is not None,
        "completedAt": times.iso(row.completed_at),
        "bestTime": row.best_time,
        "bestKills": row.best_kills,
        "attempts": row.attempts,
        "wins": row.wins,
    }


def progress_payload(rows) -> dict:
    return {str(row.level_id): level_payload(row) for row in rows}


def resource_payload(rows) -> dict:
    return {row.resource_id: row.amount for row in rows}


def equipment_payload(rows) -> dict:
    return equipment.payload(rows)


def wall_payload(row) -> dict:
    return wall.payload(row)


def gems_payload(rows) -> list[dict]:
    return gems.payload(rows)
