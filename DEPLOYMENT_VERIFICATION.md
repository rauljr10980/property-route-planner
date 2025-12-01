# Deployment Verification & Configuration

## Repository Information
- **GitHub Repository**: `rauljr10980/property-route-planner`
- **GitHub Pages URL**: `https://rauljr10980.github.io/property-route-planner/`
- **Backend API URL**: `https://gcs-api-server-989612961740.us-central1.run.app`
- **Google Cloud Project**: `tax-delinquent-software`
- **GCS Bucket**: `tax-delinquent-files`
- **Cloud Run Service**: `gcs-api-server`
- **Region**: `us-central1`

## Frontend Configuration

### Environment Variables (GitHub Secrets)
1. **VITE_API_URL**: `https://gcs-api-server-989612961740.us-central1.run.app`
   - Used in: `src/services/gcsStorage.ts`
   - Fallback: `http://localhost:3001` (for local development)

2. **VITE_GOOGLE_MAPS_API_KEY**: Your Google Maps API key
   - Used in: `src/App.tsx`
   - Required for: Maps display and geocoding

### Build Configuration
- **Base Path**: `/property-route-planner/` (matches repository name)
- **Config File**: `vite.config.ts` line 12
- **Build Output**: `dist/` directory

### Application Name
- **Display Name**: "Real Estate Acquisitions"
- **Page Title**: "Real Estate Acquisitions"
- **Files Updated**: 
  - `src/App.tsx` (line 18)
  - `index.html` (line 7)

## Backend Configuration

### CORS Allowed Origins
The backend (`server/index.js`) allows requests from:
- `https://rauljr10980.github.io` (base domain)
- `https://rauljr10980.github.io/property-route-planner` (full GitHub Pages URL)
- `http://localhost:3000` (local dev)
- `http://localhost:5173` (Vite dev server)
- `http://127.0.0.1:3000` (local dev)
- `http://127.0.0.1:5173` (local dev)

### Environment Variables (Cloud Run)
- **GCS_BUCKET_NAME**: `tax-delinquent-files`
- **GCS_CREDENTIALS**: Secret reference to `gcs-credentials`
- **NODE_ENV**: `production` (default)

### Deployment Command
```powershell
gcloud run deploy gcs-api-server `
  --source ./server `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" `
  --set-secrets "GCS_CREDENTIALS=gcs-credentials:latest" `
  --memory 1Gi `
  --timeout 600 `
  --max-instances 10
```

## GitHub Actions Workflow

### Workflow File
- **Location**: `.github/workflows/deploy.yml`
- **Triggers**: Push to `main` or `master` branch, or manual trigger
- **Build Environment Variables**:
  - `VITE_GOOGLE_MAPS_API_KEY`: From GitHub Secrets
  - `VITE_API_URL`: From GitHub Secrets

### Deployment Steps
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build with environment variables
5. Upload artifact to GitHub Pages
6. Deploy to GitHub Pages

## Verification Checklist

### Frontend
- [x] Repository name matches base path in `vite.config.ts`
- [x] App name updated to "Real Estate Acquisitions"
- [x] API URL uses environment variable with fallback
- [x] Google Maps API key uses environment variable
- [x] GitHub Actions workflow includes both secrets

### Backend
- [x] CORS includes full GitHub Pages URL
- [x] CORS includes base domain for flexibility
- [x] GCS bucket name is correct
- [x] Cloud Run service name is correct
- [x] Project ID is correct

### Deployment
- [x] GitHub Secrets configured:
  - `VITE_API_URL`
  - `VITE_GOOGLE_MAPS_API_KEY`
- [x] GitHub Pages enabled with GitHub Actions source
- [x] Google Cloud Run service deployed and accessible
- [x] GCS credentials secret created in Google Cloud

## Testing URLs

### Production
- **Frontend**: https://rauljr10980.github.io/property-route-planner/
- **Backend API**: https://gcs-api-server-989612961740.us-central1.run.app/api/list

### Local Development
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001 (if running locally)

## Troubleshooting

### CORS Errors
- Verify the GitHub Pages URL is in the CORS allowed origins list
- Check that the request is coming from the correct origin
- Ensure `credentials: true` is set in CORS config

### API Connection Issues
- Verify `VITE_API_URL` secret is set correctly in GitHub
- Check that the backend Cloud Run service is running
- Verify the backend URL is accessible (not returning 404)

### Build Failures
- Ensure all GitHub Secrets are set
- Check that the repository name matches the base path
- Verify Node.js version compatibility (20.x)

## Files Modified for Verification
- `server/index.js` - CORS configuration updated
- `vite.config.ts` - Base path verified
- `src/services/gcsStorage.ts` - API URL configuration verified
- `src/App.tsx` - App name and API key configuration verified
- `index.html` - Page title verified
- `.github/workflows/deploy.yml` - Environment variables verified

