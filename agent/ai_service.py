"""
AI-powered design service using Groq or Ollama.
Tries local Ollama first, falls back to Groq cloud API.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from groq import Groq

logger = logging.getLogger(__name__)


class AIDesignService:
    """AI-powered design using Groq or Ollama"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GROQ_API_KEY", "")
        self.groq_client = None
        self.ollama_available = False
        self._check_ollama()
        if self.api_key:
            self.groq_client = Groq(api_key=self.api_key)

    def _check_ollama(self):
        """Check if Ollama is available locally"""
        try:
            import requests

            response = requests.get("http://localhost:11434/api/tags", timeout=2)
            if response.status_code == 200:
                self.ollama_available = True
                logger.info("Ollama is available locally")
        except Exception:
            self.ollama_available = False
            logger.info("Ollama not available, will use Groq")

    def generate_pipeline(
        self, dataset_profile: Dict, constraints: Dict, infra_context: Dict = None
    ) -> Dict[str, Any]:
        """Generate AI-powered pipeline design"""

        prompt = self._build_pipeline_prompt(dataset_profile, constraints, infra_context)

        if self.ollama_available:
            return self._generate_with_ollama(prompt)
        elif self.groq_client:
            return self._generate_with_groq(prompt)
        else:
            logger.warning("No AI backend available, using fallback")
            return self._generate_fallback(dataset_profile, constraints)

    def _build_pipeline_prompt(self, dataset: Dict, constraints: Dict, infra: Dict = None) -> str:
        """Build prompt for pipeline generation"""
        task_type = dataset.get("label_type", "unknown")
        num_features = dataset.get("num_features", 0)
        num_rows = dataset.get("rows", 0)
        data_types = dataset.get("data_types", {})

        cost_limit = constraints.get("max_cost_usd", 10)
        carbon_limit = constraints.get("max_carbon_kg", 1)

        return f"""Design an ML pipeline for the following dataset and constraints:

Dataset Profile:
- Task Type: {task_type}
- Number of Features: {num_features}
- Number of Rows: {num_rows}
- Data Types: {json.dumps(data_types)}

Constraints:
- Max Budget: ${cost_limit}/month
- Max Carbon: {carbon_limit}kg CO2

Generate a complete pipeline with these components:
1. data_ingestion - source type, PII handling, schema validation
2. feature_engineering - steps to perform, whether to use feature store
3. model_training - algorithm, hyperparameter strategy, resource class
4. evaluation - metrics to track, cross-validation settings
5. deployment - mode, format, latency budget
6. monitoring - drift detection, data quality, performance metrics
7. retraining_policy - trigger conditions, schedule
8. governance - approval requirements, audit logging, model card

Return ONLY valid JSON in this exact format:
{{
  "status": "success",
  "decision_summary": {{
    "task_type": "...",
    "recommended_model_family": "...",
    "rationale": ["reason 1", "reason 2"]
  }},
  "pipeline": {{
    "data_ingestion": {{...}},
    "feature_engineering": {{...}},
    "model_training": {{...}},
    "evaluation": {{...}},
    "deployment": {{...}},
    "monitoring": {{...}},
    "retraining_policy": {{...}},
    "governance": {{...}}
  }},
  "cost_estimate": {{"monthly_usd": number, "confidence": number}},
  "carbon_estimate": {{"monthly_kg": number, "confidence": number}},
  "risk_register": [],
  "alternatives_considered": []
}}"""

    def _generate_with_ollama(self, prompt: str) -> Dict[str, Any]:
        """Generate using local Ollama"""
        try:
            import requests

            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": "llama3.2", "prompt": prompt, "format": "json", "stream": False},
                timeout=60,
            )
            if response.status_code == 200:
                result = response.json()
                return self._parse_ai_response(result.get("response", ""))
            logger.warning("Ollama generation failed, using fallback")
            return self._generate_fallback({}, {})
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            return self._generate_fallback({}, {})

    def _generate_with_groq(self, prompt: str) -> Dict[str, Any]:
        """Generate using Groq cloud API"""
        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.2-90b-vision-preview",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return self._parse_ai_response(content)
        except Exception as e:
            logger.error(f"Groq error: {e}")
            return self._generate_fallback({}, {})

    def _parse_ai_response(self, content: str) -> Dict[str, Any]:
        """Parse AI response to pipeline"""
        try:
            data = json.loads(content)
            return data
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re

            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass
            logger.warning("Could not parse AI response, using fallback")
            return self._generate_fallback({}, {})

    def _generate_fallback(self, dataset: Dict, constraints: Dict) -> Dict[str, Any]:
        """Fallback deterministic generation"""
        task_type = dataset.get("label_type", "classification")
        cost_limit = constraints.get("max_cost_usd", 10)

        algorithm = "random_forest"
        if cost_limit < 3:
            algorithm = "logistic_regression"
        elif cost_limit > 20:
            algorithm = "xgboost"

        return {
            "status": "success",
            "decision_summary": {
                "task_type": task_type,
                "recommended_model_family": algorithm,
                "rationale": [f"Selected {algorithm} for cost-effective {task_type}"],
            },
            "pipeline": {
                "data_ingestion": {
                    "source_type": "csv",
                    "pii_handling": "none",
                    "schema_validation": True,
                },
                "feature_engineering": {"steps": ["scaling", "encoding"], "feature_store": False},
                "model_training": {
                    "algorithm": algorithm,
                    "hyperparam_strategy": "grid",
                    "resource_class": "standard",
                },
                "evaluation": {"metrics": ["accuracy", "f1"], "cross_validation": True},
                "deployment": {"mode": "batch", "format": "pickle", "latency_budget_ms": 1000},
                "monitoring": {
                    "drift": ["accuracy"],
                    "data_quality": ["missing"],
                    "performance": ["latency"],
                    "pii_leak_detection": True,
                },
                "retraining_policy": {"trigger": ["accuracy_drop"], "schedule_days": 7},
                "rollback": {"strategy": "manual", "max_rollback_minutes": 30},
                "governance": {"approval_required": True, "audit_log": True, "model_card": True},
            },
            "cost_estimate": {"monthly_usd": min(cost_limit * 0.8, 8), "confidence": 0.9},
            "carbon_estimate": {
                "monthly_kg": min(constraints.get("max_carbon_kg", 1) * 0.5, 0.5),
                "confidence": 0.9,
            },
            "risk_register": [],
            "alternatives_considered": [],
        }

    def generate_notebook(self, config: Dict[str, Any]) -> str:
        """Generate AI-powered Colab notebook"""
        # Use colab_service for structured notebook generation
        try:
            from agent.colab_service import get_colab_service

            colab = get_colab_service()
            return colab.create_notebook(config)
        except Exception as e:
            logger.warning(f"Colab service failed: {e}, using AI generation")

        prompt = self._build_notebook_prompt(config)

        if self.ollama_available:
            return self._generate_notebook_with_ollama(prompt)
        elif self.groq_client:
            return self._generate_notebook_with_groq(prompt)
        else:
            return self._generate_notebook_fallback(config)

    def _build_notebook_prompt(self, config: Dict) -> str:
        """Build prompt for notebook generation"""
        model_id = config.get("model_id", "microsoft/phi-2")
        method = config.get("method", "lora")
        epochs = config.get("num_epochs", 3)
        batch_size = config.get("batch_size", 4)
        learning_rate = config.get("learning_rate", 2e-4)

        return f"""Generate a Google Colab notebook for fine-tuning {model_id} using {method.upper()} method.

Training Configuration:
- Model: {model_id}
- Method: {method}
- Epochs: {epochs}
- Batch Size: {batch_size}
- Learning Rate: {learning_rate}

Generate a complete Jupyter notebook in JSON format with these cells:
1. Markdown title cell
2. Install dependencies (transformers, datasets, peft, accelerate, bitsandbytes, torch)
3. Configuration cell with model and training params
4. Dataset upload and loading cell
5. Data preprocessing cell (detect label column, split train/test)
6. Model loading cell (with LoRA/QLoRA config if applicable)
7. Tokenization cell
8. Training configuration cell (TrainingArguments)
9. Training execution cell
10. Save and download cell
11. Markdown completion cell

Return ONLY valid notebook JSON with this structure:
{{
  "cells": [
    {{"cell_type": "markdown", "metadata": {{}}, "source": ["text"]}},
    {{"cell_type": "code", "execution_count": null, "metadata": {{}}, "outputs": [], "source": ["code line 1", "code line 2"]}}
  ],
  "metadata": {{"kernelspec": {{"display_name": "Python 3", "language": "python", "name": "python3"}}, "language_info": {{"name": "python", "version": "3.10.12"}}}},
  "nbformat": 4,
  "nbformat_minor": 4
}}"""

    def _generate_notebook_with_ollama(self, prompt: str) -> str:
        """Generate notebook using Ollama"""
        try:
            import requests

            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": "llama3.2", "prompt": prompt, "stream": False},
                timeout=90,
            )
            if response.status_code == 200:
                result = response.json()
                return self._parse_notebook_response(result.get("response", ""))
        except Exception as e:
            logger.error(f"Ollama notebook error: {e}")
        return self._generate_notebook_fallback({})

    def _generate_notebook_with_groq(self, prompt: str) -> str:
        """Generate notebook using Groq"""
        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.2-90b-vision-preview",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return self._parse_notebook_response(content)
        except Exception as e:
            logger.error(f"Groq notebook error: {e}")
            return self._generate_notebook_fallback({})

    def _parse_notebook_response(self, content: str) -> str:
        """Parse AI response to notebook JSON"""
        try:
            data = json.loads(content)
            return json.dumps(data, indent=2)
        except json.JSONDecodeError:
            import re

            json_match = re.search(r'\{[\s\S]*"cells"[\s\S]*\}', content)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                    return json.dumps(data, indent=2)
                except:
                    pass
            logger.warning("Could not parse notebook, using template")
            return self._generate_notebook_fallback({})

    def _generate_notebook_fallback(self, config: Dict) -> str:
        """Generate fallback notebook template"""
        model_id = config.get("model_id", "microsoft/phi-2")
        model_name = config.get("model_name", model_id.split("/")[-1])
        method = config.get("method", "lora")

        # Use colab_service for proper notebook generation
        try:
            from agent.colab_service import get_colab_service

            colab = get_colab_service()
            return colab.create_notebook(config)
        except Exception as e:
            logger.warning(f"Colab service failed in fallback: {e}")

        # Fallback to simple template if colab service fails
        notebook = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        f"# Fine-Tuning {model_name} with {method.upper()}\n\n**System2ML Pipeline Training**"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Install Dependencies\n!pip install -q transformers datasets peft accelerate bitsandbytes torch\n!pip install -q scikit-learn pandas numpy\nprint('✅ Dependencies installed!')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        'import os\nimport json\nimport pandas as pd\nimport torch\nfrom datetime import datetime\n\nMODEL_NAME = "'
                        + model_id
                        + '"\nTRAINING_METHOD = "'
                        + method
                        + '"\nOUTPUT_DIR = "/content/model_adapter"\nMAX_BUDGET_USD = '
                        + str(config.get("max_budget", 5))
                        + "\n\nprint(f'🤖 Model: {MODEL_NAME}')\nprint(f'🔧 Method: {TRAINING_METHOD}')\nprint(f'💰 Budget: ${MAX_BUDGET_USD}')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Upload Dataset\nfrom google.colab import files\nprint('📁 Please upload your CSV dataset:')\nuploaded = files.upload()\nfilename = list(uploaded.keys())[0]\ndf = pd.read_csv(filename)\nprint(f'✅ Dataset loaded: {len(df)} rows, {len(df.columns)} columns')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Prepare Data\nfrom sklearn.model_selection import train_test_split\n\nlabel_candidates = ['label', 'target', 'y', 'class', 'output']\nlabel_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])\nfeature_cols = [c for c in df.columns if c != label_col]\n\nX = df[feature_cols].values\ny = df[label_col].values\nX_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)\nprint(f'✅ Data split - Train: {len(X_train)}, Validation: {len(X_val)}')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Load Model\nfrom transformers import AutoModelForCausalLM, AutoTokenizer\nfrom peft import LoraConfig, get_peft_model, TaskType\n\ntokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)\nif tokenizer.pad_token is None:\n    tokenizer.pad_token = tokenizer.eos_token\n\nmodel = AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map='auto', trust_remote_code=True)\n\nif TRAINING_METHOD in ['lora', 'qlora']:\n    lora_config = LoraConfig(r=16, lora_alpha=32, target_modules=['q_proj', 'v_proj'], lora_dropout=0.05, bias='none', task_type=TaskType.CAUSAL_LM)\n    model = get_peft_model(model, lora_config)\n    print('✅ LoRA configured')\n\nmodel.print_trainable_parameters()"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Tokenize\nfrom datasets import Dataset\n\ntrain_texts = [str(x) for x in X_train]\nval_texts = [str(x) for x in X_val]\n\ntrain_dataset = Dataset.from_dict({'text': train_texts})\nval_dataset = Dataset.from_dict({'text': val_texts})\n\ndef tokenize_fn(examples):\n    return tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)\n\ntrain_dataset = train_dataset.map(tokenize_fn, batched=True)\nval_dataset = val_dataset.map(tokenize_fn, batched=True)\nprint(f'✅ Tokenized {len(train_dataset)} train, {len(val_dataset)} val samples')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Training Config\nfrom transformers import TrainingArguments, Trainer\n\ntraining_args = TrainingArguments(\n    output_dir=OUTPUT_DIR,\n    num_train_epochs="
                        + str(config.get("num_epochs", 3))
                        + ",\n    per_device_train_batch_size="
                        + str(config.get("batch_size", 4))
                        + ",\n    learning_rate="
                        + str(config.get("learning_rate", 2e-4))
                        + ",\n    fp16=True,\n    logging_steps=10,\n    eval_strategy='epoch',\n    save_strategy='epoch',\n    load_best_model_at_end=True,\n    report_to='none'\n)\n\ntrainer = Trainer(model=model, args=training_args, train_dataset=train_dataset, eval_dataset=val_dataset)\nprint('✅ Training ready!')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Train\nimport time\nstart_time = time.time()\nprint('🚀 Starting training...')\n\ntrainer.train()\n\nelapsed = time.time() - start_time\nprint(f'\\n✅ Training complete! Time: {elapsed/60:.2f} minutes')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Save & Download\nmodel.save_pretrained(OUTPUT_DIR)\ntokenizer.save_pretrained(OUTPUT_DIR)\nprint(f'✅ Model saved to {OUTPUT_DIR}')\n\n!zip -r model.zip {OUTPUT_DIR}\nfrom google.colab import files\nfiles.download('model.zip')\nprint('📦 Download started!')"
                    ],
                },
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "---\n## 🎉 Training Complete!\nYour fine-tuned model is ready. Extract model.zip and use it for inference."
                    ],
                },
            ],
            "metadata": {
                "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                "language_info": {"name": "python", "version": "3.10.12"},
                "colab": {
                    "provenance": [],
                    "include_colab_link": True,
                    "name": f"System2ML Training - {model_id.split('/')[-1]}",
                },
            },
            "nbformat": 4,
            "nbformat_minor": 4,
        }

        return json.dumps(notebook, indent=2)


# Singleton instance
ai_service = AIDesignService()


def get_ai_service() -> AIDesignService:
    """Get the AI service instance"""
    return ai_service
