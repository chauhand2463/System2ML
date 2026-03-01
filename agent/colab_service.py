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
    "lora": '''{
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
}''',
    
    "qlora": '''{
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
}''',
    
    "full_ft": '''{
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
}'''
}


class ColabTrainingService:
    """Manages Colab training jobs"""
    
    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
    
    def create_notebook(self, config: Dict[str, Any]) -> str:
        """Generate Colab notebook JSON"""
        import json
        
        model_id = config.get('model_id', 'meta-llama/Llama-3.1-8B-Instruct')
        method = config.get('method', 'lora')
        
        if method == 'lora':
            cells = [
                {"cell_type": "markdown", "metadata": {}, "source": [f"# Fine-Tuning {config.get('model_name', 'Model')} with LoRA\n"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["!pip install -q transformers datasets peft accelerate bitsandbytes torch\n!pip install -q scikit-learn pandas numpy"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"import os\nimport json\nimport pandas as pd\nfrom datetime import datetime\n\nMODEL_NAME = \"{model_id}\"\nTRAINING_METHOD = \"lora\"\nOUTPUT_DIR = \"/content/model_adapter\"\nMAX_BUDGET_USD = {config.get('max_budget', 5)}\n\nprint(f\"Starting training: {{MODEL_NAME}} with {{TRAINING_METHOD}}\")"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["from datasets import load_dataset\ndf = pd.read_csv('/content/dataset.csv')\nprint(f\"Dataset loaded: {{len(df)}} rows\")"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"import torch\nfrom transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer\nfrom peft import LoraConfig, get_peft_model, TaskType\n\nmodel = AutoModelForCausalLM.from_pretrained(MODEL_NAME, torch_dtype=torch.float16, device_map=\"auto\")\ntokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)\n\nlora_config = LoraConfig(r=16, lora_alpha=32, target_modules=[\"q_proj\", \"v_proj\"], lora_dropout=0.05, bias=\"none\", task_type=TaskType.CAUSAL_LM)\nmodel = get_peft_model(model, lora_config)\nmodel.print_trainable_parameters()"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["df['text'] = df.apply(lambda x: ' | '.join([f'{{k}}: {{v}}' for k,v in x.items()]), axis=1)\nfrom datasets import Dataset\ntrain_dataset = Dataset.from_list(df.to_dict('records'))\ndef tokenize(examples): return tokenizer(examples['text'], padding='max_length', truncation=True, max_length=512)\ntokenized = train_dataset.map(tokenize, batched=True)\nprint(f'Tokenized: {{len(tokenized)}} samples')"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"training_args = TrainingArguments(output_dir=OUTPUT_DIR, num_train_epochs={config.get('num_epochs', 3)}, per_device_train_batch_size={config.get('batch_size', 4)}, learning_rate={config.get('learning_rate', 2e-4)}, fp16=True, logging_steps=10, save_strategy='epoch')\ntrainer = Trainer(model=model, args=training_args, train_dataset=tokenized)\nprint('Starting training...')\nstart_time = datetime.now()"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["trainer.train()\nend_time = datetime.now()\nduration = (end_time - start_time).total_seconds()\nprint(f'Training completed in {{duration:.2f}} seconds')"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"model.save_pretrained(OUTPUT_DIR)\ntokenizer.save_pretrained(OUTPUT_DIR)\nresults = {{'status': 'completed', 'model': MODEL_NAME, 'method': TRAINING_METHOD, 'duration': duration}}\nwith open('/content/training_results.json', 'w') as f: json.dump(results, f, indent=2)\nprint('Training complete!')"]},
            ]
        elif method == 'qlora':
            cells = [
                {"cell_type": "markdown", "metadata": {}, "source": [f"# QLoRA Fine-Tuning {config.get('model_name', 'Model')}\n"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["!pip install -q transformers datasets peft accelerate bitsandbytes torch"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"import torch\nfrom transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig\nfrom peft import LoraConfig, get_peft_model, TaskType\n\nbnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype=torch.float16, bnb_4bit_use_double_quant=True)\nmodel = AutoModelForCausalLM.from_pretrained('{model_id}', quantization_config=bnb_config, device_map='auto')\ntokenizer = AutoTokenizer.from_pretrained('{model_id}')\nmodel.gradient_checkpointing_enable()\nprint('Model loaded with 4-bit QLoRA')"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["import pandas as pd\ndf = pd.read_csv('/content/dataset.csv')\ndf['text'] = df.apply(lambda x: ' | '.join([f'{{k}}: {{v}}' for k,v in x.items()]), axis=1)\nfrom datasets import Dataset\ntokenized = Dataset.from_list(df.to_dict('records'))\nprint(f'Prepared {{len(tokenized)}} samples')"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"lora_config = LoraConfig(r=8, lora_alpha=16, target_modules=['q_proj','v_proj','k_proj','o_proj'], lora_dropout=0.1, bias='none', task_type=TaskType.CAUSAL_LM)\nmodel = get_peft_model(model, lora_config)\nmodel.print_trainable_parameters()"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"from transformers import TrainingArguments, Trainer\nargs = TrainingArguments(output_dir='/content/model', num_train_epochs={config.get('num_epochs',3)}, per_device_train_batch_size={config.get('batch_size',4)}, learning_rate={config.get('learning_rate',2e-4)}, fp16=True, optim='paged_adamw_32bit')\ntrainer = Trainer(model=model, args=args, train_dataset=tokenized)\ntrainer.train()\nprint('Training done!')"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["model.save_pretrained('/content/model')\nprint('Model saved!')"]},
            ]
        else:  # full_ft
            cells = [
                {"cell_type": "markdown", "metadata": {}, "source": [f"# Full Fine-Tuning {config.get('model_name', 'Model')}\n"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["!pip install -q transformers datasets accelerate torch"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"import torch\nfrom transformers import AutoModelForCausalLM, AutoTokenizer\nmodel = AutoModelForCausalLM.from_pretrained('{model_id}', torch_dtype=torch.float16)\ntokenizer = AutoTokenizer.from_pretrained('{model_id}')\nprint('Model loaded')"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["import pandas as pd\ndf = pd.read_csv('/content/dataset.csv')\nprint(f'Loaded {{len(df)}} rows')"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [f"from transformers import TrainingArguments, Trainer\nargs = TrainingArguments(output_dir='/content/model', num_train_epochs={config.get('num_epochs',3)}, per_device_train_batch_size={config.get('batch_size',2)}, learning_rate={config.get('learning_rate',2e-4)}, fp16=True)\ntrainer = Trainer(model=model, args=args)\ntrainer.train()\nprint('Done!')"]},
                {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["model.save_pretrained('/content/model')\nprint('Saved!')"]},
            ]
        
        notebook = {"cells": cells, "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}, "language_info": {"name": "python", "version": "3.10.0"}}, "nbformat": 4, "nbformat_minor": 4}
        
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
            "error": None
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
    dataset_profile: Dict[str, Any],
    training_target: Dict[str, Any],
    constraints: Dict[str, Any]
) -> Dict[str, Any]:
    """Create a new Colab training job"""
    
    # Map model names to HuggingFace IDs
    model_map = {
        "llama-3.1-8b": "meta-llama/Llama-3.1-8B-Instruct",
        "llama-3.1-70b": "meta-llama/Llama-3.1-70B-Instruct",
        "mistral-7b": "mistralai/Mistral-7B-Instruct-v0.3",
        "mixtral-8x7b": "mistralai/Mixtral-8x7B-Instruct-v0.3",
        "qwen-14b": "Qwen/Qwen2.5-14B-Instruct",
        "phi-3.5": "microsoft/Phi-3.5-mini-instruct"
    }
    
    model_id = model_map.get(training_target.get('base_model', 'llama-3.1-8b'))
    
    config = {
        "model_id": model_id,
        "model_name": training_target.get('base_model', 'Llama 3.1 8B'),
        "method": training_target.get('method', 'lora'),
        "dataset_name": dataset_profile.get('name', 'dataset'),
        "dataset_rows": dataset_profile.get('rows', 0),
        "max_budget": training_target.get('max_budget_usd', 5),
        "num_epochs": 3,
        "batch_size": 4 if training_target.get('method') != 'full_ft' else 2,
        "learning_rate": 2e-4,
        "max_cost": constraints.get('max_cost_usd', 10),
        "max_carbon": constraints.get('max_carbon_kg', 1.0),
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
        "message": "Training job created. Open Colab link to execute."
    }


def get_training_job(job_id: str) -> Dict[str, Any]:
    """Get job status"""
    job = colab_service.get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    return job
