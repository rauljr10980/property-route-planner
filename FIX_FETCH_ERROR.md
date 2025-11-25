# 🔧 Fix: "Failed to fetch" Error

## Problem
When uploading a file, you get: **"Error processing file: Failed to fetch"**

This means the frontend can't connect to the backend API.

## Possible Causes

### 1. **API URL Not Set in GitHub Secrets** ⚠️ MOST LIKELY
The frontend needs to know where the backend is. Check:

1. Go to: https://github.com/rauljr10980/property-route-planner/settings/secrets/actions
2. Look for `VITE_API_URL` secret
3. Should be: `https://gcs-api-server-989612961740.us-central1.run.app`
4. If missing or wrong, add/update it

### 2. **CORS Issue**
The backend might be blocking requests from GitHub Pages.

**Fix:** The backend already has `app.use(cors())` which should allow all origins. But let's verify.

### 3. **Backend Not Running**
The Cloud Run service might be down.

**Check:** https://console.cloud.google.com/run?project=tax-delinquent-software

---

## Quick Fix Steps

### Step 1: Verify GitHub Secret
1. Go to: https://github.com/rauljr10980/property-route-planner/settings/secrets/actions
2. Check if `VITE_API_URL` exists
3. Value should be: `https://gcs-api-server-989612961740.us-central1.run.app`
4. If missing, click "New repository secret" and add it

### Step 2: Trigger New Deployment
After adding/updating the secret, trigger a new deployment:

1. Go to: https://github.com/rauljr10980/property-route-planner/actions
2. Click "Run workflow" → "Run workflow" (if available)
3. OR make a small change and push:
   ```bash
   git commit --allow-empty -m "Trigger deployment"
   git push
   ```

### Step 3: Check Browser Console
1. Open the website
2. Press F12 → Console tab
3. Look for errors
4. Check what URL it's trying to fetch

### Step 4: Test Backend Directly
Open in browser:
- https://gcs-api-server-989612961740.us-central1.run.app/health

Should return: `{"status":"ok","service":"GCS API"}`

---

## Debug: Check What URL Frontend Is Using

Open browser console (F12) and run:
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
```

If it shows `undefined`, the secret isn't being passed correctly.

---

## Alternative: Check Network Tab

1. Open website
2. Press F12 → Network tab
3. Try uploading a file
4. Look for failed requests
5. Check the URL it's trying to call
6. Check the error message

---

## Expected Behavior

When you upload a file:
1. Frontend calls: `https://gcs-api-server-989612961740.us-central1.run.app/api/process-file`
2. Backend processes the file
3. Returns processed properties
4. Frontend displays results

If step 1 fails, you get "Failed to fetch".

---

## Still Not Working?

1. **Check Cloud Run logs:**
   - https://console.cloud.google.com/run/detail/us-central1/gcs-api-server/logs?project=tax-delinquent-software

2. **Check if backend is responding:**
   ```bash
   curl https://gcs-api-server-989612961740.us-central1.run.app/health
   ```

3. **Verify CORS is working:**
   - Backend should allow requests from `https://rauljr10980.github.io`

