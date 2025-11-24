# 🚀 Quick Start: Deploy Backend for GitHub Pages

Since your frontend is already on GitHub Pages, you need to deploy the backend separately.

## 🎯 Choose Your Platform

**Recommended:** Railway (easiest) or Render (free tier)

- **Railway:** https://railway.app (See `DEPLOY_BACKEND_RAILWAY.md`)
- **Render:** https://render.com (See `DEPLOY_BACKEND_RENDER.md`)

---

## 📋 Quick Steps (Railway - Recommended)

### 1. Deploy Backend (5 minutes)

1. Go to https://railway.app
2. Sign up with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Select your repository
5. **Settings** → **Root Directory:** `server`
6. **Variables** → Add:
   ```
   GCS_BUCKET_NAME=tax-delinquent-files
   GCS_CREDENTIALS=<paste JSON from config/gcs-credentials.json>
   ```
7. **Settings** → **Generate Domain** → Copy the URL

### 2. Add Secret to GitHub (2 minutes)

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret:**
   - Name: `VITE_API_URL`
   - Value: `https://your-app.railway.app` (your Railway domain)
4. Click **"Add secret"**

### 3. Redeploy Frontend (1 minute)

1. Go to **Actions** tab
2. Click **"Deploy to GitHub Pages"**
3. Click **"Run workflow"** → **"Run workflow"**

---

## ✅ Done!

Your backend is now live and your frontend will automatically use it!

---

## 🔍 Verify It Works

1. Go to your GitHub Pages site
2. Upload a file in the **File History** tab
3. Check your GCS bucket - file should appear!

---

## 📚 Detailed Guides

- **Railway:** See `DEPLOY_BACKEND_RAILWAY.md`
- **Render:** See `DEPLOY_BACKEND_RENDER.md`

---

**That's it!** 🎉

