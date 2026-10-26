"""静态资源托管与首页。"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config


def mount(app: FastAPI) -> None:
    dist_dir = config.BASE_DIR / "frontend" / "dist"
    dist_index = dist_dir / "index.html"
    has_frontend_build = dist_index.is_file()

    for name in config.STATIC_DIRS:
        if has_frontend_build and name in ("src", "styles"):
            continue
        directory = config.BASE_DIR / name
        if directory.is_dir():
            app.mount("/" + name, StaticFiles(directory=directory), name=name)

    app_assets = dist_dir / "app-assets"
    if app_assets.is_dir():
        app.mount("/app-assets", StaticFiles(directory=app_assets), name="app-assets")

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        target = dist_index if has_frontend_build else config.BASE_DIR / "index.html"
        return FileResponse(target)

    @app.get("/index.html", include_in_schema=False)
    def index_file() -> FileResponse:
        target = dist_index if has_frontend_build else config.BASE_DIR / "index.html"
        return FileResponse(target)
