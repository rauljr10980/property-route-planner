# Fix: Cloud Run Deployment Issue

The deployment failed because the JSON credentials aren't being passed correctly. Let's use Secret Manager instead.

## Option 1: Use Secret Manager (Recommended)

### Step 1: Create Secret
```powershell
cd C:\Users\Raulm\PR
gcloud secrets create gcs-credentials --data-file=config/gcs-credentials.json --project=tax-delinquent-software
```

### Step 2: Grant Cloud Run Access
```powershell
# Get your service account email (from the credentials file)
# It should be: service-account@tax-delinquent-software.iam.gserviceaccount.com

gcloud secrets add-iam-policy-binding gcs-credentials `
  --member="serviceAccount:989612961740-compute@developer.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor" `
  --project=tax-delinquent-software
```

### Step 3: Deploy with Secret
```powershell
gcloud run deploy gcs-api-server `
  --source ./server `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" `
  --set-secrets "GCS_CREDENTIALS=gcs-credentials:latest" `
  --memory 512Mi `
  --timeout 300 `
  --max-instances 10
```

---

## Option 2: Fix JSON Escaping (Simpler)

The issue might be PowerShell escaping. Try this:

```powershell
cd C:\Users\Raulm\PR

# Read and properly escape JSON
$jsonContent = Get-Content -Path "config/gcs-credentials.json" -Raw
$jsonEscaped = $jsonContent -replace '"', '\"'

# Deploy
gcloud run deploy gcs-api-server `
  --source ./server `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files,GCS_CREDENTIALS=$jsonContent" `
  --memory 512Mi `
  --timeout 300 `
  --max-instances 10
```

---

## Option 3: Check Logs First

1. Go to: https://console.cloud.google.com/logs/viewer?project=tax-delinquent-software
2. Filter by: `resource.type="cloud_run_revision"` AND `resource.labels.service_name="gcs-api-server"`
3. Look for error messages
4. Share the error with me

---

## Quick Fix: Try Option 2 First

Run this in PowerShell:

```powershell
cd C:\Users\Raulm\PR
$jsonContent = Get-Content -Path "config/gcs-credentials.json" -Raw
gcloud run deploy gcs-api-server --source ./server --region us-central1 --allow-unauthenticated --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files,GCS_CREDENTIALS=$jsonContent" --memory 512Mi --timeout 300 --max-instances 10
```

