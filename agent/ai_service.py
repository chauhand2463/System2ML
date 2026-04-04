"""
AI-powered design service using Groq or Ollama.
Tries local Ollama first, falls back to Groq cloud API.
"""

import os
import json
import logging
import time
from typing import Dict, Any, Optional, List
from groq import Groq

logger = logging.getLogger(__name__)


class AIDesignService:
    """AI-powered design using Groq or Ollama"""

    def __init__(self, api_key: Optional[str] = None, prefer_backend: str = "auto"):
        self.api_key = api_key or os.environ.get("GROQ_API_KEY", "")
        self.groq_client = None
        self.ollama_available = False
        self.ollama_models: List[str] = []
        self.ollama_model = "llama3.1:8b"
        self._check_ollama()
        if self.api_key:
            self.groq_client = Groq(api_key=self.api_key)

        self.prefer_backend = prefer_backend
        logger.info(f"[AIDesignService] Initialized with prefer_backend={prefer_backend}")

    def _select_best_ollama_model(self, available: List[str]) -> str:
        """Select best available Ollama model - extracted helper"""
        # Priority order: prefer larger models for complex tasks
        preferred = [
            "llama3.1:70b",
            "llama3.1:8b",
            "llama3:70b",
            "llama3:8b",
            "mistral",
            "orca-mini",
            "gpt-oss:20b",
            "gpt-oss",
        ]

        # Try exact match first
        for p in preferred:
            if p in available:
                return p

        # Try partial match
        for p in preferred:
            for model in available:
                if p.lower() in model.lower():
                    return model

        # Fallback to first available
        return available[0] if available else "llama3.1:8b"

    def _check_ollama(self):
        """Check if Ollama is available locally and get available models"""
        try:
            import requests

            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                self.ollama_models = [m.get("name", "") for m in models]
                self.ollama_model = self._select_best_ollama_model(self.ollama_models)
                self.ollama_available = True
                logger.info(f"[Ollama] Available: {self.ollama_models}, using: {self.ollama_model}")
        except Exception as e:
            self.ollama_available = False
            self.ollama_models = []
            self.ollama_model = "llama3.1:8b"
            logger.info(f"[Ollama] Not available: {e}, will use Groq")

    def generate_pipeline(
        self, dataset_profile: Dict, constraints: Dict, infra_context: Dict = None
    ) -> Dict[str, Any]:
        """Generate AI-powered pipeline design"""
        prompt = self._build_pipeline_prompt(dataset_profile, constraints, infra_context)

        # Use backend based on preference
        if self.prefer_backend == "ollama" or (
            self.prefer_backend == "auto" and self.ollama_available
        ):
            result = self._generate_with_ollama(prompt, dataset_profile, constraints)
            if result:
                logger.info("[Pipeline] Generated via Ollama")
                return result

        if self.prefer_backend == "groq" or (self.prefer_backend == "auto" and self.groq_client):
            result = self._generate_with_groq(prompt, dataset_profile, constraints)
            if result:
                logger.info("[Pipeline] Generated via Groq")
                return result

        logger.warning("[Pipeline] No AI backend available, using fallback")
        return self._generate_fallback(dataset_profile, constraints)

    def _build_pipeline_prompt(self, dataset: Dict, constraints: Dict, infra: Dict = None) -> str:
        """Build prompt for pipeline generation"""
        task_type = dataset.get("label_type", "unknown")
        num_features = dataset.get("num_features", 0)
        num_rows = dataset.get("rows", 0)
        data_types = dataset.get("data_types", {})

        cost_limit = constraints.get("max_cost_usd", 10)
        carbon_limit = constraints.get("max_carbon_kg", 1)

        # Sanitize data_types for security
        safe_data_types = json.dumps(data_types, ensure_ascii=True)

        return f"""Design an ML pipeline for the following dataset and constraints:

Dataset Profile:
- Task Type: {task_type}
- Number of Features: {num_features}
- Number of Rows: {num_rows}
- Data Types: {safe_data_types}

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

    def _generate_with_ollama(
        self, prompt: str, dataset: Dict = None, constraints: Dict = None
    ) -> Optional[Dict[str, Any]]:
        """Generate using local Ollama with retry mechanism"""
        dataset = dataset or {}
        constraints = constraints or {}

        # Use the best available model from _check_ollama
        model_to_use = self.ollama_model

        # Retry logic - try 2 times
        for attempt in range(2):
            try:
                import requests

                response = requests.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": model_to_use,
                        "prompt": prompt,
                        "stream": False,
                    },
                    timeout=300,  # Increased timeout
                )
                if response.status_code == 200:
                    result = response.json()
                    parsed = self._parse_ai_response(
                        result.get("response", ""), dataset, constraints
                    )
                    if parsed:
                        return parsed

                logger.warning(
                    f"[Ollama] Attempt {attempt + 1} failed, status: {response.status_code}"
                )

            except Exception as e:
                logger.error(f"[Ollama] Attempt {attempt + 1} error: {e}")

            # Wait before retry
            if attempt == 0:
                time.sleep(1)

        # All retries failed, use fallback
        return self._generate_fallback(dataset, constraints)

    def _generate_with_groq(
        self, prompt: str, dataset: Dict = None, constraints: Dict = None
    ) -> Optional[Dict[str, Any]]:
        """Generate using Groq cloud API"""
        dataset = dataset or {}
        constraints = constraints or {}

        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",  # Better model for structured output
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=3000,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return self._parse_ai_response(content, dataset, constraints)
        except Exception as e:
            logger.error(f"[Groq] Error: {e}")
            return self._generate_fallback(dataset, constraints)

    def _parse_ai_response(
        self, content: str, dataset: Dict = None, constraints: Dict = None
    ) -> Optional[Dict[str, Any]]:
        """Parse AI response to pipeline with improved extraction"""
        dataset = dataset or {}
        constraints = constraints or {}

        try:
            data = json.loads(content)
            return data
        except json.JSONDecodeError:
            import re

            # Non-greedy regex for better JSON extraction
            json_match = re.search(r"\{.*?\}", content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass

            # Try to find JSON with required keys
            matches = re.findall(r"\{.*?\}", content, re.DOTALL)
            for match in matches:
                try:
                    data = json.loads(match)
                    if "pipeline" in data or "decision_summary" in data:
                        return data
                except:
                    continue

            logger.warning("[Parser] Could not parse AI response, using fallback")
            return self._generate_fallback(dataset, constraints)

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
        """Generate AI-powered Colab notebook using Ollama (preferred) or Groq"""
        prompt = self._build_notebook_prompt(config)

        # Try Ollama first with retry
        if self.ollama_available:
            result = self._generate_notebook_with_ollama(prompt)
            if result and result != "{}":
                logger.info("[Notebook] Generated via Ollama")
                return result

        # Fallback to Groq cloud
        if self.groq_client:
            result = self._generate_notebook_with_groq(prompt)
            if result and result != "{}":
                logger.info("[Notebook] Generated via Groq")
                return result

        # Fallback to template
        logger.warning("[Notebook] AI generation failed, using template fallback")
        return self._generate_notebook_fallback(config)

    def _generate_notebook_with_groq(self, prompt: str) -> str:
        """Generate notebook using Groq cloud API"""
        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return self._parse_notebook_response(content)
        except Exception as e:
            logger.error(f"[Groq Notebook] Error: {e}")
            return ""

    def _build_notebook_prompt(self, config: Dict) -> str:
        """Build detailed prompt for complete, production-ready notebook"""
        model_id = config.get("model_id", "Qwen/Qwen2.5-7B-Instruct")
        method = config.get("method", "lora").upper()
        epochs = config.get("num_epochs", 3)
        batch = config.get("batch_size", 4)
        lr = config.get("learning_rate", 2e-4)
        lora_r = config.get("lora_r", 16)
        lora_alpha = config.get("lora_alpha", 32)

        prompt = f"""Generate a COMPLETE Colab fine-tuning notebook JSON for {model_id} using {method}.

CRITICAL: model={model_id}, method={method}, epochs={epochs}, batch={batch}, lr={lr}, lora_r={lora_r}, lora_alpha={lora_alpha}

Create 10 cells with FULL PROPER CODE - each code must be complete and runnable:

CELL 1 (markdown): Include title, config table (Model, Method, Epochs, Batch, LR, LoRA r, LoRA Alpha), quick steps 1-7, troubleshooting.

CELL 2 (code):
# Install dependencies
!pip install -q transformers datasets peft accelerate bitsandbytes torch scikit-learn pandas
print("✅ Dependencies installed")

CELL 3 (code):
import os, json, torch
MODEL_NAME = "{model_id}"
MODEL_DISPLAY_NAME = "Fine-tuned Model"
TRAINING_METHOD = "{method}"
OUTPUT_DIR = "/content/adapter"
NUM_EPOCHS = {epochs}
BATCH_SIZE = {batch}
LEARNING_RATE = {lr}
LORA_R = {lora_r}
LORA_ALPHA = {lora_alpha}
MAX_SEQ_LENGTH = 2048
print(f"Model: {{MODEL_NAME}}")
print(f"Method: {{TRAINING_METHOD}}")
print(f"Epochs: {{NUM_EPOCHS}}, Batch: {{BATCH_SIZE}}, LR: {{LEARNING_RATE}}")
if torch.cuda.is_available():
    print(f"GPU: {{torch.cuda.get_device_name(0)}}")

CELL 4 (code):
from google.colab import files
import pandas as pd
uploaded = files.upload()
filename = list(uploaded.keys())[0]
df = pd.read_csv(filename)
label_candidates = ['label', 'target', 'y', 'class', 'output']
label_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])
data = [{{"text": f"Input: {{', '.join([f'{{k}}={{v}}' for k,v in row.to_dict().items() if k != label_col])}} Output: {{row[label_col]}}}}" for _, row in df.iterrows()]
with open("train.json", "w") as f: json.dump(data, f)
from datasets import load_dataset
dataset = load_dataset("json", data_files="train.json", split="train")
print(f"Dataset: {{len(dataset)}} samples")

CELL 5 (code):
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"
print("Tokenizer loaded")

CELL 6 (code):
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, TaskType
bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16) if TRAINING_METHOD == "qlora" else None
model_kwargs = {{"device_map": "auto", "trust_remote_code": True, "torch_dtype": torch.float16 if not bnb_config else None, "quantization_config": bnb_config if bnb_config else None}}
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, **{{k: v for k, v in model_kwargs.items() if v}})
model = get_peft_model(model, LoraConfig(r=LORA_R, lora_alpha=LORA_ALPHA, target_modules=["q_proj", "v_proj"], lora_dropout=0.05, bias="none", task_type=TaskType.CAUSAL_LM))
model.print_trainable_parameters()

CELL 7 (code):
def tokenize(examples):
    tokens = tokenizer(examples["text"], padding="max_length", truncation=True, max_length=MAX_SEQ_LENGTH)
    tokens["labels"] = tokens["input_ids"].copy()
    return tokens
dataset = dataset.map(tokenize, batched=True)
print(f"Tokenized: {{len(dataset)}} samples")

CELL 8 (code):
from transformers import TrainingArguments
args = TrainingArguments(output_dir=OUTPUT_DIR, num_train_epochs=NUM_EPOCHS, per_device_train_batch_size=BATCH_SIZE, learning_rate=LEARNING_RATE, fp16=True, logging_steps=10, save_strategy="epoch", report_to="none")
print("Training args ready")

CELL 9 (code):
from transformers import Trainer
trainer = Trainer(model=model, args=args, train_dataset=dataset)
print("🚀 Starting training...")
trainer.train()
print("✅ Training complete!")

CELL 10 (code):
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"Model saved to: {{OUTPUT_DIR}}")
import shutil; shutil.make_archive("adapter", "zip", OUTPUT_DIR)
from google.colab import files
files.download("adapter.zip")
print("📦 Download started!")

Return ONLY valid JSON with: cells, metadata, nbformat=4, nbformat_minor=4. Each cell has cell_type, metadata={{}}, source=[lines], execution_count=null, outputs=[]."""

        return prompt

    def _generate_notebook_with_ollama(self, prompt: str) -> str:
        """Generate notebook using Ollama with retry mechanism"""
        # Use the best model from initialization
        model_to_use = self.ollama_model

        # Retry logic - 2 attempts
        for attempt in range(2):
            try:
                import requests

                # Get fresh model list
                resp = requests.get("http://localhost:11434/api/tags", timeout=5)
                if resp.status_code == 200:
                    available = [m["name"] for m in resp.json().get("models", [])]
                    if available:
                        model_to_use = self._select_best_llama_model(available)

                logger.info(f"[Ollama Notebook] Using model: {model_to_use}")

                # Build enhanced prompt
                full_prompt = f"""{prompt}

Generate COMPLETE valid JSON notebook. Return ONLY JSON starting with {{ and ending with }}. Include keys: cells, metadata, nbformat=4, nbformat_minor=4."""

                response = requests.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": model_to_use,
                        "prompt": full_prompt,
                        "stream": False,
                    },
                    timeout=300,
                )
                if response.status_code == 200:
                    result = response.json()
                    raw_response = result.get("response", "")
                    logger.info(f"[Ollama] Response length: {len(raw_response)}")

                    parsed = self._parse_notebook_response(raw_response)
                    if parsed and parsed != "{}":
                        return parsed

                logger.warning(f"[Ollama] Attempt {attempt + 1} failed")

            except Exception as e:
                logger.error(f"[Ollama] Attempt {attempt + 1} error: {e}")

            if attempt == 0:
                time.sleep(1)

        return ""

    def _select_best_llama_model(self, available: List[str]) -> str:
        """Select best Llama model from available list"""
        # Prefer larger models
        for model in available:
            if "70b" in model.lower():
                return model
            if "8b" in model.lower() and "llama" in model.lower():
                return model
        return available[0] if available else "llama3.1:8b"

    def _parse_notebook_response(self, content: str) -> str:
        """Parse AI response to notebook JSON with improved extraction"""
        try:
            data = json.loads(content)
            # Validate notebook format
            if "cells" not in data or "metadata" not in data:
                raise ValueError("Invalid notebook format - missing required keys")
            return json.dumps(data, indent=2)
        except (json.JSONDecodeError, ValueError):
            import re

            # Find JSON with cells key
            json_match = re.search(r'\{[\s\S]*"cells"[\s\S]*\}', content)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                    if "cells" in data:
                        return json.dumps(data, indent=2)
                except:
                    pass

            # Non-greedy approach
            matches = re.findall(r"\{.*?\}", content, re.DOTALL)
            for match in matches:
                try:
                    data = json.loads(match)
                    if "cells" in data:
                        return json.dumps(data, indent=2)
                except:
                    continue

            logger.warning("[Notebook Parser] Could not parse, using template")
            return self._generate_notebook_fallback({})

    def _generate_notebook_fallback(self, config: Dict) -> str:
        """Generate fallback notebook template with proper labels and QLoRA support"""
        model_id = config.get("model_id", "Qwen/Qwen2.5-7B-Instruct")
        model_name = config.get("model_name", model_id.split("/")[-1])
        method = config.get("method", "lora")

        notebook = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        f"# Fine-Tuning {model_name} with {method.upper()}\n\n**System2ML Pipeline Training**\n\n- Model: `{model_id}`\n- Method: {method.upper()}"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Install Dependencies\n!pip install -q transformers datasets peft accelerate bitsandbytes torch scikit-learn pandas\nprint('✅ Dependencies installed!')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        f'import os, json, torch\n\nMODEL_NAME = "{model_id}"\nTRAINING_METHOD = "{method}"\nOUTPUT_DIR = "/content/adapter"\nNUM_EPOCHS = {config.get("num_epochs", 3)}\nBATCH_SIZE = {config.get("batch_size", 4)}\nLEARNING_RATE = {config.get("learning_rate", 2e-4)}\nLORA_R = {config.get("lora_r", 16)}\nLORA_ALPHA = {config.get("lora_alpha", 32)}\n\nprint(f"Model: {{MODEL_NAME}}")\nprint(f"Method: {{TRAINING_METHOD}}")'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Upload Dataset\nfrom google.colab import files\nuploaded = files.upload()\nfilename = list(uploaded.keys())[0]\nimport pandas as pd\ndf = pd.read_csv(filename)\nprint("Dataset: " + str(len(df)) + " rows")'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Prepare Data\nlabel_candidates = ["label", "target", "y", "class"]\nlabel_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])\ndata = [{"text": "Input: " + str(row.drop(label_col).to_dict()) + " Output: " + str(row[label_col])} for _, row in df.iterrows()]\nwith open("train.json", "w") as f: json.dump(data, f)\nfrom datasets import load_dataset\ndataset = load_dataset("json", data_files="train.json", split="train")\nprint("Dataset: " + str(len(dataset)) + " samples")'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Tokenizer\nfrom transformers import AutoTokenizer\ntokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)\ntokenizer.pad_token = tokenizer.eos_token\nprint("Tokenizer loaded")'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Model + LoRA\nfrom transformers import AutoModelForCausalLM, BitsAndBytesConfig\nfrom peft import LoraConfig, get_peft_model, TaskType\nbnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4") if TRAINING_METHOD == "qlora" else None\nmodel = AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map="auto", trust_remote_code=True, torch_dtype=torch.float16, quantization_config=bnb_config)\nmodel = get_peft_model(model, LoraConfig(r=LORA_R, lora_alpha=LORA_ALPHA, target_modules=["q_proj", "v_proj"], task_type=TaskType.CAUSAL_LM))\nmodel.print_trainable_parameters()'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Tokenize\ndef tokenize(examples):\n    tokens = tokenizer(examples["text"], padding="max_length", truncation=True, max_length=2048)\n    tokens["labels"] = tokens["input_ids"].copy()\n    return tokens\ndataset = dataset.map(tokenize, batched=True)\nprint("Tokenized: " + str(len(dataset)))'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Training\nfrom transformers import TrainingArguments, Trainer\nargs = TrainingArguments(output_dir=OUTPUT_DIR, num_train_epochs=NUM_EPOCHS, per_device_train_batch_size=BATCH_SIZE, learning_rate=LEARNING_RATE, fp16=True, logging_steps=10, save_strategy="epoch", report_to="none")\ntrainer = Trainer(model=model, args=args, train_dataset=dataset)\ntrainer.train()\nprint("Training complete!")'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Save & Download\nmodel.save_pretrained(OUTPUT_DIR)\ntokenizer.save_pretrained(OUTPUT_DIR)\nimport shutil\nshutil.make_archive("adapter", "zip", OUTPUT_DIR)\nfrom google.colab import files\nfiles.download("adapter.zip")\nprint("Download started!")'
                    ],
                },
            ],
            "metadata": {
                "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                "language_info": {"name": "python", "version": "3.10.12"},
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
