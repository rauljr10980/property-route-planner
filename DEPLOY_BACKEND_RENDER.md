# 🚀 Deploy Backend to Render (Free Tier)

Render offers a free tier perfect for your backend!

## Step 1: Sign Up

1. Go to https://render.com
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**

## Step 2: Connect Repository

1. Click **"Connect account"** (if not connected)
2. Select your repository: `property-route-planner`
3. Click **"Connect"**

## Step 3: Configure Service

Fill in these settings:

- **Name:** `gcs-api-server` (or any name)
- **Region:** Choose closest to you
- **Branch:** `main` (or `master`)
- **Root Directory:** `server`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

## Step 4: Add Environment Variables

Scroll down to **"Environment Variables"** and add:

```
GCS_BUCKET_NAME=tax-delinquent-files
GCS_CREDENTIALS=<paste your entire JSON credentials>
PORT=3001
```

**To get GCS_CREDENTIALS:**
- Open `config/gcs-credentials.json`
- Copy the entire JSON content
- Paste it as the value (Render supports multi-line JSON)

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (takes 2-3 minutes)
3. Once deployed, copy your service URL (e.g., `https://gcs-api-server.onrender.com`)

## Step 6: Update Frontend

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Add new secret:
   - Name: `VITE_API_URL`
   - Value: `https://your-service.onrender.com`

4. Update `.github/workflows/deploy.yml` (I'll do this for you)

## Step 7: Redeploy Frontend

1. Push any change to trigger deployment
2. Or manually trigger: **Actions** → **Deploy to GitHub Pages** → **Run workflow**

---

## ✅ Done!

Your backend is now live!

---

## 💰 Pricing

- **Free tier:** Available (service may sleep after 15 min inactivity)
- **Starter:** $7/month (always-on)

---

**Render is great for free hosting!** 🚀

