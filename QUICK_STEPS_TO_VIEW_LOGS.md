# Quick Steps to View Logs

## From the Cloud Run Services List:

1. **Click on "gcs-api-server"** (the service name in the list)

2. **Click on the "LOGS" tab** at the top of the page

3. **Look for recent entries** - you should see logs from your file upload

## What to Look For in the Logs:

When you uploaded your file, you should see messages like:

- `📊 Processing file: TRAINED DTR_Summary.959740.csv.xlsx`
- `✅ Found header row at index X`
- `📊 Starting data processing from row Y`
- `✅ Row Y: Valid data row - CAN="..."`
- OR if there's an error:
  - `❌ No data found after processing. Debug info:`
  - Followed by detailed information about what was found

## Alternative: Check Error File

If you can't access logs, run this command:
```bash
node read-error.cjs
```

This will show the latest error (if any) from the processing.

