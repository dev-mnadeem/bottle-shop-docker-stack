# The single documented entry point for every task in this repo — there is one
# way to start the stack, and it is `make up`.
SHELL := /bin/bash
.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help install dev api web test lint typecheck check up down logs ps migrate seed load-test clean

help: ## List the available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install every workspace dependency
	pnpm install

api: ## Run the backend in watch mode (needs Postgres and Redis)
	pnpm --filter backend dev

web: ## Run the Next.js dev server
	pnpm --filter frontend dev

test: ## Run the backend test suite
	pnpm --filter backend test

lint: ## Lint every workspace
	pnpm -r lint

typecheck: ## Typecheck every workspace
	pnpm -r typecheck

check: lint typecheck test ## Everything CI runs

migrate: ## Apply pending database migrations
	pnpm --filter backend migration:run

seed: ## Load the sample catalogue and the admin account
	pnpm --filter backend seed

up: ## Build and start the whole stack in containers
	$(COMPOSE) up --build

down: ## Stop the stack and delete its volumes
	$(COMPOSE) down -v

logs: ## Follow logs from every service
	$(COMPOSE) logs -f

ps: ## Show container status
	$(COMPOSE) ps

load-test: ## Run the Artillery scenario against a running stack
	mkdir -p reports
	pnpm exec artillery run --output reports/run.json tests/load.yml
	pnpm exec artillery report --output reports/run.html reports/run.json

clean: ## Remove build output and reports
	rm -rf reports apps/backend/dist apps/frontend/.next
