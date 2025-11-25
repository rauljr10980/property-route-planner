# Quick Test - Verify Everything Works

## ✅ Backend Status
- **Service URL**: https://gcs-api-server-989612961740.us-central1.run.app
- **Status**: ✅ Deployed and running
- **Health Check**: ✅ Working (returns cost limits)

## 🧪 Quick Test Steps

### Step 1: Verify Frontend is Deployed
1. Go to: https://github.com/rauljr10980/property-route-planner/actions
2. Check if latest workflow has green ✅ checkmark
3. If still running, wait 2-3 minutes
4. Access your site: https://rauljr10980.github.io/property-route-planner/ (or your repo URL)

### Step 2: Test Background Processing
1. Open your deployed site
2. Go to "File History" tab
3. Click "Upload File"
4. Select your 14MB Excel file
5. **Expected**: Should see "File upload accepted. Processing in background..." immediately
6. Wait 10-30 seconds
7. **Expected**: Properties should appear automatically

**✅ Success if**: Upload is instant, no browser freezing

### Step 3: Test Pagination
1. After properties load, go to "Status Tracker" tab
2. Scroll to bottom of property table
3. **Expected**: See pagination controls (First, Previous, Next, Last)
4. Try changing "items per page" dropdown
5. **Expected**: Table updates with selected number of rows

**✅ Success if**: Can navigate pages, can change items per page

### Step 4: Test Cost Controls
1. Try uploading 4 files quickly (within 1 hour)
2. **Expected**: 4th upload should show "Hourly quota exceeded"
3. Try uploading a file >20MB
4. **Expected**: Should show "File size exceeds limit of 20MB"

**✅ Success if**: Quotas are enforced

### Step 5: Test IndexedDB
1. Open browser DevTools (F12)
2. Go to "Application" tab → "IndexedDB"
3. **Expected**: See "PropertyTaxTrackerDB" database
4. Expand it → "properties" store
5. **Expected**: See your properties data

**✅ Success if**: Data stored in IndexedDB

## 🔍 Check API Connection

Open browser console (F12) and check:
- Network tab should show calls to: `gcs-api-server-989612961740.us-central1.run.app`
- No CORS errors
- No "Failed to fetch" errors

## 🐛 If Something Doesn't Work

### Frontend not loading?
- Check GitHub Actions: https://github.com/rauljr10980/property-route-planner/actions
- Verify `VITE_API_URL` secret is set in GitHub Secrets
- Check browser console for errors

### Backend errors?
- Check Cloud Run logs: https://console.cloud.google.com/run
- Select service: `gcs-api-server`
- Click "Logs" tab

### Properties not appearing?
- Wait 30-60 seconds (background processing)
- Check browser console for errors
- Check Cloud Run logs for processing errors

## 📊 Expected Performance

- **Upload Response**: <1 second
- **Background Processing**: 5-30 seconds (non-blocking)
- **Memory Usage**: ~10MB (not 250MB)
- **UI**: No freezing with large datasets

---

**Ready to test?** Open your deployed site and try uploading a file! 🚀

