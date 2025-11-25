# GCS Bucket Versioning Setup

## Enable Versioning for Data Backup

To enable versioning on your GCS bucket (for data backup and recovery):

### Option 1: Using gcloud CLI

```bash
# Set your bucket name
export GCS_BUCKET_NAME=tax-delinquent-files

# Enable versioning
gsutil versioning set on gs://$GCS_BUCKET_NAME

# Set lifecycle policy (keep 5 versions, delete after 30 days)
gsutil lifecycle set lifecycle.json gs://$GCS_BUCKET_NAME
```

### Option 2: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/storage)
2. Select your bucket: `tax-delinquent-files`
3. Click on **"Configuration"** tab
4. Scroll to **"Object versioning"**
5. Click **"Edit"**
6. Select **"Enable"**
7. Click **"Save"**

### Lifecycle Policy

Create a `lifecycle.json` file:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 30,
          "isLive": false,
          "numNewerVersions": 5
        }
      }
    ]
  }
}
```

This policy:
- Keeps the latest 5 versions of each file
- Deletes older versions after 30 days
- Prevents unlimited storage growth

### Benefits

- **Data Recovery**: Restore previous versions if data is corrupted
- **Accident Protection**: Recover from accidental deletions
- **Audit Trail**: Track changes over time
- **Cost Control**: Lifecycle policy prevents unlimited storage

### Cost Impact

- Versioning itself is free
- Storage costs: ~$0.020 per GB per month
- With lifecycle policy (5 versions max, 30 days), cost is minimal

### Restore a Previous Version

```bash
# List all versions
gsutil ls -a gs://tax-delinquent-files/data/properties.json

# Restore a specific version
gsutil cp gs://tax-delinquent-files/data/properties.json#1234567890 gs://tax-delinquent-files/data/properties.json
```

