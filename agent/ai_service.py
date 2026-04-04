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
        self.ollama_models = []
        self.ollama_model = "llama3.1:8b"
        self._check_ollama()
        if self.api_key:
            self.groq_client = Groq(api_key=self.api_key)

    def _check_ollama(self):
        """Check if Ollama is available locally and get available models"""
        try:
            import requests

            response = requests.get("http://localhost:11434/api/tags", timeout=2)
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                self.ollama_models = [m.get("name", "") for m in models]

                # Find best available model - prefer larger models for complex tasks
                preferred = [
                    "llama3.1:70b",
                    "llama3.1:8b",
                    "llama3:70b",
                    "llama3:8b",
                    "mistral",
                    "orca-mini",
                ]
                self.ollama_model = next(
                    (m for m in preferred if any(m in om for om in self.ollama_models)),
                    self.ollama_models[0] if self.ollama_models else "llama3.1:8b",
                )

                self.ollama_available = True
                logger.info(
                    f"Ollama available with models: {self.ollama_models}, using: {self.ollama_model}"
                )
        except Exception as e:
            self.ollama_available = False
            self.ollama_models = []
            self.ollama_model = "llama3.1:8b"
            logger.info(f"Ollama not available: {e}, will use Groq")

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
                json={"model": "llama3.2", "prompt": prompt, "stream": False},
                timeout=120,
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
                model="llama-3.1-8b-instant",
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
        """Parse AI response to pipeline with improved extraction"""
        try:
            data = json.loads(content)
            return data
        except json.JSONDecodeError:
            import re

            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass

            matches = re.findall(r"\{.*\}", content, re.DOTALL)
            for match in matches:
                try:
                    data = json.loads(match)
                    if "pipeline" in data or "decision_summary" in data:
                        return data
                except:
                    pass

            logger.warning("Could not parse AI response, using fallback")
            dataset = config.get("dataset", {})
            constraints = config.get("constraints", {})
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
        model_id = config.get("model_id", "Qwen/Qwen2.5-7B-Instruct")
        model_name = config.get("model_name", model_id.split("/")[-1].replace("-Instruct", ""))
        method = config.get("method", "lora")
        task_type = config.get("task_type", "classification")

        prompt = self._build_notebook_prompt(config)

        # Try Ollama first (gpt-oss:20b preferred, then smaller models)
        if self.ollama_available:
            result = self._generate_notebook_with_ollama(prompt)
            if result and result != "{}":
                logger.info("Notebook generated via Ollama")
                return result

        # Fallback to Groq cloud
        if self.groq_client:
            result = self._generate_notebook_with_groq(prompt)
            if result and result != "{}":
                logger.info("Notebook generated via Groq")
                return result

        # Fallback to template only if AI fails
        logger.warning("AI generation failed, using template fallback")
        return self._generate_notebook_fallback(config)

    def _generate_notebook_with_groq(self, prompt: str) -> str:
        """Generate notebook using Groq cloud API"""
        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=3500,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return self._parse_notebook_response(content)
        except Exception as e:
            logger.error(f"Groq notebook error: {e}")
            return ""

    def _build_notebook_prompt(self, config: Dict) -> str:
        """Build ultra-concise prompt for fast notebook generation"""
        model_id = config.get("model_id", "Qwen/Qwen2.5-7B-Instruct")
        method = config.get("method", "lora").upper()
        epochs = config.get("num_epochs", 3)
        batch = config.get("batch_size", 4)
        lr = config.get("learning_rate", 2e-4)
        lora_r = config.get("lora_r", 16)
        lora_alpha = config.get("lora_alpha", 32)

        prompt = f"""Create a Colab fine-tuning notebook JSON for model {model_id} using {method}.

Config: epochs={epochs}, batch={batch}, lr={lr}, lora_r={lora_r}, lora_alpha={lora_alpha}

Create exactly 10 cells:
1. Markdown title
2. !pip install transformers datasets peft accelerate bitsandbytes torch
3. Config variables (MODEL_NAME, etc)
4. Dataset upload + preprocessing
5. Tokenizer setup
6. Model + LoRA setup  
7. Tokenize with labels
8. TrainingArguments
9. Trainer.train()
10. Save + download

Output ONLY valid JSON with keys: cells, metadata, nbformat, nbformat_minor. No explanations."""

        return prompt

    def _generate_notebook_with_ollama(self, prompt: str) -> str:
        """Generate notebook using Ollama - tries gpt-oss:20b first, then smaller models"""
        try:
            import requests

            # Get available models
            resp = requests.get("http://localhost:11434/api/tags", timeout=5)
            if resp.status_code == 200:
                models = resp.json().get("models", [])

                # List all available model names for debugging
                available = [m["name"] for m in models]
                logger.info(f"Available Ollama models: {available}")

                # Try exact match first, then partial match
                gpt_oss_variants = [
                    "gpt-oss:20b",
                    "gpt-oss",
                    "gpt-oss:20b-instruct",
                    "oss:20b",
                    "gpt2",
                    "gpt-2",
                ]
                selected_model = None

                # First try exact match
                for variant in gpt_oss_variants:
                    if variant in available:
                        selected_model = variant
                        break

                # If no exact match, try partial match
                if not selected_model:
                    for variant in gpt_oss_variants:
                        for model in available:
                            if variant.lower() in model.lower():
                                selected_model = model
                                break
                        if selected_model:
                            break

                # Fallback to other capable models if gpt-oss not found
                if not selected_model:
                    capable = [
                        "mistral",
                        "llama3.1",
                        "llama3:8b",
                        "llama3:70b",
                        "phi3",
                        "codellama",
                    ]
                    for cap in capable:
                        for model in available:
                            if cap.lower() in model.lower():
                                selected_model = model
                                break
                        if selected_model:
                            break

                # Last resort: use first available
                if not selected_model and available:
                    selected_model = available[0]

                if not selected_model:
                    logger.warning("No Ollama models available")
                    return ""

                logger.info(f"Using Ollama model for notebook: {selected_model}")

                # If no exact match, try partial match
                if not selected_model:
                    for variant in gpt_oss_variants:
                        for model in available:
                            if variant.lower() in model.lower():
                                selected_model = model
                                break
                        if selected_model:
                            break

                # Fallback to other capable models if gpt-oss not found
                if not selected_model:
                    capable = [
                        "mistral",
                        "llama3.1",
                        "llama3:8b",
                        "llama3:70b",
                        "phi3",
                        "codellama",
                    ]
                    for cap in capable:
                        for model in available:
                            if cap.lower() in model.lower():
                                selected_model = model
                                break
                        if selected_model:
                            break

                # Last resort: use first available
                if not selected_model and available:
                    selected_model = available[0]

                if not selected_model:
                    logger.warning("No Ollama models available")
                    return ""

                logger.info(f"Using Ollama model for notebook: {selected_model}")

                # Build the full prompt with explicit instructions
                full_prompt = f"""{prompt}

Generate a COMPLETE and VALID Jupyter notebook in JSON format.
The notebook MUST include these cells in order:
1. Markdown title with model name and method
2. Install dependencies cell
3. Configuration cell with MODEL_NAME, TRAINING_METHOD, OUTPUT_DIR
4. Dataset upload cell (from google.colab import files)
5. Data preprocessing and format conversion cell
6. Model loading cell with LoRA/QLoRA configuration
7. Tokenization cell with labels field
8. TrainingArguments and Trainer setup
9. Training execution cell
10. Model save and download cell

CRITICAL REQUIREMENTS:
- Model ID: Must use the exact model ID from config above
- Method: Must implement {prompt.split("method:")[1].split()[0].upper() if "method:" in prompt else "LoRA"}
- Return ONLY valid JSON - no explanations, no markdown code blocks, no text outside JSON
- The JSON must have "cells", "metadata", "nbformat", "nbformat_minor" keys
- Use proper Jupyter notebook format with cell_type for each cell

Return ONLY valid JSON starting with {{ and ending with }}"""

                response = requests.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": selected_model,
                        "prompt": full_prompt,
                        "stream": False,
                    },
                    timeout=300,  # Increased timeout for larger model
                )
                if response.status_code == 200:
                    result = response.json()
                    raw_response = result.get("response", "")
                    logger.info(f"Ollama response length: {len(raw_response)}")

                    # Parse and return
                    parsed = self._parse_notebook_response(raw_response)
                    if parsed and parsed != "{}":
                        return parsed

                    logger.warning("Failed to parse Ollama response, trying fallback")
        except Exception as e:
            logger.error(f"Ollama notebook error: {e}")
        return ""

    def _parse_notebook_response(self, content: str) -> str:
        """Parse AI response to notebook JSON with improved extraction"""
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

            matches = re.findall(r"\{.*\}", content, re.DOTALL)
            for match in matches:
                try:
                    data = json.loads(match)
                    if "cells" in data:
                        return json.dumps(data, indent=2)
                except:
                    continue

            logger.warning("Could not parse notebook, using template")
            return self._generate_notebook_fallback({})

    def _generate_notebook_fallback(self, config: Dict) -> str:
        """Generate fallback notebook template with proper labels and QLoRA support"""
        model_id = config.get("model_id", "Qwen/Qwen2.5-7B-Instruct")
        model_name = config.get("model_name", model_id.split("/")[-1])
        method = config.get("method", "lora")
        dataset = config.get("dataset", {})
        constraints = config.get("constraints", {})

        use_qlora = method.lower() == "qlora"

        notebook = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        f"# Fine-Tuning {model_name} with {method.upper()}\n\n**System2ML Pipeline Training**\n\n- Model: `{model_id}`\n- Method: {method.upper()}\n- Task: {config.get('task_type', 'classification')}"
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
                        '# Prepare Data with Proper Instruction Formatting\nfrom sklearn.model_selection import train_test_split\n\nlabel_candidates = [\'label\', \'target\', \'y\', \'class\', \'output\']\nlabel_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])\nfeature_cols = [c for c in df.columns if c != label_col]\n\nX = df[feature_cols].values\ny = df[label_col].values\nX_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)\n\n# Format as instruction: Input: features Output: label\ntrain_texts = ["Input: " + str(dict(zip(feature_cols, row))) + " Output: " + str(label) for row, label in zip(X_train, y_train)]\nval_texts = ["Input: " + str(dict(zip(feature_cols, row))) + " Output: " + str(label) for row, label in zip(X_val, y_val)]\n\nprint("✅ Data split - Train: " + str(len(X_train)) + ", Validation: " + str(len(X_val)))\nprint("   Sample: " + train_texts[0][:100] + "...")'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Load Model with QLoRA Support\nfrom transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\nfrom peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training\n\ntokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)\nif tokenizer.pad_token is None:\n    tokenizer.pad_token = tokenizer.eos_token\n\n# QLoRA: 4-bit quantization\nif TRAINING_METHOD == "qlora":\n    bnb_config = BitsAndBytesConfig(\n        load_in_4bit=True,\n        bnb_4bit_quant_type="nf4",\n        bnb_4bit_compute_dtype=torch.float16,\n        bnb_4bit_use_double_quant=True,\n    )\n    model = AutoModelForCausalLM.from_pretrained(\n        MODEL_NAME,\n        quantization_config=bnb_config,\n        device_map="auto",\n        trust_remote_code=True\n    )\n    model = prepare_model_for_kbit_training(model)\nelse:\n    model = AutoModelForCausalLM.from_pretrained(\n        MODEL_NAME,\n        device_map="auto",\n        trust_remote_code=True,\n        torch_dtype=torch.float16\n    )\n\nif TRAINING_METHOD in ["lora", "qlora"]:\n    lora_config = LoraConfig(\n        r=16,\n        lora_alpha=32,\n        target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],\n        lora_dropout=0.05,\n        bias="none",\n        task_type=TaskType.CAUSAL_LM\n    )\n    model = get_peft_model(model, lora_config)\n    print("✅ LoRA configured")\n\nmodel.print_trainable_parameters()'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Tokenize with Labels (CRITICAL for causal LM training)\nfrom datasets import Dataset\n\ntrain_dataset = Dataset.from_dict({"text": train_texts, "label": [str(y) for y in y_train]})\nval_dataset = Dataset.from_dict({"text": val_texts, "label": [str(y) for y in y_val]})\n\ndef tokenize_fn(examples):\n    # Tokenize the text\n    tokens = tokenizer(\n        examples["text"],\n        padding="max_length",\n        truncation=True,\n        max_length=512\n    )\n    # CRITICAL: Add labels field for causal language model training\n    tokens["labels"] = tokens["input_ids"].copy()\n    return tokens\n\ntrain_dataset = train_dataset.map(tokenize_fn, batched=True)\nval_dataset = val_dataset.map(tokenize_fn, batched=True)\nprint("✅ Tokenized " + str(len(train_dataset)) + " train, " + str(len(val_dataset)) + " val samples")\nprint("   Labels added: " + str("labels" in train_dataset.column_names))'
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
                        + ',\n    fp16=True,\n    logging_steps=10,\n    eval_strategy="epoch",\n    save_strategy="epoch",\n    load_best_model_at_end=True,\n    report_to="none"\n)\n\ntrainer = Trainer(model=model, args=training_args, train_dataset=train_dataset, eval_dataset=val_dataset)\nprint("✅ Training ready!")'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Train\nimport time\nstart_time = time.time()\nprint("🚀 Starting training...")\n\ntrainer.train()\n\nelapsed = time.time() - start_time\nprint("\\n✅ Training complete! Time: " + str(elapsed/60) + " minutes")'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        '# Save & Download\nmodel.save_pretrained(OUTPUT_DIR)\ntokenizer.save_pretrained(OUTPUT_DIR)\nprint("✅ Model saved to " + OUTPUT_DIR)\n\nget_ipython().system("zip -r model.zip " + OUTPUT_DIR)\nfrom google.colab import files\nfiles.download("model.zip")\nprint("📦 Download started!")'
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
