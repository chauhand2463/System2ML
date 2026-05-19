# Dockerfile for System2ML finetuning service
# Base image with Python 3.11 slim
FROM python:3.11-slim

# Set working directory
WORKDIR /app


RUN apt-get update && apt-get install -y --no-install-recommends git curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ARG OLLAMA=0
RUN if [ "$OLLAMA" = "1" ]; then \
    curl -fsSL https://ollama.com/install.sh | sh; \
    chmod +x /usr/local/bin/ollama; \
    echo "Ollama installed"; \
  else echo "Ollama not installed"; fi

# Copy entire project
COPY . .

# Expose any ports if needed (e.g., FastAPI API on 8000)
EXPOSE 8000

# Entrypoint runs the finetuning service (CLI entrypoint)
ENTRYPOINT ["python", "-m", "agent.finetuning_service"]
