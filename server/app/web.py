"""静态资源托管与首页。"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config


def mount(app: FastAPI) -> None:
    for name in config.STATIC_DIRS:
        directory = config.BASE_DIR / name
        if directory.is_dir():
            app.mount("/" + name, StaticFiles(directory=directory), name=name)

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(config.BASE_DIR / "index.html")

    @app.get("/index.html", include_in_schema=False)
    def index_file() -> FileResponse:
        return FileResponse(config.BASE_DIR / "index.html")
