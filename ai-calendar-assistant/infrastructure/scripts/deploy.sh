#!/bin/bash

# AI Calendar Assistant Deployment Script

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
PROJECT_NAME="ai-calendar"
ENVIRONMENT=${ENVIRONMENT:-"production"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install it first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not configured. Please run 'aws configure' first."
    fi
    
    # Get AWS Account ID if not set
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        log "Using AWS Account ID: $AWS_ACCOUNT_ID"
    fi
}

# Build and push Docker images
build_and_push_images() {
    log "Building and pushing Docker images..."
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build and push backend
    log "Building backend image..."
    docker build -t $PROJECT_NAME-backend ./backend
    docker tag $PROJECT_NAME-backend:latest \
        $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-backend:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-backend:latest
    
    # Build and push frontend
    log "Building frontend image..."
    docker build -t $PROJECT_NAME-frontend ./frontend
    docker tag $PROJECT_NAME-frontend:latest \
        $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-frontend:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-frontend:latest
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log "Deploying infrastructure with Terraform..."
    
    cd infrastructure/aws/terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    # Save outputs
    terraform output -json > ../../../terraform-outputs.json
    
    cd ../../..
}

# Update ECS services
update_ecs_services() {
    log "Updating ECS services..."
    
    # Force new deployment for backend
    aws ecs update-service \
        --cluster $PROJECT_NAME-cluster \
        --service $PROJECT_NAME-backend \
        --force-new-deployment \
        --region $AWS_REGION
    
    # Force new deployment for frontend
    aws ecs update-service \
        --cluster $PROJECT_NAME-cluster \
        --service $PROJECT_NAME-frontend \
        --force-new-deployment \
        --region $AWS_REGION
    
    log "Waiting for services to stabilize..."
    
    # Wait for backend service to stabilize
    aws ecs wait services-stable \
        --cluster $PROJECT_NAME-cluster \
        --services $PROJECT_NAME-backend \
        --region $AWS_REGION
    
    # Wait for frontend service to stabilize
    aws ecs wait services-stable \
        --cluster $PROJECT_NAME-cluster \
        --services $PROJECT_NAME-frontend \
        --region $AWS_REGION
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Get RDS endpoint from Terraform outputs
    RDS_ENDPOINT=$(cat terraform-outputs.json | jq -r '.rds_endpoint.value')
    
    # Run migrations using ECS task
    aws ecs run-task \
        --cluster $PROJECT_NAME-cluster \
        --task-definition $PROJECT_NAME-backend \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[],securityGroups=[]}" \
        --overrides '{
            "containerOverrides": [{
                "name": "backend",
                "command": ["alembic", "upgrade", "head"]
            }]
        }' \
        --region $AWS_REGION
}

# Main deployment flow
main() {
    log "Starting deployment of AI Calendar Assistant..."
    
    check_prerequisites
    
    # Ask for confirmation
    echo ""
    warning "This will deploy to $ENVIRONMENT environment in region $AWS_REGION"
    read -p "Are you sure you want to continue? (yes/no) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled."
        exit 0
    fi
    
    # Deploy
    build_and_push_images
    deploy_infrastructure
    update_ecs_services
    run_migrations
    
    # Get outputs
    CLOUDFRONT_DOMAIN=$(cat terraform-outputs.json | jq -r '.cloudfront_distribution_domain.value')
    
    log "Deployment completed successfully!"
    log "Application URL: https://$CLOUDFRONT_DOMAIN"
    log ""
    log "Next steps:"
    log "1. Update your DNS records to point to the CloudFront distribution"
    log "2. Configure SSL certificate in AWS Certificate Manager"
    log "3. Set up monitoring and alerts in CloudWatch"
    log "4. Configure backup policies for RDS"
}

# Run main function
main "$@"