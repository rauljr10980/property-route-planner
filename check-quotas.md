# Google Cloud Quota Check Guide

## Current Application Limits (in server/index.js)

These are **application-level** limits to control costs:
- **File Uploads**: 10 per day, 20 per hour
- **File Size**: 20MB max
- **Status Requests**: 500 per day, 100 per hour
- **General Requests**: 1000 per day, 200 per hour
- **GCS Operations**: 200 per day

## Google Cloud Service Quotas (Actual Limits)

These are **Google Cloud platform** limits that might be blocking you:

### 1. Google Cloud Run Quotas
- **Concurrent Requests**: Default 80, can request increase to 1000+
- **CPU**: Default 1 vCPU, can increase
- **Memory**: Default 512MB, can increase
- **Request Timeout**: Default 300s (5 minutes)

### 2. Google Cloud Storage Quotas
- **Class A Operations** (writes): 5,000 per day (free tier)
- **Class B Operations** (reads): 50,000 per day (free tier)
- **Storage**: 5GB free, then pay per GB

### 3. Billing Quotas
- Check if you have billing enabled
- Check if you've hit spending limits

## How to Check & Increase Quotas

### Step 1: Check Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Select your project
3. Go to "IAM & Admin" > "Quotas"
4. Search for:
   - "Cloud Run" quotas
   - "Cloud Storage" quotas
   - "API requests" quotas

### Step 2: Check Current Usage
1. Go to "Cloud Run" > Your service
2. Check "Metrics" tab for:
   - Request count
   - Error rate
   - Latency
   - CPU/Memory usage

### Step 3: Request Quota Increase (if needed)
1. In Quotas page, select the quota
2. Click "Edit Quotas"
3. Request increase (usually approved quickly)

## Common Issues & Solutions

### Issue: "429 Too Many Requests"
**Solution**: Increase application limits in `server/index.js`:
```javascript
PROCESS_FILE_PER_DAY: 50,  // Increase from 10
PROCESS_FILE_PER_HOUR: 50, // Increase from 20
```

### Issue: "503 Service Unavailable" or Timeouts
**Solution**: Increase Cloud Run resources:
- CPU: 2-4 vCPU
- Memory: 2-4GB
- Timeout: 900s (15 minutes) for long CAD fetching

### Issue: "Quota Exceeded" from Google Cloud
**Solution**: Request quota increase in Google Cloud Console

### Issue: CAD Fetching Taking Too Long
**Solution**: 
- Process in smaller batches
- Increase Cloud Run timeout
- Use background jobs/queues

## Quick Fix: Increase Application Limits

If you're hitting application limits (not Google Cloud quotas), we can increase them:

```javascript
const COST_LIMITS = {
  PROCESS_FILE_PER_DAY: 50,        // Increase from 10
  PROCESS_FILE_PER_HOUR: 50,       // Increase from 20
  PROCESS_FILE_SIZE_MB: 50,         // Increase from 20
  // ... other limits
};
```

