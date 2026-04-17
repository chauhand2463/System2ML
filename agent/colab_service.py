"""
Colab Training Service for System2ML
Generates AI-powered notebooks for fine-tuning LLMs in Google Colab
"""

import os
import json
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import HTTPException


logger = logging.getLogger(__name__)


class ColabTrainingService:
    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}

    def create_notebook(
        self, config: Dict[str, Any], use_ai: bool = True, prefer_local: bool = False
    ) -> str:
        """Create a Jupyter notebook for Colab training."""
        model_id = config.get("model_id", "")
        method = config.get("method", "qlora")
        dataset_name = config.get("dataset_name", "dataset")

        logger.info(f"Creating notebook: model={model_id}, method={method}")

        # Try AI generation first
        notebook_json = None
        if use_ai:
            try:
                from agent.notebook.ai_generator import get_ai_generator

                ai_gen = get_ai_generator()
                notebook_json, _ = ai_gen.generate_notebook(
                    config=config, prefer_local=prefer_local
                )
            except Exception as e:
                logger.warning(f"AI generation failed: {e}")

        if not notebook_json:
            notebook_json = self._build_notebook(config)

        return notebook_json

    def _build_notebook(self, config: Dict[str, Any]) -> str:
        """Build notebook programmatically."""
        model_id = config.get("model_id", "meta-llama/Llama-3.1-8B-Instruct")
        model_name = config.get("model_name", model_id.split("/")[-1].replace("-Instruct", ""))
        method = config.get("method", "qlora")

        # Hyperparameters
        num_epochs = config.get("num_epochs", 3)
        batch_size = config.get("batch_size", 4)
        learning_rate = config.get("learning_rate", 2e-4)
        lora_r = config.get("lora_r", 16)
        lora_alpha = config.get("lora_alpha", 32)
        max_length = config.get("max_length", 512)

        def cell(source: str) -> Dict[str, Any]:
            return {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [source],
            }

        def markdown(source: str) -> Dict[str, Any]:
            return {"cell_type": "markdown", "metadata": {}, "source": [source]}

        cells = []

        # Header
        cells.append(
            markdown(
                f"# Fine-Tuning {model_name} with {method.upper()}\n\nSystem2ML - AI-Powered Pipeline Training"
            )
        )

        # Install
        if method == "unsloth":
            cells.append(
                cell(
                    "!pip install unsloth transformers datasets peft accelerate bitsandbytes torch"
                )
            )
        else:
            cells.append(
                cell("!pip install transformers datasets peft accelerate bitsandbytes torch")
            )

        # Upload
        cells.append(
            cell("""from google.colab import files
uploaded = files.upload()
dataset_file = list(uploaded.keys())[0]
print('Uploaded:', dataset_file)""")
        )

        # Config
        cells.append(
            cell(f"""MODEL_NAME = "{model_id}"
TRAINING_METHOD = "{method}"
DATASET_PATH = dataset_file
OUTPUT_DIR = "/content/model_adapter"
NUM_EPOCHS = {num_epochs}
BATCH_SIZE = {batch_size}
LEARNING_RATE = {learning_rate}
LORA_R = {lora_r}
LORA_ALPHA = {lora_alpha}
MAX_LENGTH = {max_length}

print('Model:', MODEL_NAME)
print('Method:', TRAINING_METHOD)
print('Dataset:', DATASET_PATH)""")
        )

        # Load data
        cells.append(
            cell("""import pandas as pd
from datasets import Dataset

df = pd.read_csv(DATASET_PATH)
print('Dataset loaded:', len(df), 'rows')
print('Columns:', list(df.columns))""")
        )

        # Create text
        cells.append(
            cell("""# Create text column for training
label_cols = ['label', 'target', 'y', 'class', 'output']
label_col = next((c for c in df.columns if c.lower() in label_cols), None)

if label_col:
    # Format: "Input: col1: val1, col2: val2 | Output: label"
    df['text'] = df.apply(lambda row: 'Input: ' + ', '.join([str(k) + ': ' + str(v) for k, v in row.drop(label_col).items()]) + ' | Output: ' + str(row[label_col]), axis=1)
    print('Label column:', label_col)
else:
    df['text'] = df.apply(lambda row: ' | '.join([str(k) + ': ' + str(v) for k, v in row.items()]), axis=1)

print('Sample text:', df['text'].iloc[0][:100])""")
        )

        # Load model based on method
        if method == "qlora":
            cells.append(
                cell("""import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, TaskType

# 4-bit quantization
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
print('Model loaded with 4-bit QLoRA')""")
            )
        elif method == "lora":
            cells.append(
                cell("""import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True,
)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
print('Model loaded')""")
            )
        else:  # unsloth
            cells.append(
                cell("""from unsloth import FastLanguageModel
import torch

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_LENGTH,
    dtype=torch.float16,
    load_in_4bit=True,
)
print('Model loaded with Unsloth')""")
            )

        # LoRA config (if not full_ft)
        if method != "full_ft":
            cells.append(
                cell("""from peft import LoraConfig, get_peft_model, TaskType

lora_config = LoraConfig(
    r=LORA_R,
    lora_alpha=LORA_ALPHA,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()""")
            )

        # Tokenize
        cells.append(
            cell("""# Tokenize
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=MAX_LENGTH,
    )

train_dataset = Dataset.from_pandas(df[["text"]])
tokenized_dataset = train_dataset.map(tokenize_function, batched=True, remove_columns=["text"])
print('Tokenized:', len(tokenized_dataset), 'samples')""")
        )

        # Training
        cells.append(
            cell("""from transformers import TrainingArguments, Trainer

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=NUM_EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    learning_rate=LEARNING_RATE,
    fp16=True,
    logging_steps=10,
    save_strategy="epoch",
    report_to="none",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
)
print('Starting training...')
trainer.train()
print('Training completed!')""")
        )

        # Save
        cells.append(
            cell("""# Save model
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print('Model saved to:', OUTPUT_DIR)

# Create ZIP for download
import shutil
shutil.make_archive('/content/model_adapter', 'zip', '/content/model_adapter')
print('ZIP created for download')""")
        )

        # Results
        cells.append(
            cell("""# Results summary
results = {
    'status': 'completed',
    'model': MODEL_NAME,
    'method': TRAINING_METHOD,
    'num_samples': len(tokenized_dataset),
    'output_dir': OUTPUT_DIR,
}
print('Training Results:')
for k, v in results.items():
    print(' ', k, ':', v)""")
        )

        # Test inference
        cells.append(
            cell("""# Test inference
test_text = df['text'].iloc[0]
print('Testing with:', test_text[:100], '...')
print('Note: For production use, merge LoRA adapters first')""")
        )

        # Build notebook
        notebook = {
            "cells": cells,
            "metadata": {
                "colab": {"accelerator": "GPU", "gpuType": "T4", "provenance": []},
                "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            },
            "nbformat": 4,
            "nbformat_minor": 0,
        }

        return json.dumps(notebook)

    def create_job(self, config: Dict[str, Any]) -> str:
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        self.jobs[job_id] = {
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
        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self.jobs.get(job_id)

    def update_job_status(
        self, job_id: str, status: str, results: Any = None, error: Optional[str] = None
    ):
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


colab_service = ColabTrainingService()


def create_training_job(
    dataset_profile: Dict[str, Any], training_target: Dict[str, Any], constraints: Dict[str, Any]
) -> Dict[str, Any]:
    model_map = {
        "llama-3.1-8b": "meta-llama/Llama-3.1-8B-Instruct",
        "llama-3.1-70b": "meta-llama/Llama-3.1-70B-Instruct",
        "mistral-7b": "mistralai/Mistral-7B-Instruct-v0.3",
        "phi-2": "microsoft/phi-2",
        "phi-3.5": "microsoft/Phi-3.5-mini-instruct",
    }

    model_id = model_map.get(training_target.get("base_model", "llama-3.1-8b"))

    config = {
        "model_id": model_id,
        "model_name": training_target.get("base_model", "Llama 3.1 8B"),
        "method": training_target.get("method", "qlora"),
        "dataset": dataset_profile,
        "dataset_name": dataset_profile.get("file_name", "dataset.csv"),
        "num_epochs": training_target.get("num_epochs", 3),
        "batch_size": training_target.get("batch_size", 4),
        "learning_rate": training_target.get("learning_rate", 2e-4),
    }

    job_id = colab_service.create_job(config)
    notebook_json = colab_service.create_notebook(config, use_ai=True)

    job = colab_service.get_job(job_id)
    job["notebook_json"] = notebook_json
    job["colab_link"] = "https://colab.research.google.com/#create=true"
    job["status"] = "ready"

    return {
        "job_id": job_id,
        "status": "ready",
        "notebook_json": notebook_json,
        "colab_link": job["colab_link"],
        "config": config,
        "message": "Training notebook ready. Open Colab link to execute.",
    }


def get_training_job(job_id: str) -> Dict[str, Any]:
    job = colab_service.get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    return job


def get_colab_service() -> ColabTrainingService:
    return colab_service
