# AI Calendar Assistant

A private, AI-powered calendar assistant that syncs across devices with natural language processing capabilities.

## Features

- **Natural Language Processing**: Schedule events using voice or text
- **Smart Scheduling**: Automatic rescheduling based on conflicts and priorities
- **Travel Time Estimation**: Automatically adds buffer time for travel between locations
- **Cross-Device Sync**: Seamless synchronization across phone, laptop, smartwatch
- **Weekly Routine Management**: Handles recurring events and routines
- **Privacy-First**: Self-hosted solution with your own data

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Mobile Client  │     │    API Client   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   API Gateway   │
                        │    (FastAPI)    │
                        └────────┬────────┘
                                 │
        ┌────────────────┬───────┴───────┬────────────────┐
        │                │               │                │
┌───────▼──────┐ ┌───────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
│  NLP Service │ │Calendar Sync │ │Travel Time │ │ Scheduling  │
│  (GPT API)   │ │  (CalDAV)    │ │  Service   │ │   Engine    │
└──────────────┘ └──────────────┘ └────────────┘ └─────────────┘
```

## Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Calendar Sync**: CalDAV/Nextcloud
- **NLP**: OpenAI GPT API
- **Voice Processing**: Whisper API
- **Frontend**: React + TypeScript
- **Mobile**: React Native
- **Deployment**: Docker + AWS ECS

## Setup Instructions

See [SETUP.md](./docs/SETUP.md) for detailed installation instructions.

## Development

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for development guidelines.