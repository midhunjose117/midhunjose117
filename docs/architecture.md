Architecture

Goals

- Private, AI-powered calendar assistant
- Weekly routine scheduling and automatic rescheduling
- Travel time estimation
- Voice/NL input
- Sync across phone, laptop, smartwatch via Nextcloud CalDAV

High-Level Components

- gateway (FastAPI): Single entrypoint; routes to NLP, Scheduler, Sync
- nlp (FastAPI): Intent parsing from text; speech-to-text stub. Optionally calls GPT.
- scheduler (FastAPI): Plans weekly routines, resolves conflicts, estimates travel time via adapter.
- sync (FastAPI): CalDAV client for Nextcloud (create/update/delete/list events, calendars).

Data Flow

1. User issues natural language request (text/voice) to gateway.
2. gateway -> nlp.parse -> structured intent (e.g., create_meeting with time, attendees, location).
3. gateway -> scheduler to validate slot, insert travel buffers, or propose alternatives.
4. gateway -> sync to persist to Nextcloud CalDAV.
5. Devices sync via native CalDAV with Nextcloud (no direct device code required).

Key Integrations

- Nextcloud CalDAV: Source of truth for events; device sync.
- GPT API: Optional for better NLU; fallbacks to rule-based parsing for simple patterns.
- Travel time: Adapter pattern; provider=none (stub) or Google Maps/OSRM/GraphHopper.
- Voice: Stub endpoint; integrate Whisper/Deepgram/Coqui later.

Open-source references

- Typper.io calendar-ai (ideas for UX and intent patterns).
- "Atomic": Placeholder (clarify exact project; not strictly required for MVP).

AWS Deployment (proposed)

- Containerize each service; push to ECR.
- ECS Fargate service per microservice; ALB with path routing (/nlp, /scheduler, /sync).
- Secrets Manager for API keys; SSM Parameter Store for configs.
- VPC with public ALB, private ECS tasks; NAT for outbound.
- RDS optional if persisting assistant state beyond Nextcloud (e.g., preferences).

Security & Privacy

- All external traffic over TLS (terminate at ALB in AWS; dev uses HTTP).
- Principle of least privilege for IAM; avoid long-lived keys.
- Store secrets in env via Secrets Manager, not in repo.

MVP vs Future

- MVP: Basic parsing, simple scheduling, CalDAV CRUD, stub travel time.
- Future: Smart conflict resolution, learning user preferences, real travel APIs, voice end-to-end, multi-user.

