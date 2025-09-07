# Deployment Guide

This guide covers deploying the AI Calendar Assistant to various environments.

## 🐳 Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- MongoDB and Redis running (or use Docker containers)

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd ai-calendar-assistant

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Services
- **Frontend**: React app served by Nginx (port 80)
- **Backend**: Node.js API server (port 5000)
- **MongoDB**: Database (port 27017)
- **Redis**: Cache (port 6379)
- **Nginx**: Reverse proxy and load balancer

### Environment Configuration
```env
# Production settings
NODE_ENV=production
PORT=5000
CLIENT_URL=http://localhost

# Database
MONGODB_URI=mongodb://admin:password123@mongodb:27017/ai-calendar?authSource=admin
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# AI Services
OPENAI_API_KEY=your-openai-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## ☁️ AWS Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed
- Domain name and SSL certificate
- Required API keys

### Required AWS Services
- ECS Fargate (container hosting)
- Application Load Balancer (traffic distribution)
- DocumentDB (managed MongoDB)
- ElastiCache Redis (managed cache)
- CloudWatch (logging and monitoring)
- Route 53 (DNS)
- ACM (SSL certificates)
- Systems Manager (secrets management)

### Deployment Steps

1. **Prepare Environment**
   ```bash
   # Set required environment variables
   export OPENAI_API_KEY="your-openai-api-key"
   export GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
   export AWS_ACCOUNT_ID="your-aws-account-id"
   export REGION="us-east-1"
   export DOMAIN_NAME="your-domain.com"
   export CERTIFICATE_ARN="arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
   ```

2. **Run Deployment Script**
   ```bash
   chmod +x aws/deploy.sh
   ./aws/deploy.sh
   ```

3. **Monitor Deployment**
   ```bash
   # Check CloudFormation stack
   aws cloudformation describe-stacks --stack-name ai-calendar-assistant

   # Check ECS service status
   aws ecs describe-services --cluster ai-calendar-assistant-cluster --services ai-calendar-assistant-service
   ```

### Infrastructure Components

#### VPC and Networking
- Custom VPC with public and private subnets
- Internet Gateway for public access
- NAT Gateway for private subnet internet access
- Security groups for each service

#### Application Load Balancer
- SSL termination with ACM certificates
- Health checks for backend services
- Rate limiting and security headers
- Redirect HTTP to HTTPS

#### ECS Fargate
- Serverless container hosting
- Auto-scaling based on CPU/memory usage
- Health checks and automatic restarts
- Logging to CloudWatch

#### Database Layer
- DocumentDB cluster with automatic backups
- Multi-AZ deployment for high availability
- Encryption at rest and in transit
- Automated maintenance windows

#### Caching Layer
- ElastiCache Redis cluster
- Multi-AZ deployment
- Automatic failover
- Encryption in transit

### Security Configuration

#### IAM Roles
- ECS execution role for container management
- ECS task role for application permissions
- Least privilege access policies

#### Security Groups
- ALB security group (ports 80, 443)
- ECS security group (internal communication)
- Database security group (port 27017)
- Redis security group (port 6379)

#### Secrets Management
- API keys stored in Systems Manager Parameter Store
- Encrypted with AWS KMS
- Accessed by ECS tasks via IAM roles

### Monitoring and Logging

#### CloudWatch
- Application logs from ECS tasks
- Custom metrics for performance monitoring
- Alarms for error rates and latency
- Dashboards for system overview

#### Health Checks
- Application health endpoint (`/health`)
- Database connectivity checks
- External service availability
- Load balancer health checks

## 🔧 Production Configuration

### Environment Variables
```env
# Application
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://admin:password@docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/ai-calendar?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
REDIS_URL=redis://redis-cluster.xxxxx.cache.amazonaws.com:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# AI Services (stored in Systems Manager)
OPENAI_API_KEY=from-ssm-parameter
GOOGLE_MAPS_API_KEY=from-ssm-parameter

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads
```

### Performance Optimization

#### Backend Optimizations
- Connection pooling for database
- Redis caching for frequent queries
- Compression middleware
- Rate limiting
- Request validation

#### Frontend Optimizations
- Code splitting and lazy loading
- Image optimization
- Service worker for caching
- Gzip compression
- CDN integration

#### Database Optimizations
- Proper indexing strategy
- Query optimization
- Connection pooling
- Read replicas for scaling

### Security Hardening

#### Application Security
- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- SQL injection prevention
- XSS protection

#### Infrastructure Security
- VPC with private subnets
- Security groups with minimal access
- WAF for additional protection
- DDoS protection
- Regular security updates

## 📊 Monitoring and Alerting

### CloudWatch Metrics
- Application response time
- Error rates
- Database connection counts
- Cache hit rates
- CPU and memory usage

### Alarms
- High error rate (>5%)
- High response time (>2s)
- Database connection failures
- Service unavailability

### Logging
- Application logs (structured JSON)
- Access logs (Nginx)
- Error logs (application and infrastructure)
- Audit logs (authentication and authorization)

## 🔄 Backup and Recovery

### Database Backups
- Automated daily backups
- Point-in-time recovery
- Cross-region backup replication
- Backup retention policies

### Application Backups
- Container image backups
- Configuration backups
- Code repository backups
- Environment variable backups

### Disaster Recovery
- Multi-AZ deployment
- Cross-region replication
- Automated failover procedures
- Recovery time objectives (RTO)
- Recovery point objectives (RPO)

## 🚀 Scaling

### Horizontal Scaling
- ECS service auto-scaling
- Load balancer distribution
- Database read replicas
- Cache cluster scaling

### Vertical Scaling
- Container resource limits
- Database instance sizing
- Cache node sizing
- Load balancer capacity

### Performance Testing
- Load testing with realistic traffic
- Stress testing for breaking points
- Capacity planning
- Performance baseline establishment

## 🔧 Maintenance

### Regular Updates
- Security patches
- Dependency updates
- Infrastructure updates
- Performance optimizations

### Monitoring
- Health check monitoring
- Performance metrics
- Error rate tracking
- Capacity monitoring

### Backup Verification
- Regular backup testing
- Recovery procedure testing
- Data integrity checks
- Disaster recovery drills

## 📞 Support and Troubleshooting

### Common Issues
- Database connection failures
- Redis connection issues
- SSL certificate problems
- Load balancer health check failures

### Debugging
- Application logs
- Infrastructure logs
- Health check endpoints
- Monitoring dashboards

### Support Channels
- GitHub issues for bugs
- Documentation for common problems
- Community forums for discussions
- Professional support options

---

For additional deployment options or custom configurations, please refer to the main documentation or create an issue for assistance.