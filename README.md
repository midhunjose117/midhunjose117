# AI Calendar Assistant

A private, AI-powered calendar assistant that syncs across devices, combining open-source tools with intelligent scheduling capabilities.

## Features

- 🤖 **AI-Powered Scheduling**: Natural language event creation and automatic rescheduling
- 🔄 **Cross-Device Sync**: Seamless synchronization across phone, laptop, smartwatch, etc.
- 🗣️ **Voice Input**: Natural language voice commands for hands-free scheduling
- 🚗 **Travel Time Estimation**: Automatic travel time calculation between events
- 📅 **Weekly Routines**: Smart weekly routine scheduling and management
- 🔒 **Privacy-First**: Self-hosted with Nextcloud integration for data control

## Architecture

### Core Components

1. **Backend API** (FastAPI)
   - Calendar management and CRUD operations
   - AI scheduling engine with GPT integration
   - CalDAV sync with Nextcloud
   - Voice processing endpoints

2. **AI Scheduling Engine**
   - Natural language processing for event creation
   - Conflict detection and automatic rescheduling
   - Weekly routine optimization
   - Travel time integration

3. **Sync Engine**
   - Cross-device synchronization via Nextcloud CalDAV
   - Real-time event updates
   - Offline capability with sync queuing

4. **Frontend Web App** (React/Next.js)
   - Responsive calendar interface
   - Voice input integration
   - Real-time sync status
   - Mobile-first design

5. **Voice Processing Service**
   - Speech-to-text conversion
   - Natural language understanding
   - Voice command routing

### Technology Stack

- **Backend**: FastAPI, Python 3.11+
- **Frontend**: Next.js 14, React 18, TypeScript
- **AI**: OpenAI GPT API, LangChain
- **Calendar Sync**: Nextcloud CalDAV, caldav-python
- **Voice**: Web Speech API, Whisper API
- **Database**: PostgreSQL, Redis (caching)
- **Deployment**: AWS (Lambda, API Gateway, RDS, S3)
- **Infrastructure**: Docker, Terraform

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- AWS CLI (for deployment)
- OpenAI API key
- Nextcloud instance (optional, for sync)

### Local Development

1. Clone and setup:
```bash
git clone <repository>
cd ai-calendar-assistant
cp .env.example .env
# Edit .env with your API keys and configuration
```

2. Start with Docker Compose:
```bash
docker-compose up -d
```

3. Access the application:
- Web App: http://localhost:3000
- API Docs: http://localhost:8000/docs

### AWS Deployment

```bash
# Quick deployment to development environment
./scripts/deploy.sh dev

# Production deployment
./scripts/deploy.sh production
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Configuration

See `.env.example` for all configuration options including:
- OpenAI API configuration
- Nextcloud CalDAV settings
- AWS deployment parameters
- Voice processing options

## API Documentation

Interactive API documentation is available at `/docs` when running the backend server.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.