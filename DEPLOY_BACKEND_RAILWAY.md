# 🚀 Deploy Backend to Railway (Recommended - Easiest)

Railway is the easiest way to deploy your backend. **Free tier available!**

## Step 1: Sign Up

1. Go to https://railway.app
2. Sign up with GitHub (easiest)
3. Click **"New Project"**

## Step 2: Deploy from GitHub

1. Click **"Deploy from GitHub repo"**
2. Select your repository: `property-route-planner` (or your repo name)
3. Railway will detect the `server/` directory

## Step 3: Configure Settings

1. **Set Root Directory:**
   - Click on your service
   - Go to **"Settings"** tab
   - Set **Root Directory:** `server`

2. **Add Environment Variables:**
   - Go to **"Variables"** tab
   - Add these variables:

   ```
   GCS_BUCKET_NAME=tax-delinquent-files
   GCS_CREDENTIALS=<paste your entire JSON credentials here>
   PORT=3001
   ```

   **To get GCS_CREDENTIALS:**
   - Open `config/gcs-credentials.json`
   - Copy the entire JSON content
   - Paste it as the value for `GCS_CREDENTIALS` (keep it as one line, or use Railway's JSON editor)

## Step 4: Deploy

1. Railway will automatically deploy
2. Wait for deployment to complete
3. Click on your service → **"Settings"** → **"Generate Domain"**
4. Copy the domain (e.g., `your-app.railway.app`)

## Step 5: Update Frontend

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Add new secret:
   - Name: `VITE_API_URL`
   - Value: `https://your-app.railway.app` (your Railway domain)

4. Update `.github/workflows/deploy.yml` (I'll do this for you)

## Step 6: Redeploy Frontend

1. Push any change to trigger deployment
2. Or manually trigger: **Actions** → **Deploy to GitHub Pages** → **Run workflow**

---

## ✅ Done!

Your backend is now live and your frontend will use it automatically!

---

## 💰 Pricing

- **Free tier:** $5 credit/month (usually enough for small apps)
- **Hobby:** $5/month (if you exceed free tier)

---

**Railway is the easiest option!** 🚀

