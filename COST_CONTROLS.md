# Cost Controls & API Limits

## Budget: $10/month

To prevent cost overruns and crashes, the following limits have been implemented:

## File Processing Limits

- **Daily Quota**: 10 file uploads per day per IP
- **Hourly Quota**: 3 file uploads per hour per IP
- **File Size Limit**: 20MB per file (reduced from 50MB)
- **Reason**: File processing is expensive (CPU, memory, GCS operations)

## Status-Related API Limits (J, A, P)

- **Daily Quota**: 500 status-related requests per day per IP
- **Hourly Quota**: 100 status-related requests per hour per IP
- **Per-Minute Limit**: 100 requests per minute per IP
- **Applies to**:
  - `/api/process-file` - Processes Excel and detects J/A/P status changes
  - `/api/load-properties` - Loads properties containing J/A/P status
  - `/api/save-properties` - Saves properties containing J/A/P status
  - Any requests with J/A/P status filters

## General API Limits

- **Daily Quota**: 1,000 general requests per day per IP
- **Hourly Quota**: 200 general requests per hour per IP
- **Applies to**: All other API endpoints

## Google Cloud Storage (GCS) Limits

- **Daily Quota**: 200 GCS operations per day per IP
- **Reason**: GCS read/write operations cost money
- **Applies to**: File uploads, downloads, deletions

## Error Messages

When limits are exceeded, you'll receive:
- **429 Too Many Requests** status code
- Clear error message explaining the limit
- `retryAfter` field indicating when to try again

## Checking Limits

Call `/health` endpoint to see current limits:
```bash
curl https://your-api-url/health
```

Response includes all current limits:
```json
{
  "status": "ok",
  "limits": {
    "fileProcessing": {
      "perDay": 10,
      "perHour": 3,
      "maxSizeMB": 20
    },
    "statusRequests": {
      "perDay": 500,
      "perHour": 100
    },
    "generalRequests": {
      "perDay": 1000,
      "perHour": 200
    },
    "gcsOperations": {
      "perDay": 200
    }
  }
}
```

## Cost Estimation

Based on Google Cloud pricing (as of 2024):
- **Cloud Run**: ~$0.40 per million requests (free tier: 2M requests/month)
- **Cloud Storage**: ~$0.020 per GB stored, $0.05 per 10,000 operations
- **Compute**: ~$0.00002400 per vCPU-second

With these limits:
- **File Processing**: 10 files/day × 30 days = 300 files/month
- **Status Requests**: 500/day × 30 days = 15,000 requests/month
- **Estimated Cost**: Well under $10/month

## Adjusting Limits

To adjust limits, modify `COST_LIMITS` in `server/index.js`:

```javascript
const COST_LIMITS = {
  PROCESS_FILE_PER_DAY: 10,
  PROCESS_FILE_PER_HOUR: 3,
  PROCESS_FILE_SIZE_MB: 20,
  STATUS_REQUESTS_PER_DAY: 500,
  STATUS_REQUESTS_PER_HOUR: 100,
  GENERAL_REQUESTS_PER_DAY: 1000,
  GENERAL_REQUESTS_PER_HOUR: 200,
  GCS_OPERATIONS_PER_DAY: 200,
};
```

## Tips to Stay Within Budget

1. **Batch operations**: Process multiple properties in one request
2. **Cache results**: Don't reload properties unnecessarily
3. **Compress files**: Smaller files = faster processing = lower costs
4. **Monitor usage**: Check `/health` endpoint regularly
5. **Use filters**: Only load properties you need (filter by status)

