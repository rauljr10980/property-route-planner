# 🚀 Google Cloud Storage Integration - Deployment Checklist

## ✅ What's Been Created:

### 1. Backend API Files:
- ✅ **`api/upload.js`** - Serverless function for file uploads/downloads
- ✅ **`vercel.json`** - Vercel deployment configuration

### 2. Frontend Service:
- ✅ **`src/services/storageService.ts`** - React service for API calls

### 3. Configuration:
- ✅ **`config/gcs-credentials.json`** - Your credentials (protected in `.gitignore`)
- ✅ **`scripts/extract-gcs-credentials.js`** - Helper to extract env variables

### 4. Documentation:
- ✅ **`GITHUB_STORAGE_SETUP.md`** - Complete setup guide
- ✅ **`DEPLOYMENT_CHECKLIST.md`** - This file

---

## 📋 Step-by-Step Deployment:

### Step 1: Create Storage Bucket ⏳

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/storage/browser

2. **Create bucket:**
   - Click **"Create bucket"**
   - **Name:** `tax-delinquent-files-[your-unique-id]`
     - Example: `tax-delinquent-files-raulm-123`
     - Must be globally unique
   - **Location:** Choose region (e.g., `us-east1`)
   - **Storage class:** `Standard`
   - **Access control:** `Uniform`
   - Click **"Create"**

3. **Note your bucket name!** 📝

---

### Step 2: Set Up Vercel (For Serverless Functions)

1. **Sign up/Login:**
   - Go to: https://vercel.com
   - Sign in with **GitHub** (same account as your repo)

2. **Import Repository:**
   - Click **"Add New Project"** or **"Import"**
   - Find **`property-route-planner`** repository
   - Click **"Import"**

3. **Configure Project:**
   - **Framework Preset:** `Vite` (auto-detected)
   - **Root Directory:** `.` (root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - Click **"Deploy"** (we'll add env vars next)

4. **Wait for initial deployment** (~2 minutes)

---

### Step 3: Add Environment Variables to Vercel

1. **Go to Vercel Dashboard:**
   - Select your project
   - Go to **Settings** → **Environment Variables**

2. **Add these variables:**

   Run this command to get values:
   ```bash
   node scripts/extract-gcs-credentials.js
   ```

   **Add each variable:**
   - **GCS_PROJECT_ID** = `tax-delinquent-software`
   - **GCS_BUCKET_NAME** = `[your-bucket-name]` (from Step 1)
   - **GCS_PRIVATE_KEY_ID** = (from script output)
   - **GCS_PRIVATE_KEY** = (from script output - full key with \n)
   - **GCS_CLIENT_EMAIL** = `service-account@tax-delinquent-software.iam.gserviceaccount.com`
   - **GCS_CLIENT_ID** = (from script output)
   - **GCS_CLIENT_X509_CERT_URL** = (from script output)

3. **Important for GCS_PRIVATE_KEY:**
   - Copy the ENTIRE key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - The `\n` characters should already be in the JSON file
   - Paste exactly as shown

4. **Select environment:** 
   - Check all: **Production**, **Preview**, **Development**

5. **Click "Save"** for each variable

---

### Step 4: Redeploy Vercel

1. **Go to Deployments tab**
2. Click **"..."** (three dots) on latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (~2 minutes)

5. **Get your API URL:**
   - Look at deployment URL: `https://your-app-xyz.vercel.app`
   - Your API will be at: `https://your-app-xyz.vercel.app/api/upload`

---

### Step 5: Update React App with API URL

1. **Create `.env.local` file:**
   ```env
   VITE_API_URL=https://your-app-xyz.vercel.app/api
   ```

2. **Update GitHub Secrets:**
   - Go to: https://github.com/rauljr10980/property-route-planner/settings/secrets/actions
   - Click **"New repository secret"**
   - Name: `VITE_API_URL`
   - Value: `https://your-app-xyz.vercel.app/api`
   - Click **"Add secret"**

3. **Update `.github/workflows/deploy.yml`:**
   - Already done! ✅ (It's configured to use `VITE_API_URL` secret)

---

### Step 6: Update FileHistory Component

**I'll do this next** - but we need:
- ✅ API URL configured
- ✅ Vercel deployed
- ✅ Bucket created

Then I'll update `FileHistory.tsx` to use cloud storage instead of localStorage.

---

### Step 7: Test Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local`:**
   ```env
   VITE_API_URL=https://your-app-xyz.vercel.app/api
   VITE_GOOGLE_MAPS_API_KEY=your_key_here
   ```

3. **Run dev server:**
   ```bash
   npm run dev
   ```

4. **Test file upload:**
   - Upload a test Excel file
   - Check if it uploads to Google Cloud Storage

---

### Step 8: Commit and Push to GitHub

1. **Commit all files:**
   ```bash
   git add .
   git commit -m "Add Google Cloud Storage integration"
   git push
   ```

2. **GitHub Actions will deploy:**
   - Automatically builds and deploys to GitHub Pages
   - Uses secrets from GitHub repository

---

## 🔐 Security Checklist:

- [x] Credentials file in `.gitignore`
- [x] No credentials committed to git
- [x] Environment variables in Vercel (not in code)
- [x] API URL in GitHub secrets (not hardcoded)
- [x] Private key not exposed in frontend

---

## 🧪 Testing Checklist:

- [ ] Bucket created successfully
- [ ] Vercel deployment works
- [ ] API endpoint accessible (`/api/upload`)
- [ ] Test file upload from React app
- [ ] Test file download
- [ ] Test file deletion
- [ ] Files appear in Google Cloud Storage bucket
- [ ] GitHub Pages deployment works

---

## 📞 Need Help?

**Common Issues:**

1. **"Bucket not found"**
   - Check bucket name in Vercel env vars
   - Make sure bucket exists in Google Cloud Console

2. **"Permission denied"**
   - Check service account has "Storage Object Admin" role
   - Verify credentials in Vercel env vars

3. **"CORS error"**
   - Check `vercel.json` has CORS headers
   - Verify API URL is correct

4. **"API not found"**
   - Check Vercel deployment URL
   - Verify `/api/upload` endpoint exists
   - Check function logs in Vercel dashboard

---

## 🎯 Current Status:

- ✅ Credentials stored securely
- ✅ Backend API created
- ✅ Frontend service created
- ✅ Vercel config created
- ⏳ **Bucket creation** (you need to do this)
- ⏳ **Vercel deployment** (you need to do this)
- ⏳ **FileHistory component update** (I'll do this after bucket is created)

---

**Next:** Create your storage bucket and tell me the name! 🚀

