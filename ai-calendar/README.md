AI Calendar Assistant (Private, Cross‑Device)

Overview

This monorepo scaffolds a private, self‑hosted AI calendar assistant built around:
- Nextcloud (CalDAV) for data storage and sync across phone, laptop, smartwatch
- GPT API for natural language understanding
- Optional Typper.io Calendar AI UI as a frontend
- Travel time estimation via OpenRouteService

Packages

- packages/shared: shared types and schemas (Zod)
- packages/api-gateway: orchestration HTTP API
- packages/nlp-service: natural language to structured intent parsing (OpenAI)
- packages/nextcloud-sync: CalDAV (Nextcloud) create/update events
- packages/travel-service: travel duration estimation

Local Development

1) Copy env
   cp .env.example .env

2) Fill values in .env (OpenAI key, Nextcloud creds, ORS key)

3) Build and run
   docker compose up --build

4) Test health
   curl http://localhost:8080/health

5) Create an event from natural language
   curl -X POST http://localhost:8080/ingest -H 'Content-Type: application/json' \
     -d '{"text":"Lunch with Alex tomorrow at 12:30 at Tartine, 60 minutes","timezone":"America/Los_Angeles"}'

Key Environment Variables

- OPENAI_API_KEY: OpenAI API key (for NLP)
- NEXTCLOUD_URL: Base Nextcloud URL, e.g. https://nc.example.com
- NEXTCLOUD_USERNAME / NEXTCLOUD_PASSWORD: Nextcloud user credentials
- NEXTCLOUD_CALENDAR_PATH: Optional CalDAV calendar collection path (defaults to personal)
- ORS_API_KEY: OpenRouteService API key
- PORT: api-gateway external port (default 8080)

High-Level Flow

api-gateway → nlp-service (parse text → intent) → travel-service (duration) → nextcloud-sync (create event)

AWS Deployment (skeleton)

- infra/terraform contains a minimal starting point to create AWS resources (VPC/ECS/ECR wiring to be added). Containerize services and deploy via ECS on Fargate, or use ECS on EC2. Secrets should be managed via AWS Secrets Manager or SSM Parameter Store.

Notes

- “Atomic” is left flexible: you can integrate an Atomic calendar UI (e.g., Atomic Calendar Revive or another OSS UI) by pointing it at the same CalDAV source (Nextcloud) or at the api-gateway endpoints. Typper.io Calendar AI can be used as a companion UI by calling the api-gateway.

