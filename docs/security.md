Security & Secrets

Principles

- Keep Nextcloud and API keys out of source control.
- Use environment variables and secret managers (AWS Secrets Manager in prod).
- Limit outbound network to trusted APIs.

Local Dev

- Copy .env.example to .env and fill values.
- Do not commit .env.

AWS

- Use AWS Secrets Manager for OPENAI_API_KEY, GOOGLE_MAPS_API_KEY, Nextcloud credentials.
- Attach task execution roles with least privilege.

Network

- Terminate TLS at ALB; enforce HTTPS-only.
- Place services in private subnets with NAT egress.

Observability

- Centralize logs (CloudWatch Logs); add request IDs.

