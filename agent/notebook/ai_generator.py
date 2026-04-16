# -*- coding: utf-8 -*-
"""AI-powered notebook generation service.

Provides multiple backends for notebook generation:
1. Local Ollama (GPT-oss models)
2. Cloud Groq (fast inference)
3. Template-based (fallback)

Chains them together with proper fallback logic.
"""

import json
import logging
import os
from typing import Any, Dict, Optional, Tuple
from openai import OpenAI

logger = logging.getLogger(__name__)


class AINotebookGenerator:
    """
    AI-powered notebook generation with multiple backend support.

    Tries Ollama first (local, free), then Groq (cloud), then falls back to template.
    """

    def __init__(self):
        self.ollama_available = self._check_ollama()
        self.groq_available = self._check_groq()
        self.openrouter_available = self._check_openrouter()
        self._groq_client = None
        self._openrouter_client = None

    def _check_ollama(self) -> bool:
        """Check if Ollama is running locally."""
        try:
            import requests

            resp = requests.get("http://localhost:11434/api/tags", timeout=2)
            return resp.status_code == 200
        except Exception:
            return False

    def _check_groq(self) -> bool:
        """Check if Groq API key is configured."""
        return bool(os.environ.get("GROQ_API_KEY", ""))

    def _check_openrouter(self) -> bool:
        """Check if OpenRouter API key is configured."""
        return bool(os.environ.get("OPENROUTER_API_KEY", ""))

    def _get_groq_client(self):
        """Lazy-load Groq client."""
        if self._groq_client is None:
            try:
                from groq import Groq

                api_key = os.environ.get("GROQ_API_KEY", "")
                self._groq_client = Groq(api_key=api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")
        return self._groq_client

    def _get_openrouter_client(self):
        """Lazy-load OpenRouter client."""
        if self._openrouter_client is None:
            try:
                api_key = os.environ.get("OPENROUTER_API_KEY", "")
                self._openrouter_client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=api_key,
                )
            except Exception as e:
                logger.warning(f"Failed to initialize OpenRouter client: {e}")
        return self._openrouter_client

    def generate_notebook(
        self,
        config: Dict[str, Any],
        prefer_local: bool = False,
    ) -> Tuple[str, str]:
        """
        Generate notebook using AI backends.

        Prioritizes speed (Groq) or quality (OpenRouter) over local (Ollama) unless requested.
        """
        # Build the prompt
        prompt = self._build_prompt(config)

        # Try backends in order of quality (OpenRouter first), then speed (Groq), then local (Ollama)
        # 1. OpenRouter (High quality)
        if self.openrouter_available:
            result = self._generate_openrouter(prompt, config)
            if result:
                logger.info("Notebook generated via OpenRouter (Highest Quality)")
                return result, "openrouter"

        # 2. Groq (Fast)
        if self.groq_available:
            result = self._generate_groq(prompt, config)
            if result:
                logger.info("Notebook generated via Groq (Fast)")
                return result, "groq"

        # 3. Ollama (Local)
        if self.ollama_available:
            result = self._generate_ollama(prompt, config)
            if result:
                logger.info("Notebook generated via Ollama (Local)")
                return result, "ollama"

        # All AI backends failed
        logger.error("All AI backends failed")
        raise RuntimeError("AI notebook generation failed: no backend succeeded")

    def _build_prompt(self, config: Dict[str, Any]) -> str:
        """Build a comprehensive prompt for a 'perfect' AI notebook."""
        model_id = config.get("model_id", "meta-llama/Llama-3.1-8B-Instruct")
        method = config.get("method", "lora").upper()

        # Determine if Unsloth is recommended
        use_unsloth = config.get(
            "use_unsloth", any(m in model_id.lower() for m in ["llama", "mistral", "gemma", "phi"])
        )

        # Dataset Context
        dataset = config.get("dataset", {})
        ds_name = config.get("dataset_name", "dataset")
        ds_type = dataset.get("type", "tabular")
        ds_rows = dataset.get("rows", "unknown")
        ds_cols = dataset.get("columns", []) or dataset.get("features_count", "unknown")
        data_types = dataset.get("data_types", {})
        label_col = dataset.get("label_column", "unknown")

        # Hyperparameters
        epochs = config.get("num_epochs", 3)
        batch_size = config.get("batch_size", 4)
        lr = config.get("learning_rate", 2e-4)

        prompt = f"""You are an expert Machine Learning Engineer. Generate a PERFECT, production-ready Google Colab notebook for fine-tuning {model_id} using {method}.

PROJECT CONTEXT:
- Model: {model_id}
- Method: {method}
- Dataset: {ds_name} ({ds_rows} rows, {ds_cols} columns)
- Data Types: {json.dumps(data_types)}
- Label Column: {label_col}
- Target Platform: Google Colab (T4 GPU)
- Optimization: {"USE UNSLOTH (unsloth.ai) for 2x-4x speedup and 70% less memory usage" if use_unsloth else "Standard HuggingFace Transformers + PEFT"}

REQUIRED SECTIONS & FEATURES:
1. HEADER: Professional title, detailed table of contents, and configuration overview.
2. INSTALLATION: Optimized pip installs (quiet mode). If Unsloth is used, use the official Unsloth install script.
3. DATA LOADING: Handle CSV upload from local machine. Include robust error handling and data profiling (head, info, null checks).
4. PREPROCESSING: 
   - For Tabular: Handle categorical encoding and normalization.
   - For Text: Professional ChatML/Instruct prompt formatting.
   - Smart split into Train/Validation sets.
5. MODEL SETUP:
   - Load in 4-bit/8-bit (QLoRA) for memory efficiency.
   - Configure LoRA/QLoRA adapters (r=16, alpha=32).
   - Use gradient checkpointing.
6. TRAINING:
   - Use `SFTTrainer` from `trl` if applicable.
   - Configure optimized `TrainingArguments`: epochs={epochs}, batch={batch_size}, lr={lr}.
   - Include logging (WandB or TensorBoard support).
7. VISUALIZATION: Use matplotlib/seaborn to plot training loss and accuracy.
8. EXPORT: Save the adapter, the merged model (optional), and create a ZIP for easy download.
9. INFERENCE: Include a "Quick Test" cell to run the fine-tuned model on a sample input.

OUTPUT FORMAT:
Return ONLY a valid Jupyter Notebook JSON object.
Ensure ALL code cells are complete, bug-free, and use modern best practices.
DO NOT include markdown wrappers like ```json.

{{
  "cells": [ ... ],
  "metadata": {{
    "colab": {{ "accelerator": "GPU", "gpuType": "T4" }},
    "kernelspec": {{ "display_name": "Python 3", "language": "python", "name": "python3" }}
  }},
  "nbformat": 4,
  "nbformat_minor": 0
}}
"""
        return prompt

    def _generate_ollama(self, prompt: str, config: Dict[str, Any]) -> Optional[str]:
        """Generate notebook using local Ollama."""
        try:
            import requests

            # Check available models and use the best one
            resp = requests.get("http://localhost:11434/api/tags", timeout=5)
            if resp.status_code == 200:
                models = resp.json().get("models", [])

                # Try gpt-oss:20b first as requested
                model_preferences = [
                    "gpt-oss:20b",
                    "gpt-oss",
                    "llama3.3-70b",
                    "llama3.1:70b",
                    "llama3.1:8b",
                    "mistral:latest",
                ]

                # Find first available model
                available = [m["name"] for m in models]
                model = None
                for pref in model_preferences:
                    if pref in available:
                        model = pref
                        break

                if not model and available:
                    model = available[0]  # Use any available model

                if not model:
                    logger.warning("No Ollama models available")
                    return None

                logger.info(f"Using Ollama model: {model}")

                # Use shorter timeout for Ollama to avoid blocking
                response = requests.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                    },
                    timeout=60,  # Reduced to 60s
                )

                if response.status_code == 200:
                    result = response.json()
                    text = result.get("response", "")
                    return self._parse_ai_response(text)
                else:
                    logger.warning(
                        f"Ollama request failed: {response.status_code} - {response.text[:200]}"
                    )

        except requests.exceptions.Timeout:
            logger.error("Ollama request timed out (60s)")
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")

        return None

    def _generate_openrouter(self, prompt: str, config: Dict[str, Any]) -> Optional[str]:
        """Generate notebook using OpenRouter API."""
        try:
            client = self._get_openrouter_client()
            if not client:
                return None

            model = config.get("openrouter_model", "meta-llama/llama-3.3-70b-instruct")

            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=4000,
                timeout=90,  # 90s timeout for complex generation
            )

            if response.choices:
                text = response.choices[0].message.content
                return self._parse_ai_response(text)

        except Exception as e:
            logger.error(f"OpenRouter generation failed: {e}")

        return None

    def _generate_groq(self, prompt: str, config: Dict[str, Any]) -> Optional[str]:
        """Generate notebook using Groq cloud API."""
        try:
            client = self._get_groq_client()
            if not client:
                return None

            model = config.get("groq_model", "llama-3.3-70b-versatile")

            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=4000,
                response_format={"type": "json_object"},
                timeout=45,  # Groq is fast, 45s is plenty
            )

            if response.choices:
                text = response.choices[0].message.content
                return self._parse_ai_response(text)

        except Exception as e:
            logger.error(f"Groq generation failed: {e}")

        return None

    def _parse_ai_response(self, text: str) -> Optional[str]:
        """Parse AI response to extract JSON notebook."""
        try:
            text = text.strip()

            start_idx = text.find("{")
            end_idx = text.rfind("}")

            if start_idx == -1 or end_idx == -1:
                logger.warning("No JSON found in AI response")
                return None

            json_str = text[start_idx : end_idx + 1]

            try:
                nb = json.loads(json_str)
                if "cells" in nb:
                    return json.dumps(nb, indent=2)
                return json.dumps({"cells": nb}, indent=2)
            except json.JSONDecodeError as e:
                # Try to fix common issues like missing commas
                fixed_json = self._fix_incomplete_json(json_str)
                if fixed_json:
                    nb = json.loads(fixed_json)
                    if "cells" in nb:
                        return json.dumps(nb, indent=2)
                    return json.dumps({"cells": nb}, indent=2)
                logger.error(f"Failed to parse AI response as JSON: {e}")
                return None

        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            return None

    def _fix_incomplete_json(self, json_str: str) -> Optional[str]:
        """Attempt to fix incomplete JSON by adding missing braces and fixing common issues."""
        try:
            # Try to find a valid prefix of the JSON that can be parsed
            # Count braces to find where we might be truncated
            brace_count = 0
            last_complete = len(json_str)

            for i, char in enumerate(json_str):
                if char == "{":
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        last_complete = i + 1
                        break

            # Try parsing up to the last complete object
            if last_complete < len(json_str):
                try:
                    return json_str[:last_complete]
                except:
                    pass

            # Try adding missing closing braces
            open_count = json_str.count("{") - json_str.count("}")
            if open_count > 0:
                json_str += "}" * open_count

            json.loads(json_str)
            return json_str

        except:
            return None

    def get_available_backends(self) -> Dict[str, bool]:
        """Get status of available backends."""
        return {
            "ollama": self.ollama_available,
            "groq": self.groq_available,
            "openrouter": self.openrouter_available,
        }


# Singleton instance
_ai_generator = None


def get_ai_generator() -> AINotebookGenerator:
    """Get the singleton AI generator instance."""
    global _ai_generator
    if _ai_generator is None:
        _ai_generator = AINotebookGenerator()
    return _ai_generator
