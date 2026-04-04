# -*- coding: utf-8 -*-
"""Notebook generation utilities for the Colab training service."""

from __future__ import annotations

import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

logger = logging.getLogger(__name__)

HAS_NBFORMAT = False
HAS_JINJA2 = False

try:
    import nbformat
    from nbformat import NotebookNode, v4

    HAS_NBFORMAT = True
except ImportError:
    nbformat = None
    NotebookNode = None
    v4 = None

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape

    HAS_JINJA2 = True
except ImportError:
    Environment = None
    FileSystemLoader = None
    select_autoescape = None


_TEMPLATE_DIR = Path(__file__).parent / "templates"
_TEMPLATE_ENV = None

if HAS_JINJA2 and _TEMPLATE_DIR.exists():
    _TEMPLATE_ENV = Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=select_autoescape(["md", "py", "json"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def _render_template(name: str, context: Mapping[str, Any] = {}) -> str:
    """Render a Jinja2 template if available, otherwise return empty string."""
    if _TEMPLATE_ENV is None:
        return ""
    try:
        tmpl = _TEMPLATE_ENV.get_template(name)
        return tmpl.render(**context)
    except Exception as e:
        logger.warning(f"Template {name} not found: {e}")
        return ""


class NotebookGenerator:
    """
    Build a fully-valid Jupyter notebook for Google Colab or any Jupyter environment.

    Uses nbformat for schema-valid notebook generation.
    Supports both AI-generated and template-based notebook creation.
    """

    def __init__(
        self,
        *,
        kernel_name: str = "python3",
        language_version: str = "3.10",
        metadata: Mapping[str, Any] | None = None,
    ) -> None:
        self.kernel_name = kernel_name
        self.language_version = language_version
        self.base_metadata = {
            "kernelspec": {
                "name": self.kernel_name,
                "display_name": "Python 3",
                "language": "python",
            },
            "language_info": {
                "name": "python",
                "version": self.language_version,
                "mimetype": "text/x-python",
                "codemirror_mode": {"name": "ipython", "version": 3},
                "pygments_lexer": "ipython3",
                "nbconvert_exporter": "python",
            },
        }
        if metadata:
            self.base_metadata.update(metadata)

    def create_notebook(
        self,
        config: Mapping[str, Any],
        ai_generated: bool = True,
        ai_response: Optional[str] = None,
    ) -> str:
        """
        Build a notebook from a training configuration dict.

        Parameters
        ----------
        config: Mapping[str, Any]
            Training configuration (model_id, method, dataset, etc.)
        ai_generated: bool
            If True and ai_response provided, use AI-generated notebook
        ai_response: Optional[str]
            JSON string from AI service to use as notebook content

        Returns
        -------
        str
            A JSON string that can be written to .ipynb
        """
        if not HAS_NBFORMAT:
            raise RuntimeError("nbformat is required. Install with: pip install nbformat")

        self._validate_config(config)

        nb = v4.new_notebook(metadata=self.base_metadata)

        if ai_generated and ai_response:
            try:
                # Clean up AI response if it's wrapped in markdown
                cleaned_response = ai_response.strip()
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                cleaned_response = cleaned_response.strip()

                ai_nb = json.loads(cleaned_response)
                
                # Support both full notebook and just cells list
                if isinstance(ai_nb, list):
                    cells_data = ai_nb
                elif isinstance(ai_nb, dict):
                    cells_data = ai_nb.get("cells", [])
                    # Merge metadata if AI provided it
                    if "metadata" in ai_nb:
                        self.base_metadata.update(ai_nb["metadata"])
                else:
                    raise ValueError("AI response is not a valid notebook format (dict or list)")

                if cells_data:
                    nb.cells = []
                    for cell in cells_data:
                        ctype = cell.get("cell_type", "code")
                        source = cell.get("source", "")
                        if ctype == "markdown":
                            nb.cells.append(v4.new_markdown_cell(source=source))
                        else:
                            nb.cells.append(v4.new_code_cell(source=source))
                else:
                    raise ValueError("No cells found in AI response")

            except (json.JSONDecodeError, ValueError, KeyError) as e:
                logger.warning(f"AI response parsing failed, using enhanced template: {e}")
                nb.cells.extend(self._build_header_cell(config))
                nb.cells.extend(self._build_installation_cells(config))
                nb.cells.extend(self._build_data_preparation_cells(config))
                nb.cells.extend(self._build_training_cells(config))
                nb.cells.extend(self._build_postprocessing_cells(config))
        else:
            nb.cells.extend(self._build_header_cell(config))
            nb.cells.extend(self._build_installation_cells(config))
            nb.cells.extend(self._build_data_preparation_cells(config))
            nb.cells.extend(self._build_training_cells(config))
            nb.cells.extend(self._build_postprocessing_cells(config))

        try:
            nbformat.validate(nb)
        except Exception as e:
            logger.error(f"Notebook validation failed: {e}")

        return json.dumps(nb, indent=2, ensure_ascii=False)

    def _validate_config(self, cfg: Mapping[str, Any]) -> None:
        """Validate required config keys."""
        required = {"model_id", "method"}
        missing = required - cfg.keys()
        if missing:
            raise ValueError(f"Missing required notebook config keys: {sorted(missing)}")

    def _build_header_cell(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create a professional markdown header cell."""
        model_name = cfg.get("model_name", cfg.get("model_id", "Untitled"))
        method = cfg.get("method", "lora").upper()
        unsloth_note = " 🚀 (Unsloth Optimized)" if cfg.get("use_unsloth") else ""

        header = f"""# 🚀 Fine-Tuning {model_name} with {method}{unsloth_note}
*Generated by **System2ML** — The AI Pipeline Design Platform*
*Date: {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}*

---

## 📋 Overview
This notebook implements a production-ready fine-tuning pipeline for `{cfg.get("model_id")}` using the `{method}` method.

### ⚙️ Configuration
| Parameter | Value |
| :--- | :--- |
| **Base Model** | `{cfg.get("model_id")}` |
| **Training Method** | `{method}` |
| **Dataset** | `{cfg.get("dataset_name", "dataset.csv")}` |
| **Epochs** | `{cfg.get("num_epochs", 3)}` |
| **Batch Size** | `{cfg.get("batch_size", 4)}` |
| **Learning Rate** | `{cfg.get("learning_rate", 2e-4)}` |

### 🛠️ Quick Steps
1. **Runtime** → **Change runtime type** → **T4 GPU** (Standard Colab)
2. **Upload** your dataset when prompted
3. **Run All** cells (`Ctrl + F9`)
"""
        return [v4.new_markdown_cell(source=header)]

    def _build_installation_cells(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create installation cell with optimized dependencies."""
        use_unsloth = cfg.get("use_unsloth", any(m in cfg.get("model_id", "").lower() for m in ["llama", "mistral", "gemma", "phi"]))
        
        if use_unsloth:
            install_code = """# Install Unsloth & Dependencies (2x-4x faster, 70% less memory)
try:
    import unsloth
    print("✅ Unsloth already installed")
except ImportError:
    print("📦 Installing Unsloth and dependencies...")
    !pip install -q "unsloth @ https://github.com/unslothai/unsloth/releases/download/v2024.11.06/unsloth-2024.11.06-py3-none-any.whl"
    !pip install -q --no-deps "xformers<0.0.29" "trl<0.13.0" peft accelerate bitsandbytes
    print("✅ Installation complete")

import torch
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU found!'}")"""
        else:
            install_code = """# Install standard HuggingFace dependencies
print("📦 Installing dependencies...")
!pip install -q -U transformers datasets peft accelerate bitsandbytes trl
!pip install -q matplotlib seaborn pandas tqdm
print("✅ Installation complete")

import torch
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU found!'}")"""

        return [v4.new_code_cell(source=install_code)]

    def _build_data_preparation_cells(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create data preparation cells with profiling and visualization."""
        dataset_path = cfg.get("dataset_path", "dataset.csv")
        
        code = f'''# 📥 Data Loading & Profiling
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from google.colab import files
import os

# Upload dataset if not present
if not os.path.exists("{dataset_path}"):
    print("Please upload your dataset file ({dataset_path}):")
    uploaded = files.upload()
    for fn in uploaded.keys():
        if fn.endswith('.csv'):
            os.rename(fn, "{dataset_path}")
            break

df = pd.read_csv("{dataset_path}")
print(f"\\n✅ Loaded {{len(df)}} rows from {dataset_path}")

# Quick Data Profile
display(df.head())
print("\\n--- Statistics ---")
display(df.describe(include='all'))

# Missing values check
if df.isnull().values.any():
    print("\\n⚠️ Warning: Missing values detected!")
    display(df.isnull().sum())

# Visualization of label distribution (if tabular)
label_candidates = ['label', 'target', 'y', 'class', 'output']
label_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])

plt.figure(figsize=(10, 5))
sns.countplot(data=df, x=label_col)
plt.title(f"Distribution of '{{label_col}}'")
plt.xticks(rotation=45)
plt.show()
'''
        return [v4.new_code_cell(source=code)]

    def _build_training_cells(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create comprehensive training cells."""
        model_id = cfg.get("model_id", "meta-llama/Meta-Llama-3.1-8B-Instruct")
        method = cfg.get("method", "lora").lower()
        use_unsloth = cfg.get("use_unsloth", any(m in model_id.lower() for m in ["llama", "mistral", "gemma", "phi"]))
        epochs = cfg.get("num_epochs", 3)
        batch = cfg.get("batch_size", 4)
        lr = cfg.get("learning_rate", 2e-4)

        if use_unsloth:
            code = f'''# 🧠 Model Setup (Unsloth Optimized)
from unsloth import FastLanguageModel
import torch

max_seq_length = {cfg.get("max_seq_length", 2048)}
dtype = None # None for auto detection. Float16 for Tesla T4, V100, Bfloat16 for Ampere+
load_in_4bit = {method == "qlora"}

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "{model_id}",
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

model = FastLanguageModel.get_peft_model(
    model,
    r = {cfg.get("lora_r", 16)},
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj",],
    lora_alpha = {cfg.get("lora_alpha", 32)},
    lora_dropout = 0, # Optimized to 0 for Unsloth
    bias = "none",
    use_gradient_checkpointing = "unsloth", # 4x longer contexts
    random_state = 3407,
)

print("✅ Model loaded and adapters added!")
model.print_trainable_parameters()'''
        else:
            qbit = 4 if method == "qlora" else 8
            code = f'''# 🧠 Model Setup (Standard HF)
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
import torch

model_id = "{model_id}"

bnb_config = BitsAndBytesConfig(
    load_in_{qbit}bit=True,
    bnb_{qbit}bit_quant_type="nf4",
    bnb_{qbit}bit_compute_dtype=torch.float16,
    bnb_{qbit}bit_use_double_quant=True,
) if {method == "qlora"} else None

tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True
)

model = prepare_model_for_kbit_training(model)

peft_config = LoraConfig(
    r={cfg.get("lora_r", 16)},
    lora_alpha={cfg.get("lora_alpha", 32)},
    target_modules=["q_proj", "v_proj"],
    lora_dropout={cfg.get("lora_dropout", 0.05)},
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

model = get_peft_model(model, peft_config)
print("✅ Model loaded and PEFT adapters added!")
model.print_trainable_parameters()'''

        # Training logic
        trainer_code = f'''# 🚀 Training Execution
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import Dataset

# Convert DataFrame to HF Dataset
# (Note: Assumes 'text' column for SFT, you may need to adjust this)
if 'text' not in df.columns:
    label_candidates = ['label', 'target', 'y', 'class', 'output']
    label_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])
    df['text'] = df.apply(lambda x: f"Input: {{', '.join([f'{{k}}: {{v}}' for k,v in x.items() if k != label_col])}} Output: {{x[label_col]}}", axis=1)

dataset = Dataset.from_pandas(df[['text']])

training_args = TrainingArguments(
    per_device_train_batch_size = {batch},
    gradient_accumulation_steps = 4,
    warmup_steps = 5,
    max_steps = -1, # Set to -1 for full epochs
    num_train_epochs = {epochs},
    learning_rate = {lr},
    fp16 = not torch.cuda.is_bf16_supported(),
    bf16 = torch.cuda.is_bf16_supported(),
    logging_steps = 1,
    optim = "adamw_8bit",
    weight_decay = 0.01,
    lr_scheduler_type = "linear",
    seed = 3407,
    output_dir = "outputs",
    report_to = "none", # Change to "wandb" for logging
)

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = {cfg.get("max_seq_length", 2048)},
    dataset_num_proc = 2,
    args = training_args,
)

print("🚀 Starting training...")
trainer_stats = trainer.train()
print(f"✅ Training finished! Total time: {{trainer_stats.metrics['train_runtime']:.2f}}s")
'''
        return [v4.new_code_cell(source=code), v4.new_code_cell(source=trainer_code)]

    def _build_postprocessing_cells(self, cfg: Mapping[str, Any]) -> List[NotebookNode]:
        """Create post-processing, inference and export cells."""
        inference_code = """# 🔍 Quick Inference Test
from transformers import pipeline

print("Running sample inference...")
prompt = "The capital of France is" # Replace with your sample prompt
inputs = tokenizer([prompt], return_tensors = "pt").to("cuda")

outputs = model.generate(**inputs, max_new_tokens = 64)
response = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
print(f"\\nPrompt: {prompt}\\nResponse: {response}")
"""

        export_code = """# 💾 Export & Download
OUTPUT_DIR = "finetuned_adapter"
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

# Zip for download
import shutil
shutil.make_archive("adapter", 'zip', OUTPUT_DIR)
print(f"✅ Model saved and zipped as adapter.zip")

from google.colab import files
files.download("adapter.zip")
"""

        return [v4.new_markdown_cell(source="## 🧪 5. Testing & Export"),
                v4.new_code_cell(source=inference_code),
                v4.new_code_cell(source=export_code)]



def validate_notebook(notebook_json: str) -> tuple[bool, Optional[str]]:
    """Validate notebook JSON string."""
    if not HAS_NBFORMAT:
        return False, "nbformat not installed"

    try:
        nb = json.loads(notebook_json)
        nbformat.validate(nb)
        return True, None
    except Exception as e:
        return False, str(e)


def validate_config(config: dict) -> tuple[bool, Optional[str]]:
    """Validate training config for notebook generation."""
    required = {"model_id", "method"}
    missing = required - config.keys()
    if missing:
        return False, f"Missing keys: {missing}"
    return True, None
