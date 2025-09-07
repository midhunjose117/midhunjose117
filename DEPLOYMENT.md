# AI Calendar Assistant - Deployment Guide

This guide covers the complete deployment process for the AI Calendar Assistant on AWS.

## Prerequisites

### Required Tools
- **Docker** (version 20.10+)
- **AWS CLI** (version 2.0+)
- **Terraform** (version 1.0+)
- **Node.js** (version 18+)
- **Python** (version 3.11+)

### AWS Account Setup
1. Create an AWS account if you don't have one
2. Configure AWS CLI with appropriate permissions:
   ```bash
   aws configure
   ```
3. Ensure your AWS user has the following permissions:
   - EC2, ECS, RDS, ElastiCache
   - VPC, ALB, Route53
   - IAM, Secrets Manager
   - S3, ECR, CloudWatch

### Required API Keys
- **OpenAI API Key**: For AI scheduling features
- **Google Maps API Key**: For travel time estimation (optional)
- **Nextcloud Credentials**: For calendar sync (optional)

## Configuration

### 1. Environment Variables
Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/calendar_ai
REDIS_URL=redis://localhost:6379
SECRET_KEY=your_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_key

# Optional
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXTCLOUD_URL=https://your-nextcloud.example.com
NEXTCLOUD_USERNAME=your_username
NEXTCLOUD_PASSWORD=your_app_password
```

### 2. Terraform Variables
Configure environment-specific variables in `infrastructure/*.tfvars`:

- `dev.tfvars` - Development environment
- `staging.tfvars` - Staging environment  
- `production.tfvars` - Production environment

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

Use the provided deployment script:

```bash
# Deploy to development
./scripts/deploy.sh dev

# Deploy to production
./scripts/deploy.sh production

# Deploy only infrastructure
./scripts/deploy.sh dev infra-only

# Deploy only application
./scripts/deploy.sh dev app-only
```

### Method 2: Manual Deployment

#### Step 1: Deploy Infrastructure

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Select environment workspace
terraform workspace select dev  # or staging/production

# Plan deployment
terraform plan -var-file="dev.tfvars" -out=tfplan

# Apply changes
terraform apply tfplan
```

#### Step 2: Build and Push Images

```bash
# Get ECR repository URLs
BACKEND_REPO=$(cd infrastructure && terraform output -raw ecr_backend_repository_url)
FRONTEND_REPO=$(cd infrastructure && terraform output -raw ecr_frontend_repository_url)

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(echo $BACKEND_REPO | cut -d'/' -f1)

# Build and push backend
docker build -t $BACKEND_REPO:latest ./backend
docker push $BACKEND_REPO:latest

# Build and push frontend
docker build -t $FRONTEND_REPO:latest ./frontend
docker push $FRONTEND_REPO:latest
```

#### Step 3: Update ECS Services

```bash
# Get service information
CLUSTER_NAME=$(cd infrastructure && terraform output -raw ecs_cluster_name)
BACKEND_SERVICE=$(cd infrastructure && terraform output -raw backend_service_name)
FRONTEND_SERVICE=$(cd infrastructure && terraform output -raw frontend_service_name)

# Update services
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE --force-new-deployment
aws ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE --force-new-deployment

# Wait for services to stabilize
aws ecs wait services-stable --cluster $CLUSTER_NAME --services $BACKEND_SERVICE $FRONTEND_SERVICE
```

## Local Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment-Specific Configurations

### Development
- Single instance of each service
- Minimal resources (t3.micro instances)
- Short log retention (7 days)
- No deletion protection
- HTTP only (no SSL)

### Staging
- Similar to production but smaller scale
- Useful for testing before production deployment
- Medium resources (t3.small instances)
- Medium log retention (30 days)

### Production
- Multi-AZ deployment
- Auto-scaling enabled
- Production resources (t3.small+ instances)
- Long log retention (90 days)
- Deletion protection enabled
- HTTPS with SSL certificates
- Enhanced monitoring and alerting

## Monitoring and Logging

### CloudWatch Logs
- Backend logs: `/ecs/ai-calendar-assistant/backend`
- Frontend logs: `/ecs/ai-calendar-assistant/frontend`
- ECS logs: `/ecs/ai-calendar-assistant`

### Health Checks
- Backend: `http://load-balancer/api/v1/health`
- Frontend: `http://load-balancer/`

### Metrics
- ECS service metrics (CPU, memory, task count)
- RDS metrics (connections, CPU, storage)
- Redis metrics (CPU, memory, connections)
- Application Load Balancer metrics

## Scaling

### Auto Scaling
The application is configured with auto-scaling based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)

### Manual Scaling
```bash
# Scale backend service
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE --desired-count 3

# Scale frontend service
aws ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE --desired-count 2
```

## Security

### Network Security
- VPC with public and private subnets
- Security groups with minimal required access
- NAT Gateway for private subnet internet access
- No direct internet access to database/cache

### Data Security
- RDS encryption at rest
- Redis encryption in transit and at rest
- Secrets stored in AWS Secrets Manager
- S3 bucket with private access only

### Application Security
- JWT tokens for authentication
- CORS properly configured
- Input validation and sanitization
- Rate limiting (planned)

## Backup and Recovery

### Database Backups
- Automated daily backups (7-30 days retention)
- Point-in-time recovery available
- Cross-region backup replication (production)

### Disaster Recovery
- Multi-AZ deployment for high availability
- Infrastructure as Code for quick recreation
- Container images stored in ECR with replication

## Troubleshooting

### Common Issues

#### 1. ECS Service Won't Start
```bash
# Check service events
aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME

# Check task logs
aws logs get-log-events --log-group-name /ecs/ai-calendar-assistant/backend --log-stream-name ecs/backend/TASK_ID
```

#### 2. Database Connection Issues
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier ai-calendar-assistant-db

# Test connectivity from ECS task
aws ecs execute-command --cluster $CLUSTER_NAME --task $TASK_ARN --container backend --command "ping db-endpoint"
```

#### 3. Load Balancer Health Check Failures
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP_ARN

# Check security group rules
aws ec2 describe-security-groups --group-ids $SECURITY_GROUP_ID
```

### Getting Help

1. Check CloudWatch logs for error messages
2. Review ECS service events
3. Verify environment variables and secrets
4. Check security group configurations
5. Validate database and Redis connectivity

## Cost Optimization

### Development Environment
- Use t3.micro instances
- Single AZ deployment
- Shorter backup retention
- Estimated cost: $50-100/month

### Production Environment
- Use reserved instances for predictable workloads
- Enable detailed billing and cost monitoring
- Set up billing alerts
- Estimated cost: $200-500/month (depending on usage)

## Updates and Maintenance

### Application Updates
```bash
# Update application code
./scripts/deploy.sh production app-only
```

### Infrastructure Updates
```bash
# Update infrastructure
./scripts/deploy.sh production infra-only
```

### Database Migrations
```bash
# Run migrations manually
aws ecs execute-command --cluster $CLUSTER_NAME --task $TASK_ARN --container backend --command "python -m alembic upgrade head"
```

## Next Steps

After successful deployment:

1. Configure domain name and SSL certificate
2. Set up monitoring and alerting
3. Configure backup verification
4. Implement CI/CD pipeline
5. Set up staging environment
6. Configure log aggregation and analysis
7. Implement additional security measures
8. Set up performance monitoring