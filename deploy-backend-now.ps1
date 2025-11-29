# Quick Backend Deployment Script
# This will deploy the updated server code to Cloud Run

Write-Host "`n🚀 Deploying Backend to Cloud Run..." -ForegroundColor Cyan
Write-Host "This will deploy the latest code with:" -ForegroundColor Yellow
Write-Host "  - Skip first 3 rows after header (test rows)" -ForegroundColor Gray
Write-Host "  - More lenient CAN validation (up to 100 chars)" -ForegroundColor Gray
Write-Host "  - Detailed debug logging" -ForegroundColor Gray
Write-Host ""

# Try to find gcloud
$gcloudPath = $null

# Check common locations
$possiblePaths = @(
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $gcloudPath = $path
        Write-Host "✅ Found gcloud at: $path" -ForegroundColor Green
        break
    }
}

# Also check if it's in PATH
if (-not $gcloudPath) {
    $gcloudInPath = Get-Command gcloud -ErrorAction SilentlyContinue
    if ($gcloudInPath) {
        $gcloudPath = $gcloudInPath.Source
        Write-Host "✅ Found gcloud in PATH: $gcloudPath" -ForegroundColor Green
    }
}

if (-not $gcloudPath) {
    Write-Host "`n❌ gcloud CLI not found!" -ForegroundColor Red
    Write-Host "`nPlease install Google Cloud CLI:" -ForegroundColor Yellow
    Write-Host "  Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
    Write-Host "`nOr run this command manually in a terminal where gcloud is available:" -ForegroundColor Yellow
    Write-Host "  gcloud run deploy gcs-api-server --source ./server --region us-central1 --allow-unauthenticated --set-env-vars `"GCS_BUCKET_NAME=tax-delinquent-files`" --set-secrets `"GCS_CREDENTIALS=gcs-credentials:latest`" --memory 1Gi --timeout 600 --max-instances 10" -ForegroundColor Cyan
    Write-Host "`nOr deploy via Google Cloud Console:" -ForegroundColor Yellow
    Write-Host "  https://console.cloud.google.com/run?project=tax-delinquent-software" -ForegroundColor Cyan
    exit 1
}

Write-Host "`n📤 Deploying..." -ForegroundColor Yellow
Write-Host "This may take 3-5 minutes..." -ForegroundColor Gray
Write-Host ""

# Deploy command
& $gcloudPath run deploy gcs-api-server `
  --source ./server `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" `
  --set-secrets "GCS_CREDENTIALS=gcs-credentials:latest" `
  --memory 1Gi `
  --timeout 600 `
  --max-instances 10

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "`nThe updated backend is now live with:" -ForegroundColor Green
    Write-Host "  ✅ Skip first 3 rows after header" -ForegroundColor Gray
    Write-Host "  ✅ More lenient validation" -ForegroundColor Gray
    Write-Host "  ✅ Better error logging" -ForegroundColor Gray
    Write-Host "`nYou can now try uploading your file again!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Deployment failed. Check the error above." -ForegroundColor Red
}

