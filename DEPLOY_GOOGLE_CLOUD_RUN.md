# 🚀 Deploy Backend to Google Cloud Run

Since you already have Google Cloud Storage set up, deploying to Cloud Run is perfect!

## ✅ Prerequisites

- ✅ Google Cloud project: `tax-delinquent-software`
- ✅ Google Cloud Storage bucket: `tax-delinquent-files`
- ✅ Service account credentials: `config/gcs-credentials.json`

---

## Step 1: Enable Cloud Run API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **`tax-delinquent-software`**
3. Go to **"APIs & Services"** → **"Library"**
4. Search for **"Cloud Run API"**
5. Click **"Enable"**

---

## Step 2: Install Google Cloud CLI (if not installed)

### Option A: Using Installer (Windows)
1. Download: https://cloud.google.com/sdk/docs/install
2. Run the installer
3. Follow the setup wizard

### Option B: Using PowerShell
```powershell
# Download and install
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe
```

---

## Step 3: Authenticate and Set Project

Open PowerShell or Command Prompt and run:

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project tax-delinquent-software

# Verify
gcloud config get-value project
```

---

## Step 4: Build and Deploy

From your project root directory (`C:\Users\Raulm\PR`), run:

```bash
# Navigate to server directory
cd server

# Build and deploy to Cloud Run
gcloud run deploy gcs-api-server \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCS_BUCKET_NAME=tax-delinquent-files \
  --set-secrets GCS_CREDENTIALS=gcs-credentials:latest
```

**Wait!** We need to create a secret first. See Step 5.

---

## Step 5: Create Secret for GCS Credentials

### Option A: Using Secret Manager (Recommended)

1. **Create secret:**
```bash
gcloud secrets create gcs-credentials \
  --data-file=../config/gcs-credentials.json \
  --project=tax-delinquent-software
```

2. **Grant Cloud Run access:**
```bash
gcloud secrets add-iam-policy-binding gcs-credentials \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@tax-delinquent-software.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Option B: Direct Environment Variable (Simpler)

Instead of secrets, you can pass credentials directly:

```bash
# Read credentials file and set as env var
$credentials = Get-Content -Path "config/gcs-credentials.json" -Raw

# Deploy with credentials as env var
gcloud run deploy gcs-api-server \
  --source ./server \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files,GCS_CREDENTIALS=$credentials"
```

**Note:** For PowerShell, you may need to escape the JSON properly.

---

## Step 6: Deploy (Simplified Method)

Since you already have the credentials file, let's use the simpler method:

```bash
# From project root
cd server

# Deploy (credentials will be read from env var or file)
gcloud run deploy gcs-api-server \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCS_BUCKET_NAME=tax-delinquent-files \
  --set-env-vars-from-file GCS_CREDENTIALS=../config/gcs-credentials.json
```

**Actually, Cloud Run doesn't support `--set-env-vars-from-file` for JSON.** Let's use a different approach:

---

## Step 6 (Alternative): Deploy with Inline Credentials

```bash
# Read the JSON file
$jsonContent = Get-Content -Path "config/gcs-credentials.json" -Raw

# Deploy
gcloud run deploy gcs-api-server `
  --source ./server `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" `
  --set-env-vars "GCS_CREDENTIALS=$jsonContent"
```

---

## Step 7: Get Your Service URL

After deployment, you'll see output like:

```
Service URL: https://gcs-api-server-xxxxx-uc.a.run.app
```

**Copy this URL!** You'll need it for the frontend.

---

## Step 8: Update Frontend

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Add/Update secret:
   - Name: `VITE_API_URL`
   - Value: `https://gcs-api-server-xxxxx-uc.a.run.app` (your Cloud Run URL)
4. Click **"Add secret"**

---

## Step 9: Redeploy Frontend

1. Go to **Actions** tab
2. Click **"Deploy to GitHub Pages"**
3. Click **"Run workflow"** → **"Run workflow"**

---

## ✅ Done!

Your backend is now running on Google Cloud Run!

---

## 🔍 Verify It Works

1. Test the health endpoint:
   ```
   https://your-service-url.run.app/health
   ```
   Should return: `{"status":"ok","message":"GCS API Server is running"}`

2. Go to your GitHub Pages site
3. Upload a file in **File History** tab
4. Check your GCS bucket - file should appear!

---

## 💰 Pricing

**Free Tier:**
- ✅ 2 million requests/month
- ✅ 360,000 GB-seconds compute
- ✅ 2 million CPU-seconds
- ✅ Always-on (doesn't sleep)

**After free tier:**
- $0.40 per million requests
- Very affordable for your use case!

---

## 🆘 Troubleshooting

**"gcloud: command not found"**
- Install Google Cloud CLI (Step 2)

**"Permission denied"**
- Run: `gcloud auth login`
- Make sure you have Cloud Run Admin role

**"API not enabled"**
- Enable Cloud Run API (Step 1)

**"Secret not found"**
- Use the inline credentials method (Step 6 Alternative)

---

## 📝 Quick Deploy Script

Save this as `deploy-cloud-run.ps1`:

```powershell
# Deploy to Google Cloud Run
$jsonContent = Get-Content -Path "config/gcs-credentials.json" -Raw

gcloud run deploy gcs-api-server `
  --source ./server `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" `
  --set-env-vars "GCS_CREDENTIALS=$jsonContent"

Write-Host "✅ Deployment complete! Copy the Service URL above."
```

Run it:
```powershell
.\deploy-cloud-run.ps1
```

---

**Ready to deploy!** 🚀

