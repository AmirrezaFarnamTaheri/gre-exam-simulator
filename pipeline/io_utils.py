"""Shared helpers for writing validated question sets to data/questions/."""

import json
from pathlib import Path

from pydantic import BaseModel

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data" / "questions"


def write_models(relative_path: str, models: list[BaseModel]) -> Path:
    """Write a list of validated pydantic models to data/questions/<relative_path>."""
    out_path = DATA_DIR / relative_path
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [m.model_dump(mode="json") for m in models]
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_path
