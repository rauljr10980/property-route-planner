# 🔐 Update GitHub Secret: VITE_API_URL

## Why It Shows Blank
GitHub **hides secret values** for security. Even if it's set, it will show as `••••••••` or blank. This is normal!

## How to Update It

### Step 1: Go to Secrets Page
1. Go to: https://github.com/rauljr10980/property-route-planner/settings/secrets/actions
2. Find `VITE_API_URL` in the list

### Step 2: Update the Secret
**Option A: If Secret Exists (shows as locked/blank)**
1. Click on `VITE_API_URL` (or click the pencil/edit icon)
2. Click **"Update"** button
3. Paste this value:
   ```
   https://gcs-api-server-989612961740.us-central1.run.app
   ```
4. Click **"Update secret"**

**Option B: If Secret Doesn't Exist**
1. Click **"New repository secret"** button
2. Name: `VITE_API_URL`
3. Secret: `https://gcs-api-server-989612961740.us-central1.run.app`
4. Click **"Add secret"**

### Step 3: Verify
After updating, you should see:
- ✅ `VITE_API_URL` in the list
- ✅ It will still show as blank/locked (this is normal!)
- ✅ But the value is now set correctly

### Step 4: Trigger Deployment
After updating, GitHub Actions will automatically redeploy. Or:

1. Go to: https://github.com/rauljr10980/property-route-planner/actions
2. Click **"Run workflow"** → **"Run workflow"** (if available)
3. OR make a small commit:
   ```bash
   git commit --allow-empty -m "Trigger deployment after secret update"
   git push
   ```

---

## Important Notes

- **The secret value will ALWAYS appear blank** - this is GitHub's security feature
- **You can still update it** - just click edit and paste the new value
- **No trailing slash** - make sure the URL doesn't end with `/`
- **Wait 2-3 minutes** after updating for the deployment to complete

---

## Test After Deployment

1. Open: https://rauljr10980.github.io/property-route-planner/
2. Open browser console (F12)
3. Run this to check:
   ```javascript
   console.log('API URL:', import.meta.env.VITE_API_URL);
   ```
4. Should show: `https://gcs-api-server-989612961740.us-central1.run.app`
5. If it shows `undefined`, the secret isn't being passed correctly

---

## Still Having Issues?

If the secret is locked and you can't edit it:
1. Check repository permissions - you need admin access
2. Try deleting and recreating the secret
3. Make sure you're on the correct repository

