# Testing Guide - All New Features

## 🚀 Quick Test Checklist

### 1. Frontend Deployment Status
- ✅ Check GitHub Actions: https://github.com/rauljr10980/property-route-planner/actions
- ✅ Wait for deployment to complete (2-3 minutes)
- ✅ Access site: https://rauljr10980.github.io/property-route-planner/ (or your repo URL)

### 2. Backend Deployment (Cloud Run)
**IMPORTANT**: Backend needs to be redeployed to pick up new changes!

Run this command to redeploy:
```powershell
cd C:\Users\Raulm\PR
gcloud run deploy gcs-api-server --source ./server --region us-central1 --allow-unauthenticated --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" --set-secrets "GCS_CREDENTIALS=gcs-credentials:latest" --memory 1Gi --timeout 600 --max-instances 10
```

---

## 🧪 Feature Testing

### Test 1: Background Processing ✅
**What to test**: File upload should return immediately, processing happens in background

**Steps**:
1. Go to "File History" tab
2. Upload a 14MB Excel file
3. **Expected**: Should see "File upload accepted. Processing in background..." message immediately
4. Wait 10-30 seconds
5. **Expected**: Properties should appear automatically (polling will detect completion)

**Success Criteria**:
- ✅ Upload returns in <1 second
- ✅ No browser freezing
- ✅ Properties appear after processing completes

---

### Test 2: Pagination ✅
**What to test**: Large property lists should be paginated

**Steps**:
1. Upload a file with 100+ properties
2. Go to "Status Tracker" tab
3. Scroll to bottom of property table
4. **Expected**: See pagination controls (First, Previous, Next, Last)
5. Change "items per page" dropdown (25, 50, 100, 200)
6. **Expected**: Table updates to show selected number of rows

**Success Criteria**:
- ✅ Pagination controls visible
- ✅ Can navigate between pages
- ✅ Can change items per page
- ✅ Shows "Showing X to Y of Z properties"

---

### Test 3: Cost Controls ✅
**What to test**: API limits prevent excessive usage

**Steps**:
1. Upload 3 files in quick succession (within 1 hour)
2. **Expected**: 4th upload should be rejected with "Hourly quota exceeded"
3. Try uploading a file >20MB
4. **Expected**: Should be rejected with "File size exceeds limit of 20MB"

**Success Criteria**:
- ✅ Hourly quota enforced (3 files/hour)
- ✅ File size limit enforced (20MB max)
- ✅ Clear error messages

---

### Test 4: IndexedDB Storage ✅
**What to test**: Large data stored in IndexedDB instead of localStorage

**Steps**:
1. Open browser DevTools (F12)
2. Go to "Application" tab → "IndexedDB"
3. Upload a file with properties
4. **Expected**: See "PropertyTaxTrackerDB" database with "properties" store
5. Check localStorage (Application → Local Storage)
6. **Expected**: Data also in localStorage (fallback)

**Success Criteria**:
- ✅ IndexedDB database created
- ✅ Properties stored in IndexedDB
- ✅ Can handle large files without quota errors

---

### Test 5: Error Boundaries ✅
**What to test**: Errors don't crash entire app

**Steps**:
1. Open browser console (F12)
2. Try to trigger an error (e.g., upload invalid file)
3. **Expected**: See error message in component, not full page crash
4. **Expected**: "Try Again" and "Reload Page" buttons visible

**Success Criteria**:
- ✅ Errors contained to component
- ✅ User-friendly error messages
- ✅ App doesn't completely crash

---

### Test 6: CORS Security ✅
**What to test**: API only accepts requests from allowed domains

**Steps**:
1. Open browser console (F12)
2. Try to make API call from different domain
3. **Expected**: CORS error if not from allowed origin
4. **Expected**: Works from GitHub Pages domain

**Success Criteria**:
- ✅ CORS errors for unauthorized domains
- ✅ Works from production domain

---

### Test 7: Rate Limiting ✅
**What to test**: Status-related requests are rate limited

**Steps**:
1. Make 100+ status-related requests quickly (filter by J/A/P repeatedly)
2. **Expected**: After 100 requests, should see "Too many status-related requests"
3. Wait 1 minute
4. **Expected**: Requests work again

**Success Criteria**:
- ✅ Rate limit enforced (100/minute)
- ✅ Clear error message
- ✅ Resets after time window

---

## 🔍 Debugging Tips

### Check Frontend Deployment
1. Go to: https://github.com/rauljr10980/property-route-planner/actions
2. Look for green checkmark ✅ on latest workflow
3. If red ❌, click to see error messages

### Check Backend Logs
1. Go to: https://console.cloud.google.com/run
2. Select service: `gcs-api-server`
3. Click "Logs" tab
4. Look for processing messages

### Check Browser Console
1. Press F12
2. Go to "Console" tab
3. Look for errors or warnings
4. Check "Network" tab for API calls

### Test API Directly
```bash
# Health check
curl https://gcs-api-server-989612961740.us-central1.run.app/health

# Should return limits and status
```

---

## ✅ Expected Results Summary

| Feature | Expected Behavior |
|---------|------------------|
| **Background Processing** | Upload instant, processing async |
| **Pagination** | 25-200 items per page, navigation works |
| **Cost Controls** | Quotas enforced, clear error messages |
| **IndexedDB** | Large data stored, no quota errors |
| **Error Boundaries** | Errors contained, app doesn't crash |
| **CORS** | Only allowed domains can access |
| **Rate Limiting** | 100 requests/minute for status requests |

---

## 🐛 Common Issues

### Issue: "Failed to fetch" on upload
**Solution**: Backend not deployed or CORS issue
- Redeploy backend: `gcloud run deploy...`
- Check CORS settings in `server/index.js`

### Issue: Properties not appearing after upload
**Solution**: Check if background processing completed
- Wait 30-60 seconds
- Check browser console for errors
- Check Cloud Run logs

### Issue: Pagination not showing
**Solution**: Need 25+ properties to see pagination
- Upload larger file
- Or reduce items per page to 25

### Issue: IndexedDB not working
**Solution**: Check browser support
- Use Chrome/Edge (best support)
- Check DevTools → Application → IndexedDB
- Falls back to localStorage if unavailable

---

## 📊 Performance Benchmarks

After testing, you should see:
- **Upload Speed**: <1 second (instant response)
- **Processing**: 5-30 seconds (background, non-blocking)
- **Memory Usage**: ~10MB (not 250MB)
- **Response Size**: <100KB (not 5MB+)
- **UI Responsiveness**: No freezing with 50k+ properties

---

## 🎯 Next Steps After Testing

1. ✅ Verify all features work
2. ✅ Check error handling
3. ✅ Test with real 14MB file
4. ✅ Monitor Cloud Run costs
5. ✅ Enable GCS versioning (optional): See `GCS_VERSIONING_SETUP.md`
