# How to Check Cloud Run Logs

## Option 1: Via Google Cloud Console (Easiest)

1. **Sign in to Google Cloud Console:**
   - Go to: https://console.cloud.google.com
   - Sign in with your Google account

2. **Navigate to Cloud Run:**
   - Click the hamburger menu (☰) in the top left
   - Go to **"Run"** → **"Cloud Run"**
   - Or go directly to: https://console.cloud.google.com/run?project=tax-delinquent-software

3. **Open your service:**
   - Click on **"gcs-api-server"**

4. **View Logs:**
   - Click on the **"LOGS"** tab at the top
   - You'll see real-time logs from your backend
   - Look for messages containing:
     - "Starting data processing"
     - "Header row found"
     - "Row X: Valid data row"
     - "No data found after processing"
     - "Sample rows from data start"

## Option 2: Via Command Line

If you have gcloud CLI installed and authenticated:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gcs-api-server" --limit 100 --format="table(timestamp,textPayload)" --freshness=30m
```

## What to Look For

When you upload a file, you should see logs like:

1. **File upload received:**
   ```
   📊 Processing file: TRAINED DTR_Summary.959740.csv.xlsx (123456 bytes)
   ```

2. **Header detection:**
   ```
   ✅ Found header row at index X with headers: CAN, LEGALSTATUS, ADDRSTRING
   📊 Starting data processing from row Y (skipped header row X and 3 test rows)
   ```

3. **Row processing:**
   ```
   ✅ Row Y: Valid data row - CAN="...", ADDRSTRING="...", LEGALSTATUS="..."
   ```

4. **If no data found:**
   ```
   ❌ No data found after processing. Debug info:
      - Header row index: X
      - Data start row: Y
      - Max rows in sheet: Z
      - Column mappings: {...}
      Sample rows from data start:
      Row Y: {...}
   ```

## Quick Check Script

Run this to check the latest status:
```bash
node check-latest-upload.cjs
```

