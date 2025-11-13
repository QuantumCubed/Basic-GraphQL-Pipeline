# Example Graph-QL Pipeline

A GraphQL backend with AI-powered natural language query interface, deployed on AWS EC2 with Kong API Gateway and DynamoDB.

## Architecture
```
User → Kong Gateway (EC2) → Express Backend → DynamoDB
              ↓
         /graphql - Direct GraphQL queries
         /ai - Natural language queries (Claude AI)
```

## Prerequisites

- AWS Account with CLI configured
- Node.js 18+ and npm
- AWS CDK CLI (`npm install -g aws-cdk`)
- EC2 SSH Key Pair created in AWS Console
- Anthropic API Key

## Local Development Requirements

- Node.js 18+
- Docker & Docker Compose
- AWS credentials configured (`aws configure`)

## Infrastructure Deployment (CDK)

### 1. Setup CDK Project
```bash
cd aws
npm install
```

### 2. Configure Your Key Pair

Update `lib/aws-stack.ts`:
```typescript
keyName: "your-key-pair-name",  // Match your EC2 key pair
```

### 3. Bootstrap and Deploy
```bash
# First time only
cdk bootstrap

# Deploy infrastructure
cdk deploy

# Note the outputs:
# - EC2PublicIP
# - SSHCommand
# - KongURL
```

### 4. Destroy When Done
```bash
cdk destroy
```

## EC2 Setup Instructions

### 1. Connect to EC2
```bash
ssh -i ~/.ssh/your-key-pair.pem ec2-user@<EC2-PUBLIC-IP>
```

### 2. Install Docker
```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install docker -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes
exit
```

### 3. SSH Back In and Verify
```bash
ssh -i ~/.ssh/your-key-pair.pem ec2-user@<EC2-PUBLIC-IP>

# Verify installations
docker --version
docker-compose --version
```

### 4. Deploy Application

**Option A: Clone from Git**
```bash
git clone https://github.com/QuantumCubed/Basic-GraphQL-Pipeline.git
cd your-repo
```

**Option B: Copy from Local Machine**
```bash
# From your LOCAL machine
scp -i ~/.ssh/your-key-pair.pem -r ./your-project ec2-user@<EC2-IP>:~

# Then SSH in and cd to project
cd your-project
```

### 5. Configure Environment Variables
```bash
# Create .env file
vi .env
```

Add these variables:
```bash
# PostgreSQL (for Kong)
POSTGRES_USER=kong
POSTGRES_PASSWORD=your-secure-password

# AWS (Region only - IAM role provides credentials automatically)
AWS_REGION=us-east-1

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Important**: No AWS access keys needed! The EC2 IAM role provides DynamoDB access automatically.

### 6. Start Services
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check running containers
docker ps
```

### 7. Configure Kong Routes (First Time Only)

Kong needs routes configured to proxy requests to your backend.

**Create the backend service:**
```bash
curl -i -X POST http://localhost:8001/services \
  --data name=graphql-service \
  --data url='http://backend:3000'
```

**Create the GraphQL route:**
```bash
curl -i -X POST http://localhost:8001/services/graphql-service/routes \
  --data 'paths[]=/graphql' \
  --data 'methods[]=POST' \
  --data 'methods[]=GET' \
  --data strip_path=false
```

**Create the AI route:**
```bash
curl -i -X POST http://localhost:8001/services/graphql-service/routes \
  --data 'paths[]=/ai' \
  --data 'methods[]=POST' \
  --data strip_path=false
```

**Verify routes are created:**
```bash
curl http://localhost:8001/services
curl http://localhost:8001/routes
```

You should see your `graphql-service` with two routes (`/graphql` and `/ai`).

**Note**: These routes persist in Kong's PostgreSQL database, so you only need to configure them once. They'll survive container restarts.

### 8. Verify Services
```bash
# Check Kong
curl http://localhost:8001/status

# Check backend directly (from EC2)
curl http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Test through Kong (from EC2)
curl http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## Testing from Local Machine

### Test GraphQL Endpoint
```bash
curl -X POST http://<EC2-PUBLIC-IP>:8000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ listUsers { id fName lName email } }"}'
```

### Test AI Endpoint
```bash
curl -X POST http://<EC2-PUBLIC-IP>:8000/ai \
  -H "Content-Type: application/json" \
  -d '{"message": "Add a user named John Doe with email john@example.com"}'
```

### Example AI Queries
```bash
# Create user
"Add user Jane Smith with random arguments"

# Get user
"Get user with id abc-123"

# Update user
"Update user abc-123 email to newemail@example.com"

# Delete user
"Delete user abc-123"

# List users
"Show me all users"
"Show me 5 users"
```

## Project Structure
```
.
├── aws/                      # CDK Infrastructure
│   ├── bin/
│   │   └── aws.ts           # CDK app entry point
│   ├── lib/
│   │   └── aws-stack.ts     # Stack definition
│   └── package.json
│
├── backend/                  # Express + GraphQL Backend
│   ├── src/
│   │   ├── index.ts         # Express server
│   │   ├── schema.ts        # GraphQL schema
│   │   ├── resolvers.ts     # GraphQL resolvers
│   │   ├── aiService.ts     # Claude AI integration
│   │   └── dbService.ts     # DynamoDB operations
|   ├── Dockerfile
│   ├── .env
│   └── package.json
│
├── docker-compose.yml        # Kong + Backend orchestration
├── kong.yml                  # Kong configuration
└── .env                      # Environment variables (gitignored)
```

## Useful Commands on EC2

### Docker Management
```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Remove everything including volumes
docker-compose down -v
```

### System Monitoring
```bash
# Check disk space
df -h

# Check memory
free -h

# Check running processes
top

# Check Docker resource usage
docker stats
```

## Kong Configuration

Kong is pre-configured with routes for:

- **`/graphql`** → Express GraphQL endpoint (port 3000)
- **`/ai`** → AI natural language endpoint (port 3000)

### Access Kong Admin API
```bash
# From EC2
curl http://localhost:8001/services
curl http://localhost:8001/routes
```

## Troubleshooting

### Can't SSH to EC2
```bash
# Check key permissions
chmod 400 ~/.ssh/your-key-pair.pem

# Verify security group allows SSH (port 22)
```

### Docker permission denied
```bash
# Add user to docker group
sudo usermod -a -G docker ec2-user

# Log out and back in
exit
```

### Services not starting
```bash
# Check logs
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E '3000|8000|8001'

# Restart Docker
sudo systemctl restart docker
docker-compose up -d
```

### DynamoDB connection issues
```bash
# Verify IAM role is attached to EC2
aws sts get-caller-identity

# Check table exists
aws dynamodb list-tables
```

### Kong can't reach backend
```bash
# Verify backend is running
docker ps

# Check Kong logs
docker-compose logs kong

# Test backend directly
curl http://localhost:3000/graphql
```

## Cost Estimate

- **EC2 t3.micro**: Free tier (750 hours/month for 12 months)
- **DynamoDB**: Free tier (25GB storage, 25 WCU/RCU)
- **Data Transfer**: First 100GB out free/month
- **Anthropic API**: Pay per use (~$0.003 per request)

**Estimated monthly cost after free tier**: $5-15 depending on usage

## Security Notes

⚠️ **For Learning Only** - This setup has some security considerations:

- Kong Admin API (port 8001) is publicly accessible
- No authentication on endpoints
- Using default Kong configuration

**For Production**:
- Restrict Kong Admin API to specific IPs
- Add API key authentication
- Use HTTPS with SSL certificates
- Implement rate limiting
- Use private subnets with ALB

## Cleanup

### Stop Services on EC2
```bash
docker-compose down
```

### Destroy AWS Infrastructure
```bash
cd aws
cdk destroy
```

This removes:
- EC2 instance
- VPC and networking
- DynamoDB table
- IAM roles
- Security groups

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Kong Gateway Documentation](https://docs.konghq.com/)
- [GraphQL Documentation](https://graphql.org/learn/)
- [Anthropic Claude API](https://docs.anthropic.com/)

## License

MIT