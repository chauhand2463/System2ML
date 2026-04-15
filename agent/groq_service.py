"""
Groq Service - AI-powered pipeline explanations using Groq API
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    from groq import Groq

    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False
    Groq = None


class GroqExplainAgent:
    """Agent for explaining pipeline designs using Groq's LLM API."""

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
        pipeline_dsl: Dict[str, Any],
        audience: str = "product_manager",
        explain_level: str = "executive",
    ) -> Dict[str, Any]:
        """Explain a pipeline design with structured output."""
        if not self.client:
            return self._stub_explanation(pipeline_dsl, audience, explain_level)

        prompt = f"""You are an ML pipeline explainer. Given this pipeline configuration, explain it for a {audience} audience.

Pipeline: {json.dumps(pipeline_dsl, indent=2)}

Return ONLY valid JSON with these exact fields:
{{
  "summary": "2-3 sentence executive summary",
  "key_tradeoffs": [{{"choice": "", "reason": "", "impact": ""}}],
  "risk_warnings": [{{"risk": "", "impact": "", "mitigation": ""}}],
  "deployment_readiness": {{"status": "ready|not_ready", "blockers": [], "next_steps": []}},
  "ui_blocks": {{"pipeline_graph": true, "cost_meter": true, "carbon_meter": true, "risk_panel": true, "approval_panel": false}}
}}"""

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            result["model_used"] = "llama-3.3-70b-versatile"
            return result
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return self._stub_explanation(pipeline_dsl, audience, explain_level)

    def _stub_explanation(self, pipeline_dsl: Dict, audience: str, explain_level: str) -> Dict:
        """Fallback explanation when Groq is not available."""
        return {
            "summary": "Pipeline explanation unavailable. Configure GROQ_API_KEY for AI-powered explanations.",
            "key_tradeoffs": [],
            "risk_warnings": [],
            "deployment_readiness": {"status": "unknown", "blockers": [], "next_steps": []},
            "ui_blocks": {
                "pipeline_graph": True,
                "cost_meter": True,
                "carbon_meter": True,
                "risk_panel": True,
                "approval_panel": False,
            },
            "model_used": "stub",
        }

    @staticmethod
    def is_available() -> bool:
        """Check if Groq is available and configured."""
        api_key = os.environ.get("GROQ_API_KEY", "")
        return HAS_GROQ and bool(api_key)
