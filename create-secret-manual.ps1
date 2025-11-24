# Manual secret creation - run this first

Write-Host "Creating secret..." -ForegroundColor Yellow

gcloud secrets create gcs-credentials `
  --data-file=config/gcs-credentials.json `
  --project=tax-delinquent-software

if ($LASTEXITCODE -eq 0) {
    Write-Host "Secret created successfully!" -ForegroundColor Green
    Write-Host "Now run: .\deploy-with-secret.ps1" -ForegroundColor Cyan
} else {
    Write-Host "Error creating secret. Check the error above." -ForegroundColor Red
}

