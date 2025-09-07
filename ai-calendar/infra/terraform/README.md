AWS Terraform Skeleton

Outline:

- Create VPC, public subnets
- Create ECR repos for api-gateway, nlp-service, nextcloud-sync, travel-service
- Create ECS cluster (Fargate)
- Create Task Definitions for each service with environment from SSM/Secrets Manager
- Create Application Load Balancer routing / to api-gateway
- Optionally an RDS or ElastiCache if needed later

Next Steps:

- Add main.tf, variables.tf, outputs.tf with modules
- Configure IAM roles for task execution and pull from ECR

