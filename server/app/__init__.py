"""应用工厂：装配中间件、异常处理、接口路由与静态资源。"""
from __future__ import annotations

from fastapi import FastAPI, Request

from . import config, database, errors, models, security, web
from .routers import auth, health, me

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _seed_schema_version() -> None:
    with database.session_scope() as db:
        if db.get(models.SchemaVersion, config.SCHEMA_VERSION) is None:
            db.add(models.SchemaVersion(version=config.SCHEMA_VERSION))
            db.commit()


def create_app(db_path=None) -> FastAPI:
    database.init_engine(config.resolve_db_path(db_path))
    database.create_all()
    _seed_schema_version()

    app = FastAPI(
        title="街区警戒线 · 账户服务",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
    )

    @app.middleware("http")
    async def _guard_same_origin(request: Request, call_next):
        if request.method in MUTATING_METHODS and not config.allowed_origin(request.headers.get("origin")):
            return errors.error_response(403, "bad_origin", "请求来源不被允许")
        return await call_next(request)

    errors.install(app)
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(me.router, prefix="/api/me", tags=["me"])
    web.mount(app)

    with database.session_scope() as db:
        security.purge_expired(db)
    return app
