# 🚀 AWS App Runner Direct Deployment (No File Uploads!)

AWS App Runner can deploy directly from your GitHub repository without needing ECR or file uploads.

## Step-by-Step Instructions:

### 1. Create App Runner Configuration File
First, let's create the configuration file that App Runner needs:

```yaml
# apprunner.yaml (create this in your project root)
version: 1.0
runtime: docker
build:
  commands:
    build:
      - echo "Building application..."
      - docker build -f Dockerfile.minimal -t app .
run:
  runtime-version: latest
  command: ./start.sh
  network:
    port: 5000
    env: PORT
  env:
    - name: FLASK_ENV
      value: production
    - name: APP_SETTINGS
      value: project.config.ProductionConfig
    - name: DATABASE_URL
      value: sqlite:///app.db
```

### 2. Deploy via AWS Console

1. **Go to AWS App Runner Console**
   - Search "App Runner" in AWS Console
   - Click "Create service"

2. **Configure Source**
   - Source type: "Source code repository"
   - Repository provider: "GitHub"
   - Connect to GitHub (authorize AWS)
   - Repository: Select your `testdriven-app` repo
   - Branch: `main`
   - Source directory: `/` (root)

3. **Configure Build**
   - Configuration file: "Use configuration file"
   - Configuration file: `apprunner.yaml`

4. **Configure Service**
   - Service name: `savings-groups-platform`
   - Virtual CPU: 0.25 vCPU
   - Virtual memory: 0.5 GB
   - Port: 5000

5. **Configure Auto-scaling** (optional)
   - Max concurrency: 100
   - Max size: 3
   - Min size: 1

6. **Configure Health Check**
   - Protocol: HTTP
   - Path: `/ping`
   - Interval: 10 seconds
   - Timeout: 5 seconds
   - Healthy threshold: 1
   - Unhealthy threshold: 5

7. **Deploy**
   - Click "Create & deploy"
   - App Runner will automatically:
     - Clone your GitHub repo
     - Build the Docker image
     - Deploy and run it
     - Provide a public URL

## Advantages:
✅ No file uploads needed
✅ Deploys directly from GitHub
✅ Automatic builds on code changes
✅ Built-in load balancing
✅ Auto-scaling
✅ HTTPS included
✅ Custom domain support
✅ Much simpler than ECS

## Expected Result:
- Public URL: `https://xyz123.us-east-1.awsapprunner.com`
- Automatic deployments when you push to GitHub
- Built-in monitoring and logs