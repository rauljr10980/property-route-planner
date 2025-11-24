# 🚀 Deploy Backend to Render - Step by Step

## Step 1: Sign Up for Render

1. Go to **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended - connects your repo automatically)
4. Authorize Render to access your GitHub account

---

## Step 2: Create New Web Service

1. Once logged in, click **"New +"** button (top right)
2. Select **"Web Service"**
3. Click **"Connect account"** if you haven't connected GitHub yet
4. Select your repository: **`property-route-planner`**
5. Click **"Connect"**

---

## Step 3: Configure Your Service

Fill in these settings:

### Basic Settings:
- **Name:** `gcs-api-server` (or any name you like)
- **Region:** Choose closest to you (e.g., `Oregon (US West)`)
- **Branch:** `main` (or `master` if that's your branch)
- **Root Directory:** `server` ⚠️ **IMPORTANT: This tells Render where your backend code is**

### Build & Deploy:
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

---

## Step 4: Add Environment Variables

Scroll down to **"Environment Variables"** section and click **"Add Environment Variable"** for each:

### Variable 1:
- **Key:** `GCS_BUCKET_NAME`
- **Value:** `tax-delinquent-files`
- Click **"Save"**

### Variable 2:
- **Key:** `GCS_CREDENTIALS`
- **Value:** (See instructions below)
- Click **"Save"**

### Variable 3:
- **Key:** `PORT`
- **Value:** `3001`
- Click **"Save"`

---

## Step 5: Get GCS Credentials JSON

1. Open the file: `config/gcs-credentials.json`
2. **Copy the ENTIRE contents** (all the JSON)
3. In Render, paste it as the value for `GCS_CREDENTIALS`
   - Render supports multi-line JSON, so paste the whole thing
   - It should look like: `{"type":"service_account","project_id":"tax-delinquent-software",...}`

---

## Step 6: Deploy!

1. Scroll to the bottom
2. Click **"Create Web Service"**
3. Wait for deployment (takes 2-3 minutes)
4. You'll see build logs in real-time
5. Once deployed, you'll see: **"Your service is live at https://gcs-api-server.onrender.com"**
6. **Copy this URL** - you'll need it next!

---

## Step 7: Test Your Backend

1. Open the URL in a new tab: `https://your-service.onrender.com/health`
2. You should see: `{"status":"ok","message":"GCS API Server is running"}`
3. ✅ If you see this, your backend is working!

---

## Step 8: Add Backend URL to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/rauljr10980/property-route-planner`
2. Click **"Settings"** tab
3. Click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"**
5. Fill in:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-service.onrender.com` (the URL from Step 6)
6. Click **"Add secret"**

---

## Step 9: Redeploy Frontend

1. Go to **"Actions"** tab in your GitHub repository
2. Click **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** button (top right)
4. Click **"Run workflow"** again in the dropdown
5. Wait for deployment to complete (~2 minutes)

---

## ✅ Done!

Your backend is now live and your frontend will automatically use it!

---

## 🔍 Verify Everything Works

1. Go to your GitHub Pages site
2. Open browser console (F12)
3. Upload a file in the **File History** tab
4. Check console - should see API calls to your Render backend
5. Check your Google Cloud Storage bucket - file should appear!

---

## 💡 Tips

- **Free tier note:** Render free tier services may "sleep" after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up.
- **Upgrade option:** $7/month for always-on service (no sleep)
- **Monitoring:** Check Render dashboard for logs and metrics

---

## 🆘 Troubleshooting

**Backend won't start?**
- Check build logs in Render dashboard
- Verify `Root Directory` is set to `server`
- Check environment variables are correct

**Frontend can't connect?**
- Verify `VITE_API_URL` secret is set correctly
- Check backend URL is accessible: `https://your-service.onrender.com/health`
- Make sure you redeployed frontend after adding secret

**GCS errors?**
- Verify `GCS_CREDENTIALS` is valid JSON
- Check bucket name matches: `tax-delinquent-files`
- Verify service account has proper permissions

---

**Ready? Let's deploy!** 🚀

