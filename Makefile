.PHONY: help install install-prod dev lint test typecheck check build run clean

help:
	@echo "System2ML - Available Commands"
	@echo "==============================="
	@echo "make install         - Install all dependencies"
	@echo "make install-prod    - Install production dependencies"
	@echo "make dev             - Run development servers"
	@echo "make lint            - Run frontend linting"
	@echo "make test            - Run Python tests"
	@echo "make typecheck       - Run TypeScript type checking"
	@echo "make check           - Run all quality checks"
	@echo "make build           - Build frontend for production"
	@echo "make run-backend     - Run backend only"
	@echo "make clean           - Clean build artifacts"

install:
	pip install -e ".[all]"
	npm install

install-prod:
	pip install -e ".[production]"
	npm install

dev:
	npm run dev:all

lint:
	ruff check ui/ lib/ agent/ pipelines/ observability/ orchestrator/
	npm run lint

test:
	pytest tests/ -v

typecheck:
	npm run typecheck

check: lint test typecheck
	@echo "All checks passed!"

build:
	npm run build

run-backend:
	python -m uvicorn ui.api:app --reload --port 8000

clean:
	rm -rf .next
	rm -rf node_modules
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
