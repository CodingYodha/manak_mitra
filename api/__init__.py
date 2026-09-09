"""Manak Mitra API package."""
import os
import pathlib

try:
    from dotenv import load_dotenv
    _env_path = pathlib.Path(__file__).parent.parent / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
except ImportError:
    pass
