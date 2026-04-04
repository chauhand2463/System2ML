"""
Groq Service - Stub implementation for System2ML
Provides AI-powered pipeline explanations using Groq API
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

HAS_GROQ = False

try:
    from groq import Groq

    HAS_GROQ = True
except ImportError:
    Groq = None


class GroqExplainAgent:
    """
    Agent for explaining pipeline designs using Groq's LLM API.
    This is a stub implementation - replace with actual Groq integration.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = None
        if HAS_GROQ and api_key:
            try:
                self.client = Groq(api_key=api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")

    def explain(
        self,
        pipeline_dsl: str,
        audience: str = "data_scientist",
        explain_level: str = "medium",
    ) -> Dict[str, Any]:
        """
        Explain a pipeline design in plain language.

        Args:
            pipeline_dsl: The pipeline definition/DSL
            audience: Target audience (data_scientist, executive, compliance)
            explain_level: Detail level (brief, medium, detailed)

        Returns:
            Dictionary with explanation text and metadata
        """
        if not self.client:
            return {
                "explanation": self._stub_explanation(pipeline_dsl, audience, explain_level),
                "audience": audience,
                "explain_level": explain_level,
                "model_used": "stub",
            }

        try:
            prompt = self._build_prompt(pipeline_dsl, audience, explain_level)

            response = self.client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1024,
            )

            return {
                "explanation": response.choices[0].message.content,
                "audience": audience,
                "explain_level": explain_level,
                "model_used": "llama-3.1-70b-versatile",
            }

        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return {
                "explanation": self._stub_explanation(pipeline_dsl, audience, explain_level),
                "audience": audience,
                "explain_level": explain_level,
                "model_used": "stub",
                "error": str(e),
            }

    def _build_prompt(self, pipeline_dsl: str, audience: str, explain_level: str) -> str:
        """Build the prompt for the LLM."""
        level_instructions = {
            "brief": "Provide a concise 2-3 sentence summary.",
            "medium": "Explain the key components and their purpose.",
            "detailed": "Provide a comprehensive explanation including technical details.",
        }

        audience_context = {
            "data_scientist": "Focus on technical accuracy and ML concepts.",
            "executive": "Focus on business value and ROI.",
            "compliance": "Focus on data governance and regulatory considerations.",
        }

        return f"""
Explain the following ML pipeline design:

{pipeline_dsl}

Audience: {audience} ({audience_context.get(audience, "")})
Detail Level: {explain_level} - {level_instructions.get(explain_level, "")}

Provide your explanation in a clear, structured format.
"""

    def _stub_explanation(self, pipeline_dsl: str, audience: str, explain_level: str) -> str:
        """Fallback explanation when Groq is not available."""
        if explain_level == "brief":
            return f"Pipeline design for {audience} audience (level: {explain_level})."
        elif explain_level == "medium":
            return f"This pipeline processes data through multiple stages including preprocessing, model training, and evaluation. Designed for {audience} audience."
        else:
            return f"This comprehensive pipeline includes data ingestion, feature engineering, model selection, training with validation, and deployment stages. Suitable for {audience} with detailed technical components."

    @staticmethod
    def is_available() -> bool:
        """Check if Groq is available and configured."""
        api_key = os.environ.get("GROQ_API_KEY", "")
        return HAS_GROQ and bool(api_key)
