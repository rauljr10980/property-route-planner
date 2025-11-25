# Fix: Service Account Needs List Permission

## Problem
The service account `service-account@tax-delinquent-software.iam.gserviceaccount.com` doesn't have permission to list files in the bucket.

**Error:** `storage.objects.list access to the Google Cloud Storage bucket. Permission 'storage.objects.list' denied`

## Solution: Grant Storage Object Viewer Role

### Option 1: Using Google Cloud Console (Easiest)

1. Go to: https://console.cloud.google.com/storage/browser/tax-delinquent-files?project=tax-delinquent-software
2. Click **"Permissions"** tab (top of the page)
3. Click **"Grant Access"** button
4. In **"New principals"**, paste:
   ```
   service-account@tax-delinquent-software.iam.gserviceaccount.com
   ```
5. In **"Select a role"**, choose: **"Storage Object Viewer"**
6. Click **"Save"**

### Option 2: Using gcloud CLI

Run this in PowerShell:

```powershell
gcloud storage buckets add-iam-policy-binding gs://tax-delinquent-files `
  --member="serviceAccount:service-account@tax-delinquent-software.iam.gserviceaccount.com" `
  --role="roles/storage.objectViewer" `
  --project=tax-delinquent-software
```

## Required Permissions

The service account needs these roles:
- ✅ **Storage Object Admin** (already has - for upload/delete)
- ❌ **Storage Object Viewer** (missing - for listing files)

OR

- ✅ **Storage Admin** (has all permissions)

## After Fixing

1. Wait 1-2 minutes for permissions to propagate
2. Refresh the check-files.html page
3. Click "Check Cloud Files" again
4. Files should now appear!

