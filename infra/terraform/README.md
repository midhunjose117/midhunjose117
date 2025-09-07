Terraform Skeleton (AWS)

This directory will contain Terraform for:

- ECR repositories (gateway, nlp, scheduler, sync)
- ECS Fargate cluster and services
- Application Load Balancer with path routing
- VPC (2 AZs), subnets, NAT Gateway
- IAM roles for task execution
- Secrets Manager (OPENAI_API_KEY, GOOGLE_MAPS_API_KEY, Nextcloud creds)

Usage (placeholder)

1) Define variables in variables.tf and terraform.tfvars
2) terraform init
3) terraform plan
4) terraform apply

