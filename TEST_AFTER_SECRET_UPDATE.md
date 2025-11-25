# ✅ Test After Secret Update

## Deployment Status
GitHub Actions should automatically deploy after the secret update. This usually takes **2-3 minutes**.

## How to Verify It's Working

### Step 1: Wait for Deployment
1. Go to: https://github.com/rauljr10980/property-route-planner/actions
2. Look for the latest workflow run
3. Wait for it to complete (green checkmark ✅)

### Step 2: Test the Website
1. Open: https://rauljr10980.github.io/property-route-planner/
2. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Open browser console (F12 → Console tab)

### Step 3: Check API URL
In the browser console, run:
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
```

**Expected output:**
```
API URL: https://gcs-api-server-989612961740.us-central1.run.app
```

If it shows `undefined`, the secret isn't being passed correctly.

### Step 4: Test File Upload
1. Go to **"File History"** tab
2. Click **"Upload Excel File"**
3. Select `TRAINED DTR_Summary.959740.csv.xlsx`
4. Watch for:
   - ✅ Progress bar appears
   - ✅ "Uploading file to server..." message
   - ✅ "Processing file on server..." message
   - ✅ Success message with property count

### Step 5: Check Network Requests
1. Open browser console (F12)
2. Go to **Network** tab
3. Try uploading a file
4. Look for request to:
   - `https://gcs-api-server-989612961740.us-central1.run.app/api/process-file`
5. Should show **Status: 200 OK** (not Failed)

---

## What to Look For

### ✅ Success Signs:
- Progress bar shows during upload
- No "Failed to fetch" error
- Properties appear after processing
- Status changes detected (if any)

### ❌ Error Signs:
- "Failed to fetch" error
- Network request shows CORS error
- API URL still shows `undefined` in console
- Request goes to `localhost:3001` instead of Cloud Run URL

---

## If Still Not Working

### Check 1: Secret Value
- Make sure secret name is exactly: `VITE_API_URL`
- Make sure value is exactly: `https://gcs-api-server-989612961740.us-central1.run.app`
- No trailing slash, no spaces

### Check 2: Deployment
- Make sure GitHub Actions workflow completed successfully
- Check for any build errors in the Actions log

### Check 3: Browser Cache
- Try incognito/private window
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)

### Check 4: Backend Status
- Test: https://gcs-api-server-989612961740.us-central1.run.app/health
- Should return: `{"status":"ok","service":"GCS API"}`

---

## Expected Flow

1. **Upload file** → Frontend sends to Cloud Run
2. **Backend processes** → Excel file parsed, properties extracted
3. **Status detection** → J, A, P status changes identified
4. **Save to GCS** → Properties saved to cloud storage
5. **Return results** → Frontend displays properties and status changes

---

## Next Steps After Success

Once file upload works:
1. Check **Dashboard** tab for stats
2. Check **Status Tracker** tab for status changes
3. Verify properties appear correctly
4. Test with another file to verify persistence

