# Variables for AI Calendar Assistant Infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ai-calendar-assistant"
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

# Database
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "calendar_ai"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "calendar_user"
}

# Redis
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

# ECS
variable "backend_cpu" {
  description = "CPU units for backend service"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory (MB) for backend service"
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "CPU units for frontend service"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory (MB) for frontend service"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 1
}

variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 1
}

# Application Configuration
variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "nextcloud_url" {
  description = "Nextcloud server URL"
  type        = string
  default     = ""
}

variable "google_maps_api_key" {
  description = "Google Maps API key for travel time"
  type        = string
  default     = ""
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

# Auto Scaling
variable "backend_min_capacity" {
  description = "Minimum capacity for backend auto scaling"
  type        = number
  default     = 1
}

variable "backend_max_capacity" {
  description = "Maximum capacity for backend auto scaling"
  type        = number
  default     = 10
}

variable "frontend_min_capacity" {
  description = "Minimum capacity for frontend auto scaling"
  type        = number
  default     = 1
}

variable "frontend_max_capacity" {
  description = "Maximum capacity for frontend auto scaling"
  type        = number
  default     = 5
}

# Monitoring
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Backup
variable "backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = false
}