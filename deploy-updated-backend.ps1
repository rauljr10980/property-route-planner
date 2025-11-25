# Deploy Updated Backend to Cloud Run
# This script deploys the updated server code with optimized column extraction

Write-Host "`n🚀 Deploying updated backend to Cloud Run..." -ForegroundColor Cyan

# Set project
$project = "tax-delinquent-software"
$service = "gcs-api-server"
$region = "us-central1"

Write-Host "`n📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Project: $project"
Write-Host "  Service: $service"
Write-Host "  Region: $region"
Write-Host "  Source: ./server"

# Check if gcloud is available
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "`n❌ gcloud CLI not found in PATH" -ForegroundColor Red
    Write-Host "`nPlease install Google Cloud CLI or add it to your PATH" -ForegroundColor Yellow
    Write-Host "Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "`nOr run this command manually in a terminal where gcloud is available:" -ForegroundColor Yellow
    Write-Host "  gcloud run deploy $service --source ./server --region $region --allow-unauthenticated --set-env-vars `"GCS_BUCKET_NAME=tax-delinquent-files`" --set-secrets `"GCS_CREDENTIALS=gcs-credentials:latest`" --memory 1Gi --timeout 600 --max-instances 10" -ForegroundColor Cyan
    exit 1
}

Write-Host "`n✅ gcloud found at: $($gcloudPath.Source)" -ForegroundColor Green

# Deploy command
Write-Host "`n📤 Deploying..." -ForegroundColor Yellow
Write-Host "This may take 3-5 minutes..." -ForegroundColor Gray

gcloud run deploy $service `
  --source ./server `
  --region $region `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" `
  --set-secrets "GCS_CREDENTIALS=gcs-credentials:latest" `
  --memory 1Gi `
  --timeout 600 `
  --max-instances 10

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "`nThe updated backend is now live with optimized column extraction." -ForegroundColor Green
    Write-Host "You can now test uploading your large Excel file." -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Deployment failed. Check the error above." -ForegroundColor Red
}

