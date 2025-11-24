# Deploy to Cloud Run using Secret Manager (more reliable)

Write-Host "Setting up Secret Manager..." -ForegroundColor Cyan

# Step 1: Create secret (if it doesn't exist)
Write-Host ""
Write-Host "Creating secret..." -ForegroundColor Yellow

# Check if secret exists
$secretExists = gcloud secrets describe gcs-credentials --project=tax-delinquent-software 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Secret already exists, updating..." -ForegroundColor Yellow
    # Update existing secret
    gcloud secrets versions add gcs-credentials `
      --data-file=config/gcs-credentials.json `
      --project=tax-delinquent-software
} else {
    Write-Host "   Creating new secret..." -ForegroundColor Yellow
    # Create new secret
    gcloud secrets create gcs-credentials `
      --data-file=config/gcs-credentials.json `
      --project=tax-delinquent-software
}

# Step 2: Grant Cloud Run service account access
Write-Host ""
Write-Host "Granting permissions..." -ForegroundColor Yellow
$projectNumber = gcloud projects describe tax-delinquent-software --format="value(projectNumber)"
$serviceAccount = "$projectNumber-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding gcs-credentials `
  --member="serviceAccount:$serviceAccount" `
  --role="roles/secretmanager.secretAccessor" `
  --project=tax-delinquent-software

# Step 3: Deploy
Write-Host ""
Write-Host "Deploying to Cloud Run..." -ForegroundColor Cyan
Write-Host "   This may take 2-3 minutes..." -ForegroundColor Yellow

gcloud run deploy gcs-api-server `
  --source ./server `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" `
  --set-secrets "GCS_CREDENTIALS=gcs-credentials:latest" `
  --memory 512Mi `
  --timeout 300 `
  --max-instances 10

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Copy the Service URL from above" -ForegroundColor Yellow
    Write-Host "   2. Add it to GitHub Secrets as VITE_API_URL" -ForegroundColor Yellow
    Write-Host "   3. Redeploy frontend" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Deployment failed. Check the error above." -ForegroundColor Red
}

