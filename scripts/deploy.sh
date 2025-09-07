#!/bin/bash

# AI Calendar Assistant Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="ai-calendar-assistant"

echo -e "${BLUE}🚀 Starting deployment for AI Calendar Assistant${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check if required tools are installed
    local tools=("docker" "aws" "terraform")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            echo -e "${RED}❌ $tool is not installed${NC}"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo -e "${RED}❌ .env file not found. Please copy .env.example to .env and configure it${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Build and push Docker images
build_and_push_images() {
    echo -e "${YELLOW}🏗️ Building and pushing Docker images...${NC}"
    
    # Get ECR repository URLs from Terraform output
    cd infrastructure
    BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url 2>/dev/null || echo "")
    FRONTEND_REPO=$(terraform output -raw ecr_frontend_repository_url 2>/dev/null || echo "")
    cd ..
    
    if [ -z "$BACKEND_REPO" ] || [ -z "$FRONTEND_REPO" ]; then
        echo -e "${RED}❌ ECR repositories not found. Run terraform apply first${NC}"
        exit 1
    fi
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(echo $BACKEND_REPO | cut -d'/' -f1)
    
    # Build and push backend
    echo -e "${BLUE}Building backend image...${NC}"
    docker build -t $BACKEND_REPO:latest ./backend
    docker push $BACKEND_REPO:latest
    
    # Build and push frontend
    echo -e "${BLUE}Building frontend image...${NC}"
    docker build -t $FRONTEND_REPO:latest ./frontend
    docker push $FRONTEND_REPO:latest
    
    echo -e "${GREEN}✅ Images built and pushed successfully${NC}"
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${YELLOW}🏗️ Deploying infrastructure...${NC}"
    
    cd infrastructure
    
    # Initialize Terraform
    terraform init
    
    # Create workspace if it doesn't exist
    terraform workspace select $ENVIRONMENT 2>/dev/null || terraform workspace new $ENVIRONMENT
    
    # Plan deployment
    echo -e "${BLUE}Planning infrastructure changes...${NC}"
    terraform plan -var="environment=$ENVIRONMENT" -var-file="$ENVIRONMENT.tfvars" -out=tfplan
    
    # Apply changes
    echo -e "${BLUE}Applying infrastructure changes...${NC}"
    terraform apply tfplan
    
    cd ..
    
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
}

# Update ECS services
update_services() {
    echo -e "${YELLOW}🔄 Updating ECS services...${NC}"
    
    cd infrastructure
    CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
    BACKEND_SERVICE=$(terraform output -raw backend_service_name)
    FRONTEND_SERVICE=$(terraform output -raw frontend_service_name)
    cd ..
    
    # Force new deployment for backend service
    echo -e "${BLUE}Updating backend service...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $BACKEND_SERVICE \
        --force-new-deployment \
        --region $AWS_REGION
    
    # Force new deployment for frontend service
    echo -e "${BLUE}Updating frontend service...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $FRONTEND_SERVICE \
        --force-new-deployment \
        --region $AWS_REGION
    
    # Wait for services to stabilize
    echo -e "${BLUE}Waiting for services to stabilize...${NC}"
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services $BACKEND_SERVICE $FRONTEND_SERVICE \
        --region $AWS_REGION
    
    echo -e "${GREEN}✅ Services updated successfully${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}📊 Running database migrations...${NC}"
    
    cd infrastructure
    CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
    BACKEND_SERVICE=$(terraform output -raw backend_service_name)
    cd ..
    
    # Get a running task ARN
    TASK_ARN=$(aws ecs list-tasks \
        --cluster $CLUSTER_NAME \
        --service-name $BACKEND_SERVICE \
        --query 'taskArns[0]' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
        echo -e "${BLUE}Running migrations on task: $TASK_ARN${NC}"
        aws ecs execute-command \
            --cluster $CLUSTER_NAME \
            --task $TASK_ARN \
            --container backend \
            --command "python -m alembic upgrade head" \
            --interactive \
            --region $AWS_REGION
    else
        echo -e "${YELLOW}⚠️ No running backend tasks found. Migrations will run on next deployment${NC}"
    fi
    
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}🏥 Performing health checks...${NC}"
    
    cd infrastructure
    ALB_DNS=$(terraform output -raw load_balancer_dns_name)
    cd ..
    
    # Check backend health
    echo -e "${BLUE}Checking backend health...${NC}"
    for i in {1..30}; do
        if curl -f -s "http://$ALB_DNS/api/v1/health" > /dev/null; then
            echo -e "${GREEN}✅ Backend is healthy${NC}"
            break
        fi
        echo -e "${YELLOW}⏳ Waiting for backend to be ready... ($i/30)${NC}"
        sleep 10
    done
    
    # Check frontend health
    echo -e "${BLUE}Checking frontend health...${NC}"
    for i in {1..30}; do
        if curl -f -s "http://$ALB_DNS" > /dev/null; then
            echo -e "${GREEN}✅ Frontend is healthy${NC}"
            break
        fi
        echo -e "${YELLOW}⏳ Waiting for frontend to be ready... ($i/30)${NC}"
        sleep 10
    done
    
    echo -e "${GREEN}✅ Health checks completed${NC}"
    echo -e "${GREEN}🎉 Application is available at: http://$ALB_DNS${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
    rm -f infrastructure/tfplan
}

# Main deployment flow
main() {
    trap cleanup EXIT
    
    check_prerequisites
    
    case "$2" in
        "infra-only")
            deploy_infrastructure
            ;;
        "app-only")
            build_and_push_images
            update_services
            run_migrations
            health_check
            ;;
        *)
            deploy_infrastructure
            build_and_push_images
            update_services
            run_migrations
            health_check
            ;;
    esac
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Show usage
usage() {
    echo "Usage: $0 <environment> [deployment-type]"
    echo ""
    echo "Environments: dev, staging, production"
    echo "Deployment types:"
    echo "  (default) - Full deployment (infrastructure + application)"
    echo "  infra-only - Deploy infrastructure only"
    echo "  app-only - Deploy application only (skip infrastructure)"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 production infra-only"
    echo "  $0 staging app-only"
}

# Validate arguments
if [ $# -lt 1 ]; then
    usage
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment. Must be dev, staging, or production${NC}"
    usage
    exit 1
fi

# Run main function
main "$@"