# 🚀 AWS App Runner Deployment Guide

**No file uploads needed! Deploy directly from GitHub.**

## 📋 Prerequisites
- ✅ Code pushed to GitHub (use GitHub Desktop)
- ✅ AWS Console access
- ✅ apprunner.yaml file in repository root

## 🎯 Step-by-Step Deployment

### 1. Push Code to GitHub
Use GitHub Desktop to commit and push:
- All the login fixes
- apprunner.yaml configuration
- Dockerfile.minimal
- All deployment scripts

### 2. Deploy via AWS App Runner Console

1. **Open AWS Console** → Search "App Runner" → Click "Create service"

2. **Configure Source**
   - ✅ Source type: **"Source code repository"**
   - ✅ Repository provider: **"GitHub"** 
   - ✅ Click **"Connect to GitHub"** (authorize AWS)
   - ✅ Repository: Select **"testdriven-app"**
   - ✅ Branch: **"main"**
   - ✅ Source directory: **"/"** (root)

3. **Configure Build**
   - ✅ Configuration file: **"Use configuration file"**
   - ✅ Configuration file: **"apprunner.yaml"**

4. **Configure Service**
   - ✅ Service name: **"savings-groups-platform"**
   - ✅ Virtual CPU: **0.25 vCPU**
   - ✅ Virtual memory: **0.5 GB**
   - ✅ Port: **5000**

5. **Configure Health Check**
   - ✅ Protocol: **HTTP**
   - ✅ Path: **/ping**
   - ✅ Interval: **10 seconds**
   - ✅ Timeout: **5 seconds**
   - ✅ Healthy threshold: **1**
   - ✅ Unhealthy threshold: **5**

6. **Deploy**
   - ✅ Click **"Create & deploy"**
   - ⏳ Wait 5-10 minutes for build and deployment
   - 🎉 Get your public URL!

## 🎯 Expected Results

### ✅ What App Runner Will Do:
1. **Clone** your GitHub repository
2. **Build** using Dockerfile.minimal
3. **Deploy** to AWS infrastructure
4. **Provide** a public HTTPS URL
5. **Auto-scale** based on traffic
6. **Monitor** health with /ping endpoint

### 🌐 Your App Will Be Available At:
```
https://xyz123.us-east-1.awsapprunner.com
```

### 👥 Test Login Credentials:
- **Super Admin**: superadmin@testdriven.io / superpassword123
- **Service Admin**: admin@savingsgroups.ug / admin123
- **Group Officer**: sarah@kampala.ug / password123
- **Group Member**: alice@kampala.ug / password123

## 🔧 Advantages of App Runner

✅ **No file uploads** - deploys from GitHub
✅ **Automatic builds** - updates when you push code
✅ **Built-in HTTPS** - secure by default
✅ **Auto-scaling** - handles traffic spikes
✅ **Load balancing** - built-in
✅ **Health monitoring** - automatic restarts
✅ **Custom domains** - can add your own domain
✅ **Cost-effective** - pay only for what you use

## 🚨 If Build Fails

Check the App Runner logs for:
1. **Docker build errors** - usually dependency issues
2. **Port configuration** - ensure port 5000 is exposed
3. **Health check failures** - /ping endpoint must respond

## 🎉 Success!

Once deployed, you'll have:
- ✅ **Live application** with public URL
- ✅ **All login issues fixed**
- ✅ **Automatic deployments** from GitHub
- ✅ **Production-ready** infrastructure
- ✅ **No more file upload headaches!**

---

**Next Steps After Deployment:**
1. Test all login flows
2. Take screenshots for documentation
3. Configure custom domain (optional)
4. Set up monitoring and alerts