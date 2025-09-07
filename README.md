AI Calendar Assistant (Private)

Overview

This monorepo contains a private AI-powered calendar assistant that integrates natural language input, weekly planning, automatic rescheduling, travel time estimation, and seamless synchronization via Nextcloud CalDAV.

Services

- gateway: Orchestrates requests between NLP, Scheduler, and Sync services.
- nlp: Parses natural language text and provides a voice transcription stub.
- scheduler: Generates weekly plans, proposes rescheduling, and estimates travel time (stub with optional external API).
- sync: Syncs events with Nextcloud CalDAV (create/update/delete/list).

Quickstart (Docker)

1) Copy environment template and edit values:

   cp .env.example .env

2) Build and start services:

   docker compose -f infra/docker-compose.yml up --build

3) Gateway will be available at http://localhost:8080

Smoke Tests

- Health checks:

   curl -s http://localhost:8080/healthz | jq
   curl -s http://localhost:8080/nlp/healthz | jq
   curl -s http://localhost:8080/scheduler/healthz | jq
   curl -s http://localhost:8080/sync/healthz | jq

- NLP parse:

   curl -s -X POST http://localhost:8080/nlp/parse \
     -H 'Content-Type: application/json' \
     -d '{"text":"schedule a meeting with Sam tomorrow at 3pm at Cafe Roma"}' | jq

- Plan week (stub):

   curl -s -X POST http://localhost:8080/scheduler/plan-week \
     -H 'Content-Type: application/json' \
     -d '{"preferences": {"work_hours": ["09:00","17:00"]}, "events": []}' | jq

- Nextcloud list calendars (requires valid Nextcloud env vars):

   curl -s http://localhost:8080/sync/calendars | jq

Environment

- See .env.example for required variables.

Key Integrations

- Nextcloud CalDAV: Device sync for phone, laptop, smartwatch.
- GPT API: Optional provider for NLP parsing (can run locally without it using rules).
- Typper.io (optional inspiration): See docs/architecture.md for notes.
- "Atomic" (placeholder): See docs/architecture.md for integration notes.

AWS Deployment

- Terraform skeleton is in infra/terraform. It outlines ECR, ECS Fargate, ALB, and Secret Manager usage. Fill variables and adapt to your account. See docs/architecture.md for topology.

Development

- Python 3.11 services using FastAPI. Each service has its own Dockerfile and requirements.txt.

Repository Structure

- services/
  - gateway/
  - nlp/
  - scheduler/
  - sync/
- infra/
  - docker-compose.yml
  - terraform/
- docs/
  - architecture.md
  - device-sync.md
  - security.md

 👋 Hi, I’m @midhunjose117
👀 I’m interested in Football
🌱 I’m currently learning Devops and Machine Learning
💞️ I’m looking to collaborate on Any project about Machine Learning and Devops
📫 How to reach me @ midhunjose117@gmail.com

<!---
midhunjose117/midhunjose117 is a ✨ special ✨ repository because its `README.md` (this file) appears on your GitHub profile.
You can click the Preview link to take a look at your changes.
--->
