#!/bin/bash

# AI Calendar Assistant - AWS Deployment Script
# This script deploys the complete infrastructure to AWS

set -e

# Configuration
STACK_NAME="ai-calendar-assistant"
REGION="us-east-1"
ENVIRONMENT="production"
DOMAIN_NAME="ai-calendar.example.com"
CERTIFICATE_ARN="arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed and configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    print_status "AWS CLI is configured correctly"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    print_status "Docker is running"
}

# Create ECR repositories
create_ecr_repositories() {
    print_status "Creating ECR repositories..."
    
    # Create backend repository
    aws ecr create-repository \
        --repository-name ai-calendar-backend \
        --region $REGION \
        --image-scanning-configuration scanOnPush=true \
        2>/dev/null || print_warning "Backend repository already exists"

    # Create frontend repository
    aws ecr create-repository \
        --repository-name ai-calendar-frontend \
        --region $REGION \
        --image-scanning-configuration scanOnPush=true \
        2>/dev/null || print_warning "Frontend repository already exists"

    print_status "ECR repositories created"
}

# Build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    # Get ECR login token
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

    # Build and push backend image
    print_status "Building backend image..."
    cd server
    docker build -t ai-calendar-backend .
    docker tag ai-calendar-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-calendar-backend:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-calendar-backend:latest
    cd ..

    # Build and push frontend image
    print_status "Building frontend image..."
    cd client
    docker build -t ai-calendar-frontend .
    docker tag ai-calendar-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-calendar-frontend:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-calendar-frontend:latest
    cd ..

    print_status "Docker images built and pushed"
}

# Store secrets in AWS Systems Manager Parameter Store
store_secrets() {
    print_status "Storing secrets in AWS Systems Manager..."
    
    # Store OpenAI API key
    aws ssm put-parameter \
        --name "/ai-calendar/openai-api-key" \
        --value "$OPENAI_API_KEY" \
        --type "SecureString" \
        --region $REGION \
        --overwrite

    # Store Google Maps API key
    aws ssm put-parameter \
        --name "/ai-calendar/google-maps-api-key" \
        --value "$GOOGLE_MAPS_API_KEY" \
        --type "SecureString" \
        --region $REGION \
        --overwrite

    print_status "Secrets stored in AWS Systems Manager"
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    print_status "Deploying infrastructure with CloudFormation..."
    
    aws cloudformation deploy \
        --template-file aws/cloudformation-template.yml \
        --stack-name $STACK_NAME \
        --region $REGION \
        --capabilities CAPABILITY_IAM \
        --parameter-overrides \
            Environment=$ENVIRONMENT \
            DomainName=$DOMAIN_NAME \
            CertificateArn=$CERTIFICATE_ARN \
            OpenAIApiKey=$OPENAI_API_KEY \
            GoogleMapsApiKey=$GOOGLE_MAPS_API_KEY

    print_status "Infrastructure deployed successfully"
}

# Update ECS service
update_ecs_service() {
    print_status "Updating ECS service..."
    
    # Get the cluster name from CloudFormation
    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)

    # Force new deployment
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service ai-calendar-assistant-service \
        --force-new-deployment \
        --region $REGION

    print_status "ECS service updated"
}

# Wait for deployment to complete
wait_for_deployment() {
    print_status "Waiting for deployment to complete..."
    
    # Get the cluster name
    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)

    # Wait for service to be stable
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services ai-calendar-assistant-service \
        --region $REGION

    print_status "Deployment completed successfully"
}

# Display deployment information
display_deployment_info() {
    print_status "Deployment Information:"
    
    # Get outputs from CloudFormation
    APPLICATION_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' \
        --output text)

    LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)

    echo "Application URL: $APPLICATION_URL"
    echo "Load Balancer DNS: $LOAD_BALANCER_DNS"
    echo "Stack Name: $STACK_NAME"
    echo "Region: $REGION"
}

# Main deployment function
main() {
    print_status "Starting AI Calendar Assistant deployment to AWS..."
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_status "AWS Account ID: $AWS_ACCOUNT_ID"

    # Check prerequisites
    check_aws_cli
    check_docker

    # Check for required environment variables
    if [ -z "$OPENAI_API_KEY" ]; then
        print_error "OPENAI_API_KEY environment variable is not set"
        exit 1
    fi

    if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
        print_error "GOOGLE_MAPS_API_KEY environment variable is not set"
        exit 1
    fi

    # Deploy infrastructure
    create_ecr_repositories
    build_and_push_images
    store_secrets
    deploy_infrastructure
    update_ecs_service
    wait_for_deployment
    display_deployment_info

    print_status "AI Calendar Assistant deployed successfully!"
    print_status "You can access the application at: https://$DOMAIN_NAME"
}

# Run main function
main "$@"