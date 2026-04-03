"""NLP Pipeline Module"""

from dataclasses import dataclass
from typing import Optional
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
import os

from system2ml.logger import logger


@dataclass
class NLPPipeline:
    """Base class for NLP pipelines"""

    name: str = "nlp_pipeline"
    model_type: str = "TF-IDF"
    target_column: Optional[str] = None
    vectorizer: Optional[TfidfVectorizer] = None
    model: Optional[LogisticRegression] = None

    def fit(self, df: pd.DataFrame, target: str) -> dict:
        logger.info("Fitting NLPPipeline with %d rows", len(df))
        try:
            texts = df[target].astype(str).tolist()
            labels = df[target].tolist() if target in df.columns else None

            if labels is None:
                raise ValueError(f"Target column '{target}' not found in dataframe")

            test_size = float(os.environ.get("TEST_SIZE", "0.2"))
            random_seed = int(os.environ.get("RANDOM_SEED", "42"))

            X_train, _, y_train, _ = train_test_split(
                texts, labels, test_size=test_size, random_state=random_seed
            )

            self.vectorizer = TfidfVectorizer(max_features=5000)
            X_train_vec = self.vectorizer.fit_transform(X_train)

            self.model = LogisticRegression(max_iter=1000, random_state=random_seed)
            self.model.fit(X_train_vec, y_train)

            result = {"status": "fitted", "text_rows": len(df)}
            logger.debug("Fit result: %s", result)
            return result
        except Exception:
            logger.exception("Error during NLPPipeline fit")
            raise

    def predict(self, texts: list) -> np.ndarray:
        logger.info("Predicting NLPPipeline on %d texts", len(texts))
        try:
            if self.vectorizer is None or self.model is None:
                logger.warning("Model not fitted, returning zeros")
                return np.zeros(len(texts))

            texts_vec = self.vectorizer.transform(texts)
            preds = self.model.predict(texts_vec)
            logger.debug("Predictions shape: %s", preds.shape)
            return preds
        except Exception:
            logger.exception("Error during NLPPipeline prediction")
            raise

    def evaluate(self, df: pd.DataFrame, target: str) -> dict:
        logger.info("Evaluating NLPPipeline on %d rows", len(df))
        try:
            if self.vectorizer is None or self.model is None:
                raise RuntimeError("Model not fitted. Call fit() first.")

            texts = df[target].astype(str).tolist()
            labels = df[target].tolist()

            texts_vec = self.vectorizer.transform(texts)
            preds = self.model.predict(texts_vec)

            accuracy = accuracy_score(labels, preds)
            f1 = f1_score(labels, preds, average="weighted")

            metrics = {"accuracy": round(accuracy, 4), "f1": round(f1, 4)}
            logger.debug("Evaluation metrics: %s", metrics)
            return metrics
        except Exception:
            logger.exception("Error during NLPPipeline evaluation")
            raise


NLP_MODELS = [
    "TF-IDF + LogisticRegression",
    "BERTClassifier",
    "DistilBERTClassifier",
    "RoBERTaClassifier",
]

__all__ = ["NLPPipeline", "NLP_MODELS", "FinetuneNLPPipeline"]


class FinetuneNLPPipeline(NLPPipeline):
    """Concrete finetuning pipeline using HuggingFace Transformers + PEFT.

    The pipeline loads a base model, optionally applies LoRA/QLoRA, and trains on a
    provided dataset.  It relies on the ``HFTransformersBackend`` for model
    handling.
    """

    def __init__(self, name: str = "finetune_nlp", model_type: str = "hf", **kwargs):
        super().__init__(name=name, model_type=model_type)
        self.backend = None
        self.model_obj = None
        self.config = kwargs

    def load_backend(self, backend_name: str = "hf", **load_kwargs):
        from system2ml.core import create_backend

        self.backend = create_backend(backend_name)
        self.model_obj = self.backend.load_model(**load_kwargs)
        return self.model_obj

    def fine_tune(
        self,
        dataset_path: str,
        model_id: str,
        method: str = "lora",
        quantise: bool = False,
        **train_kwargs,
    ):
        """Run fine‑tuning on a CSV dataset.

        Parameters
        ----------
        dataset_path: str
            Path to a CSV file containing ``text`` and ``label`` columns.
        model_id: str
            HuggingFace model identifier.
        method: str
            ``lora`` or ``qlora`` – determines adapter configuration.
        quantise: bool
            Whether to use 4‑bit quantisation (QLoRA).
        train_kwargs: dict
            Additional ``TrainingArguments`` fields (e.g., ``num_train_epochs``).
        """
        import pandas as pd
        from transformers import TrainingArguments
        from trl import SFTTrainer

        # Load data
        df = pd.read_csv(dataset_path)
        texts = df["text"].tolist()
        labels = df["label"].tolist()

        # Load backend and model
        self.load_backend("hf", model_id=model_id, method=method, quantise=quantise)

        # Prepare dataset for SFTTrainer – simple dict format
        train_data = [{"prompt": txt, "completion": str(lbl)} for txt, lbl in zip(texts, labels)]

        output_dir = os.environ.get("FINETUNE_OUTPUT_DIR", "./outputs/finetune")

        # Default training args
        default_args = {
            "output_dir": output_dir,
            "per_device_train_batch_size": int(os.environ.get("TRAIN_BATCH_SIZE", "4")),
            "gradient_accumulation_steps": int(os.environ.get("GRADIENT_ACCUMULATION_STEPS", "1")),
            "max_steps": -1,
            "num_train_epochs": int(os.environ.get("NUM_TRAIN_EPOCHS", "1")),
            "learning_rate": float(os.environ.get("LEARNING_RATE", "2e-4")),
            "fp16": not quantise,
            "logging_steps": int(os.environ.get("LOGGING_STEPS", "10")),
        }
        default_args.update(train_kwargs)
        training_args = TrainingArguments(**default_args)

        trainer = SFTTrainer(
            model=self.model_obj["model"],
            tokenizer=self.model_obj["tokenizer"],
            train_dataset=train_data,
            max_seq_length=int(os.environ.get("MAX_SEQ_LENGTH", "512")),
            args=training_args,
        )
        try:
            trainer.train()
        except Exception as e:
            logger.exception("Training failed: %s", e)
            return {
                "status": "failed",
                "error": str(e),
                "output_dir": output_dir + "_adapter",
            }
        # Save fine‑tuned model
        adapter_dir = output_dir + "_adapter"
        self.model_obj["model"].save_pretrained(adapter_dir)
        self.model_obj["tokenizer"].save_pretrained(adapter_dir)
        return {
            "status": "finetuned",
            "output_dir": adapter_dir,
        }
