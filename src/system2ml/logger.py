"""Centralized logging configuration for System2ML.

Provides a ready‑to‑use :data:`logger` instance configured with a
reasonable default format and level.  Projects can import
``from system2ml.logger import logger`` and log throughout the code
base.
"""

import logging
import sys
from pathlib import Path

# Create a log directory relative to the project root if it does not exist.
log_dir = Path(__file__).resolve().parent.parent / "logs"
log_dir.mkdir(parents=True, exist_ok=True)

log_file = log_dir / "system2ml.log"

# Configure the root logger only once.
logger = logging.getLogger("system2ml")
if not logger.handlers:
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    # File handler with rotation
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

# Export the logger for ``from system2ml.logger import logger``
__all__ = ["logger"]
