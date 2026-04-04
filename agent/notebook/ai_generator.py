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

logger = logging.getLogger(__name__)


class AINotebookGenerator:
    """
    AI-powered notebook generation with multiple backend support.

    Tries Ollama first (local, free), then Groq (cloud), then falls back to template.
    """

    def __init__(self):
        self.ollama_available = self._check_ollama()
        self.groq_available = self._check_groq()
        self._groq_client = None

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

    def generate_notebook(
        self,
        config: Dict[str, Any],
        prefer_local: bool = True,
    ) -> Tuple[str, str]:
        """
        Generate notebook using AI backends.

        Args:
            config: Training configuration
            prefer_local: If True, try Ollama first. If False, try Groq first.

        Returns:
            Tuple of (notebook_json, generation_method)
            generation_method: "ollama" | "groq" | "template" | "error"
        """
        # Build the prompt
        prompt = self._build_prompt(config)

        # Try backends in order based on preference
        if prefer_local and self.ollama_available:
            result = self._generate_ollama(prompt, config)
            if result:
                logger.info("Notebook generated via Ollama (local)")
                return result, "ollama"

        if self.groq_available:
            result = self._generate_groq(prompt, config)
            if result:
                logger.info("Notebook generated via Groq (cloud)")
                return result, "groq"

        # Try Ollama as fallback if prefer_local was False
        if not prefer_local and self.ollama_available:
            result = self._generate_ollama(prompt, config)
            if result:
                logger.info("Notebook generated via Ollama (fallback)")
                return result, "ollama"

        # All AI backends failed, return empty for template fallback
        logger.warning("All AI backends failed, will use template")
        return "", "error"

    def _build_prompt(self, config: Dict[str, Any]) -> str:
        """Build the prompt for AI notebook generation."""
        model_id = config.get("model_id", "meta-llama/Llama-3.1-8B-Instruct")
        method = config.get("method", "lora").upper()
        use_unsloth = config.get("use_unsloth", False)

        prompt = f"""Generate a Google Colab notebook for fine-tuning {model_id} using {method} method.

Requirements:
- Method: {method}
- Unsloth: {"Yes - 2x faster training" if use_unsloth else "No"}
- Dataset: User will upload CSV
- Output: Save adapter to /content/adapter

Generate ONLY a JSON notebook with these exact cells:
1. Markdown header with title and configuration
2. Code cell: Install dependencies (transformers, datasets, peft, accelerate, bitsandbytes, torch)
3. Code cell: Load model and tokenizer with quantization if QLoRA
4. Code cell: Load and prepare dataset (user uploads CSV)
5. Code cell: Configure and apply LoRA adapters
6. Code cell: Train with SFTTrainer
7. Code cell: Save model and create download

Return ONLY valid JSON, no markdown, no explanations. Format:
{{"cells": [{{"cell_type": "markdown"|"code", "source": "..."}}]}}
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

                # Try smaller models first (to avoid memory issues)
                model_preferences = [
                    "mistral:latest",
                    "llama3.1:8b",
                    "llama3:8b",
                    "phi3:14b",
                    "gemma:7b",
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

                # Don't use format=json to reduce memory usage
                response = requests.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                    },
                    timeout=180,
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
            logger.error("Ollama request timed out")
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")

        return None

    def _generate_groq(self, prompt: str, config: Dict[str, Any]) -> Optional[str]:
        """Generate notebook using Groq cloud API."""
        try:
            client = self._get_groq_client()
            if not client:
                return None

            model = config.get("groq_model", "llama-3.1-70b-versatile")

            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=4000,
                response_format={"type": "json_object"},
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
            # Try to find JSON in the response
            text = text.strip()

            # Find JSON start
            start_idx = text.find("{")
            end_idx = text.rfind("}")

            if start_idx == -1 or end_idx == -1:
                logger.warning("No JSON found in AI response")
                return None

            json_str = text[start_idx : end_idx + 1]

            # Validate it's valid notebook JSON
            nb = json.loads(json_str)

            if "cells" in nb:
                return json.dumps(nb, indent=2)

            # Try to wrap in cells format
            return json.dumps({"cells": nb}, indent=2)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            return None

    def get_available_backends(self) -> Dict[str, bool]:
        """Get status of available backends."""
        return {
            "ollama": self.ollama_available,
            "groq": self.groq_available,
        }


# Singleton instance
_ai_generator = None


def get_ai_generator() -> AINotebookGenerator:
    """Get the singleton AI generator instance."""
    global _ai_generator
    if _ai_generator is None:
        _ai_generator = AINotebookGenerator()
    return _ai_generator
