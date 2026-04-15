"""
Colab Training Service for System2ML
Executes real fine-tuning jobs on Google Colab
"""

import os
import json
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import HTTPException


logger = logging.getLogger(__name__)
COLAB_NOTEBOOK_TEMPLATE = {
    "lora": """{
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": ["# Fine-Tuning {model_name} with LoRA\\n", "System2ML Pipeline Training"]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Install dependencies\\n",
    "!pip install -q transformers datasets peft accelerate bitsandbytes torch\\n",
    "!pip install -q scikit-learn pandas numpy"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "import os\\n",
    "import json\\n",
    "import pandas as pd\\n",
    "from datetime import datetime\\n",
    "\\n",
    "# Configuration\\n",
    "MODEL_NAME = \"{model_id}\"\\n",
    "TRAINING_METHOD = \"lora\"\\n",
    "DATASET_PATH = \"{dataset_path}\"\\n",
    "OUTPUT_DIR = \"/content/model_adapter\"\\n",
    "MAX_BUDGET_USD = {max_budget}\\n",
    "\\n",
    "print(f\"Starting training: {{MODEL_NAME}} with {{TRAINING_METHOD}}\")\\n",
    "print(f\"Dataset: {{DATASET_PATH}}\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Load and prepare dataset\\n",
    "from datasets import load_dataset\\n",
    "\\n",
    "df = pd.read_csv(DATASET_PATH)\\n",
    "print(f\"Dataset loaded: {{len(df)}} rows\")\\n",
    "print(f\"Columns: {{list(df.columns)}}\")\\n",
    "print(df.head())"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Load model with LoRA\\n",
    "import torch\\n",
    "from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer\\n",
    "from peft import LoraConfig, get_peft_model, TaskType\\n",
    "\\n",
    "model = AutoModelForCausalLM.from_pretrained(\\n",
    "    MODEL_NAME,\\n",
    "    torch_dtype=torch.float16,\\n",
    "    device_map=\"auto\"\\n",
    ")\\n",
    "tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)\\n",
    "\\n",
    "# Configure LoRA\\n",
    "lora_config = LoraConfig(\\n",
    "    r=16,\\n",
    "    lora_alpha=32,\\n",
    "    target_modules=[\"q_proj\", \"v_proj\"],\\n",
    "    lora_dropout=0.05,\\n",
    "    bias=\"none\",\\n",
    "    task_type=TaskType.CAUSAL_LM\\n",
    ")\\n",
    "model = get_peft_model(model, lora_config)\\n",
    "model.print_trainable_parameters()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Prepare dataset for training\\n",
    "def tokenize_function(examples):\\n",
    "    return tokenizer(examples[\"text\"], padding=\"max_length\", truncation=True, max_length=512)\\n",
    "\\n",
    "# Create text column from all columns\\n",
    "df[\"text\"] = df.apply(lambda x: \" | \".join([f\"{{k}}: {{v}}\" for k,v in x.items()]), axis=1)\\n",
    "dataset_dict = {{"train": df.to_dict(\"records\")}}\\n",
    "\\n",
    "from datasets import Dataset\\n",
    "train_dataset = Dataset.from_list(dataset_dict[\"train\"])\\n",
    "tokenized_dataset = train_dataset.map(tokenize_function, batched=True)\\n",
    "print(f\"Tokenized dataset: {{len(tokenized_dataset)}} samples\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Training configuration\\n",
    "training_args = TrainingArguments(\\n",
    "    output_dir=OUTPUT_DIR,\\n",
    "    num_train_epochs={num_epochs},\\n",
    "    per_device_train_batch_size={batch_size},\\n",
    "    learning_rate={learning_rate},\\n",
    "    fp16=True,\\n",
    "    logging_steps=10,\\n",
    "    save_strategy=\"epoch\",\\n",
    "    save_total_limit=1,\\n",
    "    report_to=\"none\"\\n",
    ")\\n",
    "\\n",
    "trainer = Trainer(\\n",
    "    model=model,\\n",
    "    args=training_args,\\n",
    "    train_dataset=tokenized_dataset,\\n",
    ")\\n",
    "\\n",
    "print(\"Starting training...\")\\n",
    "start_time = datetime.now()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Execute training\\n",
    "trainer.train()\\n",
    "\\n",
    "end_time = datetime.now()\\n",
    "training_duration = (end_time - start_time).total_seconds()\\n",
    "print(f\"Training completed in {{training_duration:.2f}} seconds\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Save model and generate results\\n",
    "model.save_pretrained(OUTPUT_DIR)\\n",
    "tokenizer.save_pretrained(OUTPUT_DIR)\\n",
    "\\n",
    "# Calculate metrics\\n",
    "results = {{\\n",
    "    \"status\": \"completed\",\\n",
    "    \"model\": MODEL_NAME,\\n",
    "    \"method\": TRAINING_METHOD,\\n",
    "    \"training_duration_seconds\": training_duration,\\n",
    "    \"num_samples\": len(tokenized_dataset),\\n",
    "    \"output_dir\": OUTPUT_DIR,\\n",
    "    \"timestamp\": datetime.now().isoformat()\\n",
    "}}\\n",
    "\\n",
    "print(\"Training Results:\")\\n",
    "print(json.dumps(results, indent=2))\\n",
    "\\n",
    "# Save results\\n",
    "with open(\"/content/training_results.json\", \"w\") as f:\\n",
    "    json.dump(results, f, indent=2)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "print(\"Training complete! Model saved to:\", OUTPUT_DIR)"
   ]
  }
 ]
}""",
    "qlora": """{
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": ["# Fine-Tuning {model_name} with QLoRA\\n", "System2ML Pipeline Training - Memory Optimized"]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Install dependencies\\n",
    "!pip install -q transformers datasets peft accelerate bitsandbytes torch\\n",
    "!pip install -q scikit-learn pandas numpy"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Enable 4-bit quantization\\n",
    "import os\\n",
    "import torch\\n",
    "from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\\n",
    "from peft import LoraConfig, get_peft_model, TaskType\\n",
    "from datetime import datetime\\n",
    "\\n",
    "MODEL_NAME = \"{model_id}\"\\n",
    "OUTPUT_DIR = \"/content/model_adapter\"\\n",
    "\\n",
    "# 4-bit quantization config\\n",
    "bnb_config = BitsAndBytesConfig(\\n",
    "    load_in_4bit=True,\\n",
    "    bnb_4bit_quant_type=\"nf4\",\\n",
    "    bnb_4bit_compute_dtype=torch.float16,\\n",
    "    bnb_4bit_use_double_quant=True\\n",
    ")\\n",
    "\\n",
    "model = AutoModelForCausalLM.from_pretrained(\\n",
    "    MODEL_NAME,\\n",
    "    quantization_config=bnb_config,\\n",
    "    device_map=\"auto\"\\n",
    ")\\n",
    "tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)\\n",
    "model.gradient_checkpointing_enable()\\n",
    "print(\"Model loaded with 4-bit quantization\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Load dataset\\n",
    "import pandas as pd\\n",
    "from datasets import Dataset\\n",
    "\\n",
    "df = pd.read_csv(\"{dataset_path}\")\\n",
    "df[\"text\"] = df.apply(lambda x: \" | \".join([f\"{{k}}: {{v}}\" for k,v in x.items()]), axis=1)\\n",
    "\\n",
    "def tokenize_function(examples):\\n",
    "    return tokenizer(examples[\"text\"], padding=\"max_length\", truncation=True, max_length=256)\\n",
    "\\n",
    "train_dataset = Dataset.from_list(df.to_dict(\"records\"))\\n",
    "tokenized_dataset = train_dataset.map(tokenize_function, batched=True)\\n",
    "print(f\"Prepared {{len(tokenized_dataset)}} samples\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Configure QLoRA\\n",
    "lora_config = LoraConfig(\\n",
    "    r=8,\\n",
    "    lora_alpha=16,\\n",
    "    target_modules=[\"q_proj\", \"v_proj\", \"k_proj\", \"o_proj\"],\\n",
    "    lora_dropout=0.1,\\n",
    "    bias=\"none\",\\n",
    "    task_type=TaskType.CAUSAL_LM\\n",
    ")\\n",
    "model = get_peft_model(model, lora_config)\\n",
    "model.print_trainable_parameters()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "from transformers import TrainingArguments, Trainer\\n",
    "\\n",
    "training_args = TrainingArguments(\\n",
    "    output_dir=OUTPUT_DIR,\\n",
    "    num_train_epochs={num_epochs},\\n",
    "    per_device_train_batch_size={batch_size},\\n",
    "    learning_rate={learning_rate},\\n",
    "    fp16=True,\\n",
    "    logging_steps=5,\\n",
    "    save_strategy=\"epoch\",\\n",
    "    optim=\"paged_adamw_32bit\"\\n",
    ")\\n",
    "\\n",
    "trainer = Trainer(\\n",
    "    model=model,\\n",
    "    args=training_args,\\n",
    "    train_dataset=tokenized_dataset,\\n",
    ")\\n",
    "\\n",
    "start_time = datetime.now()\\n",
    "trainer.train()\\n",
    "training_duration = (datetime.now() - start_time).total_seconds()\\n",
    "print(f\"Training completed in {{training_duration:.2f}}s\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Save and results\\n",
    "model.save_pretrained(OUTPUT_DIR)\\n",
    "tokenizer.save_pretrained(OUTPUT_DIR)\\n",
    "\\n",
    "results = {{\\n",
    "    \"status\": \"completed\",\\n",
    "    \"method\": \"qlora\",\\n",
    "    \"training_duration_seconds\": training_duration,\\n",
    "    \"output_dir\": OUTPUT_DIR\\n",
    "}}\\n",
    "\\n",
    "with open(\"/content/training_results.json\", \"w\") as f:\\n",
    "    json.dump(results, f)\\n",
    "print(\"Done!\")"
   ]
  }
 ]
}""",
    "full_ft": """{
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": ["# Full Fine-Tuning {model_name}\\n", "System2ML - Full Parameter Training"]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Install dependencies\\n",
    "!pip install -q transformers datasets accelerate torch scikit-learn pandas"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "import torch\\n",
    "from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments\\n",
    "from datasets import Dataset\\n",
    "import pandas as pd\\n",
    "from datetime import datetime\\n",
    "\\n",
    "MODEL_NAME = \"{model_id}\"\\n",
    "OUTPUT_DIR = \"/content/full_model\"\\n",
    "\\n",
    "model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, torch_dtype=torch.float16)\\n",
    "tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)\\n",
    "print(\"Model loaded\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "df = pd.read_csv(\"{dataset_path}\")\\n",
    "df[\"text\"] = df.apply(lambda x: \" | \".join([f\"{{k}}: {{v}}\" for k,v in x.items()]), axis=1)\\n",
    "\\n",
    "def tokenize(examples):\\n",
    "    return tokenizer(examples[\"text\"], padding=\"max_length\", truncation=True, max_length=512)\\n",
    "\\n",
    "dataset = Dataset.from_list(df.to_dict(\"records\"))\\n",
    "tokenized = dataset.map(tokenize, batched=True)\\n",
    "print(f\"{{len(tokenized)}} samples ready\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "args = TrainingArguments(\\n",
    "    output_dir=OUTPUT_DIR,\\n",
    "    num_train_epochs={num_epochs},\\n",
    "    per_device_train_batch_size={batch_size},\\n",
    "    learning_rate={learning_rate},\\n",
    "    fp16=True,\\n",
    "    save_steps=50,\\n",
    ")\\n",
    "\\n",
    "trainer = Trainer(model=model, args=args, train_data=tokenized)\\n",
    "start = datetime.now()\\n",
    "trainer.train()\\n",
    "duration = (datetime.now() - start).total_seconds()\\n",
    "print(f\"Training: {{duration}}s\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "model.save_pretrained(OUTPUT_DIR)\\n",
    "results = {{\"status\": \"completed\", \"duration\": duration}}\\n",
    "import json\\n",
    "with open(\"/content/results.json\", \"w\") as f:\\n",
    "    json.dump(results, f)\\n",
    "print(\"Complete!\")"
   ]
  }
 ]
}""",
}


class ColabTrainingService:
    """Manages Colab training jobs"""

    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self._ai_generator = None

    def _get_ai_generator(self):
        """Lazy-load AI generator."""
        if self._ai_generator is None:
            from agent.notebook.ai_generator import get_ai_generator

            self._ai_generator = get_ai_generator()
        return self._ai_generator

    def create_notebook(
        self, config: Dict[str, Any], use_ai: bool = True, prefer_local: bool = False
    ) -> str:
        """Generate a Colab notebook JSON.
        If ``use_ai`` is true, we first attempt AI-generated notebooks via the
        AINotebookGenerator (OpenRouter → Groq → Ollama).
        If AI generation fails or ``use_ai`` is false, we fall back to the
        built-in hard-coded templates in ``COLAB_NOTEBOOK_TEMPLATE``.
        The chosen generation method is stored in ``config["_generation_method"]``.
        """
        from agent.notebook.generator import NotebookGenerator

        ai_notebook_json: str = ""
        generation_method: str = "template"

        if use_ai:
            try:
                ai_gen = self._get_ai_generator()
                ai_notebook_json, generation_method = ai_gen.generate_notebook(
                    config=config, prefer_local=prefer_local
                )
                logger.info(
                    f"AI generation result: method={generation_method}, has_content={bool(ai_notebook_json)}"
                )
            except Exception as e:
                logger.error(f"AI generation error: {e}")
                generation_method = "error"

        if generation_method != "error" and ai_notebook_json:
            generator = NotebookGenerator()
            notebook_json = generator.create_notebook(
                config=config, ai_generated=True, ai_response=ai_notebook_json
            )
        else:
            method_key = config.get("method", "lora").lower()
            template_str = COLAB_NOTEBOOK_TEMPLATE.get(method_key)
            if not template_str:
                raise ValueError(f"No notebook template for method '{method_key}'")

            model_name = config.get("model_name", config.get("model_id", "unknown"))
            filled = template_str.format(
                model_name=model_name,
                model_id=config.get("model_id", ""),
                dataset_path=config.get("dataset_path", "dataset.csv"),
                max_budget=config.get("max_budget", 5),
                num_epochs=config.get("num_epochs", 3),
                batch_size=config.get("batch_size", 4),
                learning_rate=config.get("learning_rate", 2e-4),
            )
            try:
                json.loads(filled)
            except Exception as e:
                logger.error(f"Template rendering produced invalid JSON: {e}")
                raise
            notebook_json = filled

        config["_generation_method"] = generation_method
        return notebook_json

    def create_job(self, config: Dict[str, Any]) -> str:
        """Create a new training job"""
        job_id = f"job_{uuid.uuid4().hex[:8]}"

        job = {
            "id": job_id,
            "status": "pending",
            "config": config,
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "completed_at": None,
            "results": None,
            "notebook_url": None,
            "colab_link": None,
            "logs": [],
            "error": None,
        }

        self.jobs[job_id] = job
        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status"""
        return self.jobs.get(job_id)

    def update_job_status(
        self, job_id: str, status: str, results: Any = None, error: Optional[str] = None
    ):
        """Update job status"""
        if job_id in self.jobs:
            self.jobs[job_id]["status"] = status
            if status == "running" and not self.jobs[job_id]["started_at"]:
                self.jobs[job_id]["started_at"] = datetime.utcnow().isoformat()
            if status in ["completed", "failed"]:
                self.jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
            if results:
                self.jobs[job_id]["results"] = results
            if error:
                self.jobs[job_id]["error"] = error

    def list_jobs(self) -> List[Dict[str, Any]]:
        """List all jobs"""
        return list(self.jobs.values())


# Global service instance
colab_service = ColabTrainingService()


def create_training_job(
    dataset_profile: Dict[str, Any], training_target: Dict[str, Any], constraints: Dict[str, Any]
) -> Dict[str, Any]:
    """Create a new Colab training job"""

    # Map model names to HuggingFace IDs
    model_map = {
        "llama-3.1-8b": "meta-llama/Llama-3.1-8B-Instruct",
        "llama-3.1-70b": "meta-llama/Llama-3.1-70B-Instruct",
        "mistral-7b": "mistralai/Mistral-7B-Instruct-v0.3",
        "mixtral-8x7b": "mistralai/Mixtral-8x7B-Instruct-v0.3",
        "qwen-14b": "Qwen/Qwen2.5-14B-Instruct",
        "phi-3.5": "microsoft/Phi-3.5-mini-instruct",
    }

    model_id = model_map.get(training_target.get("base_model", "llama-3.1-8b"))

    config = {
        "model_id": model_id,
        "model_name": training_target.get("base_model", "Llama 3.1 8B"),
        "method": training_target.get("method", "lora"),
        "dataset_name": dataset_profile.get("name", "dataset"),
        "dataset_rows": dataset_profile.get("rows", 0),
        "max_budget": training_target.get("max_budget_usd", 5),
        "num_epochs": 3,
        "batch_size": 4 if training_target.get("method") != "full_ft" else 2,
        "learning_rate": 2e-4,
        "max_cost": constraints.get("max_cost_usd", 10),
        "max_carbon": constraints.get("max_carbon_kg", 1.0),
    }

    # Create job
    job_id = colab_service.create_job(config)

    # Generate notebook
    notebook_json = colab_service.create_notebook(config)

    # For demo purposes - in production this would actually create a Colab instance
    job = colab_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=500, detail="Job not found after creation")
    job["notebook_json"] = notebook_json
    job["colab_link"] = f"https://colab.research.google.com/#create=true"
    job["status"] = "ready"

    return {
        "job_id": job_id,
        "status": "ready",
        "notebook_json": notebook_json,
        "colab_link": job["colab_link"],
        "config": config,
        "message": "Training job created. Open Colab link to execute.",
    }


def get_training_job(job_id: str) -> Dict[str, Any]:
    """Get job status"""
    job = colab_service.get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    return job


def get_colab_service() -> ColabTrainingService:
    """Get the singleton ColabTrainingService instance"""
    return colab_service
