# Development environment variables for AI Calendar Assistant

# Environment
environment = "dev"
aws_region  = "us-east-1"

# Networking
vpc_cidr           = "10.0.0.0/16"
enable_nat_gateway = true

# Database - Smaller instance for dev
db_instance_class       = "db.t3.micro"
db_allocated_storage    = 20
db_max_allocated_storage = 50
backup_retention_period = 1
enable_deletion_protection = false

# Redis - Smaller instance for dev
redis_node_type       = "cache.t3.micro"
redis_num_cache_nodes = 1

# ECS - Smaller resources for dev
backend_cpu    = 256
backend_memory = 512
frontend_cpu   = 256
frontend_memory = 512

backend_desired_count  = 1
frontend_desired_count = 1

# Auto Scaling - Conservative for dev
backend_min_capacity  = 1
backend_max_capacity  = 3
frontend_min_capacity = 1
frontend_max_capacity = 2

# Monitoring
enable_detailed_monitoring = false
log_retention_days = 7

# Domain (leave empty for dev to use ALB DNS)
domain_name = ""
certificate_arn = ""