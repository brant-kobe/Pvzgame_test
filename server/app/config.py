"""后端静态配置：路径、账号规则、会话参数与静态挂载清单。"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BASE_DIR / "data" / "blockline.db"

HOST = "127.0.0.1"
PORT = 8787

SESSION_COOKIE = "blockline_session"
SESSION_DAYS = 30
SESSION_RENEW_DAYS = 15

USERNAME_MIN = 2
USERNAME_MAX = 16
USERNAME_PATTERN = r"^[\u4e00-\u9fa5A-Za-z0-9_]+$"
PASSWORD_MIN = 6
PASSWORD_MAX = 64

PBKDF2_ALGORITHM = "sha256"
PBKDF2_ITERATIONS = 200000
PBKDF2_PREFIX = "pbkdf2_sha256"

SCHEMA_VERSION = 1

RESOURCE_IDS = ("coin", "gem", "tech")
MAX_LEVEL_ID = 64

STATIC_DIRS = ("src", "styles", "assets", "pictures")
LOCAL_ORIGIN_HOSTS = ("127.0.0.1", "localhost", "[::1]")


def resolve_db_path(value: str | os.PathLike[str] | None = None) -> Path:
    raw = value or os.environ.get("BLOCKLINE_DB") or DEFAULT_DB_PATH
    return Path(raw).expanduser().resolve()


def allowed_origin(origin: str | None) -> bool:
    if not origin:
        return True
    for scheme in ("http://", "https://"):
        if not origin.startswith(scheme):
            continue
        host = origin[len(scheme):].split("/")[0]
        name = host.rsplit(":", 1)[0]
        if name in LOCAL_ORIGIN_HOSTS:
            return True
    return False
