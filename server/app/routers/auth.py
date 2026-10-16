"""注册、登录与注销。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from .. import models, security
from ..database import get_db
from ..errors import ApiError
from ..schemas import Credentials
from ..serializers import account_payload

router = APIRouter()


@router.post("/register", status_code=201)
def register(payload: Credentials, response: Response, db: Session = Depends(get_db)) -> dict:
    username = security.validate_username(payload.username)
    password = security.validate_password(payload.password)
    if security.find_account(db, username) is not None:
        raise ApiError(409, "username_taken", "用户名已存在")
    account = models.Account(username=username, password_hash=security.hash_password(password))
    db.add(account)
    db.commit()
    security.start_session(db, account, response)
    return {"account": account_payload(account)}


@router.post("/login")
def login(payload: Credentials, response: Response, db: Session = Depends(get_db)) -> dict:
    account = security.find_account(db, (payload.username or "").strip())
    if account is None or not security.verify_password(payload.password, account.password_hash):
        raise ApiError(403, "bad_credentials", "用户名或密码不正确")
    security.start_session(db, account, response)
    return {"account": account_payload(account)}


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    security.end_session(db, request, response)
