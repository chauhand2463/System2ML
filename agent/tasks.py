"""
Celery Tasks for System2ML
Real on-platform fine-tuning with background workers
"""

import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from celery import Celery

    HAS_CELERY = True
except ImportError:
    HAS_CELERY = False
    Celery = None

CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")

if HAS_CELERY:
    celery_app = Celery(
        "system2ml",
        broker=CELERY_BROKER_URL,
        backend=None,  # Disable result backend to avoid Windows issues
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_ignore_result=True,  # Don't store results
        task_store_errors_even_if_ignored=True,
    )


@celery_app.task(bind=True, ignore_result=True)
def run_finetuning_task(self, job_id: str, config: dict):
    """Actual fine-tuning that runs in background with progress updates."""
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        TrainingArguments,
        Trainer,
        BitsAndBytesConfig,
    )
    from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training
    from datasets import Dataset
    import pandas as pd
    import torch
    import shutil

    logger.info(f"Starting finetuning job {job_id} with config: {config}")

    model_id = config.get("model_id", "microsoft/phi-2")
    method = config.get("method", "qlora")
    dataset_path = config.get("dataset_path")
    output_dir = f"./outputs/{job_id}"

    os.makedirs(output_dir, exist_ok=True)

    logger.info("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    logger.info(f"Loading model {model_id} with method {method}...")

    if method == "qlora":
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16
        )
        model = AutoModelForCausalLM.from_pretrained(
            model_id, quantization_config=bnb_config, device_map="auto", trust_remote_code=True
        )
        model = prepare_model_for_kbit_training(model)
    else:
        model = AutoModelForCausalLM.from_pretrained(
            model_id, torch_dtype=torch.float16, device_map="auto", trust_remote_code=True
        )

    if method in ["lora", "qlora"]:
        lora_config = LoraConfig(
            r=config.get("lora_r", 16),
            lora_alpha=config.get("lora_alpha", 32),
            target_modules=["q_proj", "v_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type=TaskType.CAUSAL_LM,
        )
        model = get_peft_model(model, lora_config)

    logger.info("Preparing dataset...")
    if dataset_path and os.path.exists(dataset_path):
        df = pd.read_csv(dataset_path)
        label_candidates = ["label", "target", "y", "class", "output"]
        label_col = next((c for c in df.columns if c.lower() in label_candidates), None)

        if label_col:
            df["text"] = df.apply(
                lambda row: (
                    f"Input: {', '.join([f'{k}: {v}' for k, v in row.drop(label_col).items()])} Output: {row[label_col]}"
                ),
                axis=1,
            )
        else:
            df["text"] = df.apply(
                lambda row: " | ".join([f"{k}: {v}" for k, v in row.items()]), axis=1
            )

        def tokenize(examples):
            tokens = tokenizer(
                examples["text"],
                padding="max_length",
                truncation=True,
                max_length=config.get("max_length", 512),
            )
            tokens["labels"] = tokens["input_ids"].copy()
            return tokens

        dataset = Dataset.from_pandas(df[["text"]])
        tokenized = dataset.map(tokenize, batched=True, remove_columns=["text"])
    else:
        raise ValueError(f"Dataset not found at {dataset_path}")

    logger.info("Training model...")
    args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=config.get("num_epochs", 1),
        per_device_train_batch_size=config.get("batch_size", 1),
        learning_rate=config.get("learning_rate", 2e-4),
        fp16=torch.cuda.is_available(),
        logging_steps=1,
        save_strategy="no",
        report_to="none",
        gradient_accumulation_steps=1,
    )

    trainer = Trainer(model=model, args=args, train_dataset=tokenized)
    trainer.train()

    logger.info("Saving model...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    shutil.make_archive(output_dir, "zip", output_dir)

    result = {
        "status": "completed",
        "output_dir": output_dir,
        "job_id": job_id,
        "model_id": model_id,
        "method": method,
    }

    logger.info(f"Finetuning completed: {result}")
    return result


@celery_app.task(bind=True, ignore_result=True)
def run_classical_ml_task(self, job_id: str, config: dict):
    """Run classical ML training (sklearn) in background."""
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score, mean_squared_error
    import pandas as pd
    import joblib

    dataset_path = config.get("dataset_path")
    target_col = config.get("target_column")
    task_type = config.get("task_type", "classification")
    output_dir = config.get("output_dir", f"./outputs/{job_id}")

    os.makedirs(output_dir, exist_ok=True)

    logger.info("Loading dataset...")
    df = pd.read_csv(dataset_path)
    X = df.drop(columns=[target_col])
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    logger.info("Training model...")
    if task_type == "classification":
        model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    else:
        model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)

    model.fit(X_train, y_train)

    logger.info("Evaluating...")
    predictions = model.predict(X_test)

    if task_type == "classification":
        metrics = {
            "accuracy": accuracy_score(y_test, predictions),
            "f1": f1_score(y_test, predictions, average="weighted"),
        }
    else:
        metrics = {
            "mse": mean_squared_error(y_test, predictions),
            "rmse": float(mean_squared_error(y_test, predictions) ** 0.5),
        }

    model_path = os.path.join(output_dir, "model.joblib")
    joblib.dump(model, model_path)

    result = {
        "status": "completed",
        "metrics": metrics,
        "model_path": model_path,
        "job_id": job_id,
    }

    logger.info(f"Classical ML completed: {result}")
    return result


def start_platform_finetuning(config: dict) -> dict:
    """Submit fine-tuning task to Celery."""
    if not HAS_CELERY:
        raise ImportError("Celery not available. Install: pip install celery redis")

    job_id = f"finetune_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    task = run_finetuning_task.delay(job_id, config)

    return {"job_id": job_id, "task_id": task.id, "status": "started"}


def get_task_status(task_id: str) -> dict:
    """Get status of a background task."""
    if not HAS_CELERY:
        return {"status": "unavailable", "error": "Celery not configured"}

    return {"status": "started", "message": "Task submitted to Celery worker"}
