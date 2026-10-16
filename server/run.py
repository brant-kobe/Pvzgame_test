"""启动入口：python server/run.py [--port 8787] [--db data/blockline.db]。"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn

from app import config, create_app


def main() -> None:
    parser = argparse.ArgumentParser(description="街区警戒线本地账户服务")
    parser.add_argument("--host", default=config.HOST)
    parser.add_argument("--port", type=int, default=config.PORT)
    parser.add_argument("--db", default=None)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()

    app = create_app(db_path=args.db)
    print("街区警戒线账户服务：http://{}:{}".format(args.host, args.port))
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
