# Deploy Backend to Google Cloud Run
# Run this from the project root directory

Write-Host "🚀 Deploying to Google Cloud Run..." -ForegroundColor Green

# Check if gcloud is installed
try {
    $null = gcloud --version
} catch {
    Write-Host "❌ Google Cloud CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Check if authenticated
Write-Host "`n📋 Checking authentication..." -ForegroundColor Cyan
gcloud auth list

# Set project
Write-Host "`n🔧 Setting project to tax-delinquent-software..." -ForegroundColor Cyan
gcloud config set project tax-delinquent-software

# Read credentials
Write-Host "`n📁 Reading GCS credentials..." -ForegroundColor Cyan
if (-not (Test-Path "config/gcs-credentials.json")) {
    Write-Host "❌ Credentials file not found: config/gcs-credentials.json" -ForegroundColor Red
    exit 1
}

$jsonContent = Get-Content -Path "config/gcs-credentials.json" -Raw

# Deploy
Write-Host "`n🚀 Deploying to Cloud Run..." -ForegroundColor Cyan
Write-Host "   This may take 2-3 minutes..." -ForegroundColor Yellow

gcloud run deploy gcs-api-server `
  --source ./server `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" `
  --set-env-vars "GCS_CREDENTIALS=$jsonContent" `
  --memory 512Mi `
  --timeout 300 `
  --max-instances 10

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Copy the Service URL from above" -ForegroundColor Yellow
    Write-Host "   2. Add it to GitHub Secrets as VITE_API_URL" -ForegroundColor Yellow
    Write-Host "   3. Redeploy frontend" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Deployment failed. Check the error above." -ForegroundColor Red
}

