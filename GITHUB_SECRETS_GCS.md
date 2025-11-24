# 🔐 Add GitHub Secrets for GCS Backend

After deploying your backend, add this secret to GitHub:

## Step 1: Get Your Backend URL

After deploying to Railway/Render, you'll get a URL like:
- Railway: `https://your-app.railway.app`
- Render: `https://your-service.onrender.com`

## Step 2: Add Secret to GitHub

1. Go to your GitHub repository
2. Click **"Settings"** tab
3. Click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"**
5. Fill in:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-backend-url.com` (your Railway/Render URL)
6. Click **"Add secret"**

## Step 3: Redeploy

1. Go to **"Actions"** tab
2. Click **"Deploy to GitHub Pages"**
3. Click **"Run workflow"** → **"Run workflow"**

---

## ✅ That's It!

Your frontend will now use your deployed backend instead of localhost!

---

## 🔍 Verify

After redeployment:
1. Go to your GitHub Pages site
2. Open browser console (F12)
3. Try uploading a file
4. Check Network tab - should see requests to your backend URL (not localhost)

---

**Done!** 🎉

