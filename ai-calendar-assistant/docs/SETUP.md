# AI Calendar Assistant - Setup Guide

## Prerequisites

Before setting up the AI Calendar Assistant, ensure you have the following:

### Required Software
- Docker & Docker Compose
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 15+ (for local development)
- Redis 7+ (for local development)

### Required Accounts & API Keys
- OpenAI API key (for GPT-4)
- Google Maps API key (for travel time estimation)
- Nextcloud/CalDAV server credentials
- AWS account (for deployment)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-calendar-assistant.git
cd ai-calendar-assistant
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `CALDAV_URL`: Your CalDAV server URL
- `CALDAV_USERNAME`: CalDAV username
- `CALDAV_PASSWORD`: CalDAV password
- `JWT_SECRET_KEY`: Generate a secure random string
- `DATABASE_URL`: PostgreSQL connection string

### 3. Database Setup

```bash
# Create database
createdb ai_calendar

# Run migrations
alembic upgrade head

# (Optional) Seed sample data
python scripts/seed_data.py
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm start
```

### 5. Running with Docker Compose

For a complete local environment:

```bash
# From project root
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This will start:
- PostgreSQL database
- Redis cache
- Backend API (FastAPI)
- Frontend (React)
- Nginx reverse proxy

Access the application at http://localhost

## Production Deployment (AWS)

### 1. AWS Prerequisites

- AWS CLI configured with credentials
- Terraform installed
- AWS account with appropriate permissions

### 2. Configure AWS Resources

```bash
cd infrastructure/aws/terraform

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Apply infrastructure
terraform apply
```

### 3. Deploy Application

```bash
cd ../../..

# Run deployment script
./infrastructure/scripts/deploy.sh
```

The deployment script will:
1. Build Docker images
2. Push to Amazon ECR
3. Deploy infrastructure with Terraform
4. Update ECS services
5. Run database migrations

### 4. Post-Deployment Configuration

1. **SSL Certificate**: Configure SSL certificate in AWS Certificate Manager
2. **Domain**: Update DNS records to point to CloudFront distribution
3. **Secrets**: Add sensitive values to AWS Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id ai-calendar-openai-api-key \
     --secret-string "your-openai-api-key"
   ```

## Nextcloud/CalDAV Integration

### 1. Nextcloud Setup

If using Nextcloud:

```bash
# Install Nextcloud (example with Docker)
docker run -d \
  --name nextcloud \
  -p 8080:80 \
  -v nextcloud:/var/www/html \
  nextcloud
```

### 2. Configure CalDAV

1. Access Nextcloud at http://localhost:8080
2. Create a user account
3. Enable Calendar app
4. Get CalDAV URL: `http://localhost:8080/remote.php/dav`

### 3. Connect AI Calendar

Update your `.env` file:
```
CALDAV_URL=http://localhost:8080/remote.php/dav
CALDAV_USERNAME=your-nextcloud-username
CALDAV_PASSWORD=your-nextcloud-password
```

## Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Integration Tests

```bash
# Run with Docker Compose
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Check database exists: `psql -l`

2. **OpenAI API Error**
   - Verify API key is correct
   - Check API quota/limits
   - Test with: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

3. **CalDAV Sync Issues**
   - Verify CalDAV URL format
   - Check credentials
   - Test connection with CalDAV client

4. **Docker Issues**
   - Clean up: `docker-compose down -v`
   - Rebuild: `docker-compose build --no-cache`
   - Check logs: `docker-compose logs [service-name]`

## Monitoring

### Local Development

- Backend API docs: http://localhost:8000/api/docs
- Frontend: http://localhost:3000
- PostgreSQL: Connect with pgAdmin or psql
- Redis: `redis-cli ping`

### Production

- CloudWatch Logs: Check ECS task logs
- CloudWatch Metrics: Monitor CPU, memory, requests
- RDS Metrics: Database performance
- Application Load Balancer: Request metrics

## Support

For issues or questions:
1. Check the [troubleshooting guide](#troubleshooting)
2. Review logs in CloudWatch (production) or Docker logs (local)
3. Open an issue on GitHub with detailed error information