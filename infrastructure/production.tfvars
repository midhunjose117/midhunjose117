# Production environment variables for AI Calendar Assistant

# Environment
environment = "production"
aws_region  = "us-east-1"

# Networking
vpc_cidr           = "10.0.0.0/16"
enable_nat_gateway = true

# Database - Production-ready instance
db_instance_class         = "db.t3.small"
db_allocated_storage      = 100
db_max_allocated_storage  = 500
backup_retention_period   = 30
enable_deletion_protection = true

# Redis - Production-ready cluster
redis_node_type       = "cache.t3.small"
redis_num_cache_nodes = 2

# ECS - Production resources
backend_cpu    = 1024
backend_memory = 2048
frontend_cpu   = 512
frontend_memory = 1024

backend_desired_count  = 2
frontend_desired_count = 2

# Auto Scaling - Aggressive for production
backend_min_capacity  = 2
backend_max_capacity  = 20
frontend_min_capacity = 2
frontend_max_capacity = 10

# Monitoring
enable_detailed_monitoring = true
log_retention_days = 90

# Domain (configure with your actual domain)
domain_name = "calendar.yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"