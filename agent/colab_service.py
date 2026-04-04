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

logger = logging.getLogger(__name__)

# Colab Notebook Templates for different training methods
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
        self, config: Dict[str, Any], use_ai: bool = True, prefer_local: bool = True
    ) -> str:
        """Generate Colab notebook JSON using AI or template"""
        from agent.notebook.generator import NotebookGenerator

        ai_notebook_json = ""
        generation_method = "template"

        # Try AI generation if enabled
        if use_ai:
            try:
                ai_gen = self._get_ai_generator()
                ai_notebook_json, generation_method = ai_gen.generate_notebook(
                    config=config,
                    prefer_local=prefer_local,
                )
                logger.info(
                    f"AI generation result: method={generation_method}, has_content={bool(ai_notebook_json)}"
                )
            except Exception as e:
                logger.error(f"AI generation error: {e}")
                generation_method = "error"

        # Generate using NotebookGenerator (handles both AI response and template fallback)
        try:
            generator = NotebookGenerator()
            notebook_json = generator.create_notebook(
                config=config,
                ai_generated=bool(ai_notebook_json),
                ai_response=ai_notebook_json if generation_method != "error" else None,
            )

            # Add metadata about generation method
            if generation_method != "template":
                config["_generation_method"] = generation_method

            return notebook_json
        except Exception as e:
            logger.error(f"Notebook generation failed: {e}")
            raise

        # Generate task-specific instructions
        task_instructions = {
            "classification": "This is a classification task. The model learns to predict categorical labels.",
            "regression": "This is a regression task. The model learns to predict continuous values.",
            "instruction": "This is an instruction tuning task. The model learns to follow instructions and generate appropriate responses.",
        }
        task_desc = task_instructions.get(task_type, task_instructions["classification"])

        if method == "lora":
            method_name = "LoRA"
            cells = [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        f"# Fine-Tuning {model_name} with LoRA\n\n**System2ML Pipeline Training**\n\n### Task: {task_type.capitalize()}\n{task_desc}"
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
                        f"# Configuration\nimport os\nimport json\nimport pandas as pd\nimport torch\nfrom datetime import datetime\n\nMODEL_NAME = \"{model_id}\"\nTRAINING_METHOD = \"{method}\"\nOUTPUT_DIR = \"/content/model_adapter\"\nMAX_BUDGET_USD = {config.get('max_budget', 5)}\n\nprint(f'🤖 Model: {{MODEL_NAME}}')\nprint(f'🔧 Method: {{TRAINING_METHOD}}')\nprint(f'💰 Budget: ${{MAX_BUDGET_USD}}')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Upload Dataset\nfrom google.colab import files\nprint('📁 Please upload your CSV dataset:')\nuploaded = files.upload()\nfilename = list(uploaded.keys())[0]\ndf = pd.read_csv(filename)\nprint(f'✅ Dataset loaded: {{len(df)}} rows, {{len(df.columns)}} columns')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Prepare Data for LLM Fine-tuning (Instruction Format)\nfrom sklearn.model_selection import train_test_split\n\n# Auto-detect label column\nlabel_candidates = ['label', 'target', 'y', 'class', 'output']\nlabel_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])\nfeature_cols = [c for c in df.columns if c != label_col]\n\n# Create instruction-formatted text for LLM\ndef create_instruction_text(row):\n    features = \", \".join([f\"{{k}}={{v}}\" for k, v in row.items() if k != label_col])\n    label = row[label_col]\n    return f\"Input: {{features}}\\nOutput: {{label}}\"\n\ndf['instruction_text'] = df.apply(create_instruction_text, axis=1)\n\nX = df['instruction_text'].values\ny = df[label_col].values\nX_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)\n\nprint(f\"✅ Data prepared for LLM fine-tuning\")\nprint(f\"Example: {{X_train[0][:100]}}...\")\nprint(f\"✅ Split - Train: {{len(X_train)}}, Validation: {{len(X_val)}}\")"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        f'# Load Model with LoRA\nfrom transformers import AutoModelForCausalLM, AutoTokenizer\nfrom peft import LoraConfig, get_peft_model, TaskType\n\ntokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)\nif tokenizer.pad_token is None:\n    tokenizer.pad_token = tokenizer.eos_token\n\nmodel = AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map=\'auto\', torch_dtype=torch.float16, trust_remote_code=True)\n\n# Configure LoRA (r={lora_r}, alpha={lora_alpha}, dropout={lora_dropout})\nlora_config = LoraConfig(\n    r={lora_r},\n    lora_alpha={lora_alpha},\n    target_modules=["q_proj", "v_proj"],\n    lora_dropout={lora_dropout},\n    bias="none",\n    task_type=TaskType.CAUSAL_LM\n)\nmodel = get_peft_model(model, lora_config)\nmodel.print_trainable_parameters()'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Tokenize for LLM Training\nfrom datasets import Dataset\n\ntrain_dataset = Dataset.from_dict({{'text': list(X_train), 'label': list(y_train)}})\nval_dataset = Dataset.from_dict({{'text': list(X_val), 'label': list(y_val)}})\n\ndef tokenize_fn(examples):\n    # Tokenize text\n    tokenized = tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)\n    # Add labels for causal LM training\n    tokenized['labels'] = tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)['input_ids']\n    return tokenized\n\ntrain_dataset = train_dataset.map(tokenize_fn, batched=True, remove_columns=['text', 'label'])\nval_dataset = val_dataset.map(tokenize_fn, batched=True, remove_columns=['text', 'label'])\nprint(f'✅ Tokenized {{len(train_dataset)}} train, {{len(val_dataset)}} val samples')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        f"# Training Config\nfrom transformers import TrainingArguments, Trainer\n\ntraining_args = TrainingArguments(\n    output_dir=OUTPUT_DIR,\n    num_train_epochs={config.get('num_epochs', 3)},\n    per_device_train_batch_size={config.get('batch_size', 4)},\n    learning_rate={config.get('learning_rate', 2e-4)},\n    fp16=True,\n    logging_steps=10,\n    eval_strategy='epoch',\n    save_strategy='epoch',\n    load_best_model_at_end=True,\n    report_to='none'\n)\n\ntrainer = Trainer(model=model, args=training_args, train_dataset=train_dataset, eval_dataset=val_dataset)\nprint('✅ Training ready!')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Train\nimport time\nstart_time = time.time()\nprint('🚀 Starting training...')\n\ntrainer.train()\n\nelapsed = time.time() - start_time\nprint(f'\\n✅ Training complete! Time: {{elapsed/60:.2f}} minutes')"
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
                        "## 🎉 Training Complete!\nYour fine-tuned model is ready. Extract model.zip and use it for inference."
                    ],
                },
            ]
        elif method == "qlora":
            method_name = "QLoRA"
            lora_r_qlora = config.get("lora_r", 8)
            lora_alpha_qlora = config.get("lora_alpha", 16)
            cells = [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        f"# QLoRA Fine-Tuning {model_name}\n\n**System2ML Pipeline Training** (4-bit Quantized)\n\n### Task: {task_type.capitalize()}\n{task_desc}\n\nQLoRA uses 4-bit quantization for memory-efficient training."
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
                        f"# Configuration\nimport os\nimport json\nimport pandas as pd\nimport torch\nfrom datetime import datetime\n\nMODEL_NAME = \"{model_id}\"\nTRAINING_METHOD = \"qlora\"\nOUTPUT_DIR = \"/content/model_adapter\"\nMAX_BUDGET_USD = {config.get('max_budget', 5)}\n\nprint(f'🤖 Model: {{MODEL_NAME}}')\nprint(f'🔧 Method: {{TRAINING_METHOD}}')\nprint(f'💰 Budget: ${{MAX_BUDGET_USD}}')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Load Model with QLoRA (4-bit)\nfrom transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\nfrom peft import LoraConfig, get_peft_model, TaskType\n\nbnb_config = BitsAndBytesConfig(\n    load_in_4bit=True,\n    bnb_4bit_quant_type='nf4',\n    bnb_4bit_compute_dtype=torch.float16,\n    bnb_4bit_use_double_quant=True\n)\n\nmodel = AutoModelForCausalLM.from_pretrained(MODEL_NAME, quantization_config=bnb_config, device_map='auto', trust_remote_code=True)\ntokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)\nif tokenizer.pad_token is None:\n    tokenizer.pad_token = tokenizer.eos_token\n\nmodel.gradient_checkpointing_enable()\nprint('✅ Model loaded with 4-bit QLoRA')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Upload Dataset\nfrom google.colab import files\nprint('📁 Please upload your CSV dataset:')\nuploaded = files.upload()\nfilename = list(uploaded.keys())[0]\ndf = pd.read_csv(filename)\nprint(f'✅ Dataset loaded: {{len(df)}} rows, {{len(df.columns)}} columns')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Prepare Data for LLM Fine-tuning (Instruction Format)\nfrom sklearn.model_selection import train_test_split\n\n# Auto-detect label column\nlabel_candidates = ['label', 'target', 'y', 'class', 'output']\nlabel_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])\nfeature_cols = [c for c in df.columns if c != label_col]\n\n# Create instruction-formatted text for LLM\ndef create_instruction_text(row):\n    features = \", \".join([f\"{{k}}={{v}}\" for k, v in row.items() if k != label_col])\n    label = row[label_col]\n    return f\"Input: {{features}}\\nOutput: {{label}}\"\n\ndf['instruction_text'] = df.apply(create_instruction_text, axis=1)\n\nX = df['instruction_text'].values\ny = df[label_col].values\nX_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)\n\nprint(f\"✅ Data prepared for LLM fine-tuning\")\nprint(f\"Example: {{X_train[0][:100]}}...\")\nprint(f\"✅ Split - Train: {{len(X_train)}}, Validation: {{len(X_val)}}\")"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        f'# Configure LoRA (r={lora_r_qlora}, alpha={lora_alpha_qlora})\nlora_config = LoraConfig(\n    r={lora_r_qlora},\n    lora_alpha={lora_alpha_qlora},\n    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],\n    lora_dropout=0.1,\n    bias="none",\n    task_type=TaskType.CAUSAL_LM\n)\nmodel = get_peft_model(model, lora_config)\nmodel.print_trainable_parameters()'
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Tokenize for LLM Training\nfrom datasets import Dataset\n\ntrain_dataset = Dataset.from_dict({{'text': list(X_train), 'label': list(y_train)}})\nval_dataset = Dataset.from_dict({{'text': list(X_val), 'label': list(y_val)}})\n\ndef tokenize_fn(examples):\n    # Tokenize text\n    tokenized = tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)\n    # Add labels for causal LM training\n    tokenized['labels'] = tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)['input_ids']\n    return tokenized\n\ntrain_dataset = train_dataset.map(tokenize_fn, batched=True, remove_columns=['text', 'label'])\nval_dataset = val_dataset.map(tokenize_fn, batched=True, remove_columns=['text', 'label'])\nprint(f'✅ Tokenized {{len(train_dataset)}} train, {{len(val_dataset)}} val samples')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        f"# Training Config\nfrom transformers import TrainingArguments, Trainer\n\ntraining_args = TrainingArguments(\n    output_dir=OUTPUT_DIR,\n    num_train_epochs={config.get('num_epochs', 3)},\n    per_device_train_batch_size={config.get('batch_size', 4)},\n    learning_rate={config.get('learning_rate', 2e-4)},\n    fp16=True,\n    optim='paged_adamw_32bit',\n    logging_steps=10,\n    eval_strategy='epoch',\n    save_strategy='epoch',\n    load_best_model_at_end=True,\n    report_to='none'\n)\n\ntrainer = Trainer(model=model, args=training_args, train_dataset=train_dataset, eval_dataset=val_dataset)\nprint('✅ Training ready!')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Train\nimport time\nstart_time = time.time()\nprint('🚀 Starting training...')\n\ntrainer.train()\n\nelapsed = time.time() - start_time\nprint(f'\\n✅ Training complete! Time: {{elapsed/60:.2f}} minutes')"
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
                        "## 🎉 Training Complete!\nYour fine-tuned model is ready. Extract model.zip and use it for inference."
                    ],
                },
            ]
        else:  # full_ft
            method_name = "Full Fine-Tuning"
            cells = [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        f"# Full Fine-Tuning {model_name}\n\n**System2ML Pipeline Training**\n\n### Task: {task_type.capitalize()}\n{task_desc}\n\nFull fine-tuning updates all model parameters (requires more memory)."
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Install Dependencies\n!pip install -q transformers datasets accelerate torch\n!pip install -q scikit-learn pandas numpy\nprint('✅ Dependencies installed!')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        f"# Configuration\nimport os\nimport json\nimport pandas as pd\nimport torch\nfrom datetime import datetime\n\nMODEL_NAME = \"{model_id}\"\nTRAINING_METHOD = \"full_ft\"\nOUTPUT_DIR = \"/content/model_adapter\"\nMAX_BUDGET_USD = {config.get('max_budget', 5)}\n\nprint(f'🤖 Model: {{MODEL_NAME}}')\nprint(f'🔧 Method: {{TRAINING_METHOD}}')\nprint(f'💰 Budget: ${{MAX_BUDGET_USD}}')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Upload Dataset\nfrom google.colab import files\nprint('📁 Please upload your CSV dataset:')\nuploaded = files.upload()\nfilename = list(uploaded.keys())[0]\ndf = pd.read_csv(filename)\nprint(f'✅ Dataset loaded: {{len(df)}} rows, {{len(df.columns)}} columns')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Prepare Data for LLM Fine-tuning (Instruction Format)\nfrom sklearn.model_selection import train_test_split\n\n# Auto-detect label column\nlabel_candidates = ['label', 'target', 'y', 'class', 'output']\nlabel_col = next((c for c in df.columns if c.lower() in label_candidates), df.columns[-1])\nfeature_cols = [c for c in df.columns if c != label_col]\n\n# Create instruction-formatted text for LLM\ndef create_instruction_text(row):\n    features = \", \".join([f\"{{k}}={{v}}\" for k, v in row.items() if k != label_col])\n    label = row[label_col]\n    return f\"Input: {{features}}\\nOutput: {{label}}\"\n\ndf['instruction_text'] = df.apply(create_instruction_text, axis=1)\n\nX = df['instruction_text'].values\ny = df[label_col].values\nX_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)\n\nprint(f\"✅ Data prepared for LLM fine-tuning\")\nprint(f\"Example: {{X_train[0][:100]}}...\")\nprint(f\"✅ Split - Train: {{len(X_train)}}, Validation: {{len(X_val)}}\")"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Load Base Model\nfrom transformers import AutoModelForCausalLM, AutoTokenizer\n\nmodel = AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map='auto', torch_dtype=torch.float16, trust_remote_code=True)\ntokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)\nif tokenizer.pad_token is None:\n    tokenizer.pad_token = tokenizer.eos_token\nprint('✅ Model loaded')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Tokenize for LLM Training\nfrom datasets import Dataset\n\ntrain_dataset = Dataset.from_dict({{'text': list(X_train), 'label': list(y_train)}})\nval_dataset = Dataset.from_dict({{'text': list(X_val), 'label': list(y_val)}})\n\ndef tokenize_fn(examples):\n    # Tokenize text\n    tokenized = tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)\n    # Add labels for causal LM training\n    tokenized['labels'] = tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)['input_ids']\n    return tokenized\n\ntrain_dataset = train_dataset.map(tokenize_fn, batched=True, remove_columns=['text', 'label'])\nval_dataset = val_dataset.map(tokenize_fn, batched=True, remove_columns=['text', 'label'])\nprint(f'✅ Tokenized {{len(train_dataset)}} train, {{len(val_dataset)}} val samples')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        f"# Training Config\nfrom transformers import TrainingArguments, Trainer\n\ntraining_args = TrainingArguments(\n    output_dir=OUTPUT_DIR,\n    num_train_epochs={config.get('num_epochs', 3)},\n    per_device_train_batch_size={config.get('batch_size', 2)},\n    learning_rate={config.get('learning_rate', 2e-4)},\n    fp16=True,\n    logging_steps=10,\n    eval_strategy='epoch',\n    save_strategy='epoch',\n    load_best_model_at_end=True,\n    report_to='none'\n)\n\ntrainer = Trainer(model=model, args=training_args, train_dataset=train_dataset, eval_dataset=val_dataset)\nprint('✅ Training ready!')"
                    ],
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "# Train\nimport time\nstart_time = time.time()\nprint('🚀 Starting training...')\n\ntrainer.train()\n\nelapsed = time.time() - start_time\nprint(f'\\n✅ Training complete! Time: {{elapsed/60:.2f}} minutes')"
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
                        "## 🎉 Training Complete!\nYour fine-tuned model is ready. Extract model.zip and use it for inference."
                    ],
                },
            ]

        notebook = {
            "cells": cells,
            "metadata": {
                "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                "language_info": {"name": "python", "version": "3.10.0"},
            },
            "nbformat": 4,
            "nbformat_minor": 4,
        }

        return json.dumps(notebook, indent=2)

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

    def update_job_status(self, job_id: str, status: str, results: Any = None, error: str = None):
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
