# -*- coding: utf-8 -*-
"""Notebook validation utilities."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    import nbformat

    HAS_NBFORMAT = True
except ImportError:
    HAS_NBFORMAT = False


def validate_notebook(notebook_json: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a notebook JSON string.

    Returns
    -------
    Tuple[bool, Optional[str]]
        (is_valid, error_message)
    """
    if not HAS_NBFORMAT:
        return False, "nbformat not installed. Install with: pip install nbformat"

    try:
        nb = json.loads(notebook_json)

        if "nbformat" not in nb:
            return False, "Missing 'nbformat' key"

        if "cells" not in nb:
            return False, "Missing 'cells' key"

        if not isinstance(nb.get("cells"), list):
            return False, "'cells' must be a list"

        nbformat.validate(nb)

        return True, None

    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {e}"
    except Exception as e:
        return False, f"Validation error: {e}"


def validate_config(config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate training configuration for notebook generation.

    Required keys: model_id, method
    Optional keys: model_name, dataset_path, num_epochs, batch_size, etc.
    """
    if not isinstance(config, dict):
        return False, "Config must be a dictionary"

    required = {"model_id", "method"}
    missing = required - set(config.keys())

    if missing:
        return False, f"Missing required keys: {', '.join(missing)}"

    valid_methods = {"lora", "qlora", "full_ft", "dpo"}
    method = config.get("method", "").lower()
    if method not in valid_methods:
        return False, f"Invalid method: {method}. Must be one of {valid_methods}"

    return True, None


def sanity_check_cells(cells: List[Dict[str, Any]]) -> List[str]:
    """
    Perform sanity checks on notebook cells.

    Returns list of warnings (empty if all checks pass)
    """
    warnings = []

    has_install = False
    has_train = False

    for i, cell in enumerate(cells):
        cell_type = cell.get("cell_type", "")
        source = cell.get("source", "")

        if cell_type == "code":
            if "pip install" in source:
                has_install = True
            if "trainer" in source or "Trainer" in source:
                has_train = True
            if "model.save" in source or "adapter" in source.lower():
                pass

        if cell_type == "markdown":
            if not source.strip():
                warnings.append(f"Empty markdown cell at index {i}")

    if not has_install:
        warnings.append("No pip install cell found")

    if not has_train:
        warnings.append("No training cell found")

    return warnings
