"""密码哈希、会话签发与当前账户依赖。"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import timedelta

from fastapi import Depends, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import config, models, times
from .database import get_db
from .errors import ApiError


def validate_username(username: str) -> str:
    value = (username or "").strip()
    if len(value) < config.USERNAME_MIN or len(value) > config.USERNAME_MAX:
        raise ApiError(422, "invalid_username", "用户名需要 2 到 16 个字符")
    if not re.match(config.USERNAME_PATTERN, value):
        raise ApiError(422, "invalid_username", "用户名只能使用中文、字母、数字与下划线")
    return value


def validate_password(password: str) -> str:
    value = password or ""
    if len(value) < config.PASSWORD_MIN or len(value) > config.PASSWORD_MAX:
        raise ApiError(422, "invalid_password", "密码需要 6 到 64 个字符")
    return value


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(config.PBKDF2_ALGORITHM, password.encode("utf-8"), salt, config.PBKDF2_ITERATIONS)
    return "{}${}${}${}".format(config.PBKDF2_PREFIX, config.PBKDF2_ITERATIONS, salt.hex(), digest.hex())


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = (stored or "").split("$")
        if algorithm != config.PBKDF2_PREFIX:
            return False
        digest = hashlib.pbkdf2_hmac(
            config.PBKDF2_ALGORITHM,
            (password or "").encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest.hex(), digest_hex)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def purge_expired(db: Session) -> None:
    db.execute(delete(models.LoginSession).where(models.LoginSession.expires_at < times.now()))
    db.commit()


def find_account(db: Session, username: str) -> models.Account | None:
    if not username:
        return None
    return db.execute(select(models.Account).where(models.Account.username == username)).scalar_one_or_none()


def _write_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        config.SESSION_COOKIE,
        token,
        max_age=config.SESSION_DAYS * 86400,
        httponly=True,
        samesite="strict",
        path="/",
    )


def start_session(db: Session, account: models.Account, response: Response) -> None:
    token = secrets.token_urlsafe(32)
    now = times.now()
    db.add(
        models.LoginSession(
            token_hash=token_hash(token),
            account_id=account.id,
            created_at=now,
            expires_at=now + timedelta(days=config.SESSION_DAYS),
        )
    )
    account.last_login_at = now
    db.commit()
    _write_cookie(response, token)


def end_session(db: Session, request: Request, response: Response) -> None:
    token = request.cookies.get(config.SESSION_COOKIE)
    if token:
        db.execute(delete(models.LoginSession).where(models.LoginSession.token_hash == token_hash(token)))
        db.commit()
    response.delete_cookie(config.SESSION_COOKIE, path="/")


def current_account(request: Request, response: Response, db: Session = Depends(get_db)) -> models.Account:
    token = request.cookies.get(config.SESSION_COOKIE)
    if not token:
        raise ApiError(401, "not_authenticated", "尚未登录")
    login = db.get(models.LoginSession, token_hash(token))
    now = times.now()
    if login is None or login.expires_at < now:
        if login is not None:
            db.delete(login)
            db.commit()
        raise ApiError(401, "not_authenticated", "登录已过期，请重新登录")
    if login.expires_at - now < timedelta(days=config.SESSION_RENEW_DAYS):
        login.expires_at = now + timedelta(days=config.SESSION_DAYS)
        db.commit()
        _write_cookie(response, token)
    account = db.get(models.Account, login.account_id)
    if account is None:
        raise ApiError(401, "not_authenticated", "账户不存在")
    return account
