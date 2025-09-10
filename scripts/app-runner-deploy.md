# AWS App Runner Deployment (Skip ECR)

AWS App Runner can deploy your application directly from GitHub without needing ECR.

## Steps:

1. **Push your code to GitHub** (you already did this)

2. **Go to AWS App Runner Console**
   - Search for "App Runner" in AWS Console
   - Click "Create service"

3. **Configure Source**
   - Source type: "Source code repository"
   - Connect to GitHub
   - Select your repository: `testdriven-app`
   - Branch: `main`

4. **Configure Build**
   - Runtime: "Docker"
   - Build command: `docker build -t app .`
   - Start command: `./start.sh`

5. **Configure Service**
   - Service name: `savings-groups-platform`
   - Port: `5000`
   - Environment variables:
     - `FLASK_ENV=production`
     - `APP_SETTINGS=project.config.ProductionConfig`

6. **Deploy**
   - App Runner will automatically build and deploy
   - You'll get a public URL like: `https://xyz.us-east-1.awsapprunner.com`

## Advantages:
- ✅ No ECR needed
- ✅ Automatic builds from GitHub
- ✅ Built-in load balancing
- ✅ Auto-scaling
- ✅ HTTPS included