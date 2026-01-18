"""Central helpers for resolving the FastAPI backend address."""
from __future__ import annotations

import os


def backend_port() -> int:
    return int(os.environ.get("COMFY_BACKEND_PORT", "8100") or "8100")


def backend_http_base() -> str:
    return os.environ.get("COMFY_BACKEND_BASE_URL", f"http://127.0.0.1:{backend_port()}")


def backend_ws_base() -> str:
    return os.environ.get(
        "COMFY_BACKEND_WS_URL",
        f"ws://127.0.0.1:{backend_port()}/ws",
    )
