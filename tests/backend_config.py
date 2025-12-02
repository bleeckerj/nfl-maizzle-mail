"""Shared helpers for referencing the FastAPI backend in tests."""
from __future__ import annotations

import os

BACKEND_PORT = os.environ.get("COMFY_BACKEND_PORT", "8100")
BASE_HTTP_URL = os.environ.get(
    "COMFY_BACKEND_BASE_URL",
    f"http://localhost:{BACKEND_PORT}",
)
BASE_WS_URL = os.environ.get(
    "COMFY_BACKEND_WS_URL",
    f"ws://localhost:{BACKEND_PORT}/ws",
)
