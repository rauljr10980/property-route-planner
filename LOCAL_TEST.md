# 🧪 Local Testing Guide

## ✅ What's Running

1. **Backend Server:** `http://localhost:3001`
   - Handles file uploads to Google Cloud Storage
   - Located in `server/` directory

2. **Frontend Dev Server:** `http://localhost:5173`
   - React app with all your tabs
   - Should be opening in your browser now

---

## 🧪 Test Steps

### 1. Verify Backend is Running

Open: http://localhost:3001/health

You should see:
```json
{"status":"ok","service":"GCS API"}
```

### 2. Test File Upload

1. Go to **File History** tab
2. Click **"Upload & Process File"**
3. Select an Excel file
4. Wait for upload to complete

### 3. Check GCS Bucket

Go to your bucket:
https://console.cloud.google.com/storage/browser/tax-delinquent-files?project=tax-delinquent-software

**Your file should appear!** 🎉

---

## 🔍 Troubleshooting

**"Failed to upload to GCS"**
- Check backend is running: http://localhost:3001/health
- Check `config/gcs-credentials.json` exists
- Check bucket name: `tax-delinquent-files`

**"Connection refused"**
- Backend might not be running
- Check terminal where backend is running
- Restart: `cd server && npm start`

**"Bucket not found"**
- Verify bucket name: `tax-delinquent-files`
- Check bucket exists in Google Cloud Console

---

## ✅ Expected Behavior

1. ✅ File uploads successfully
2. ✅ File appears in File History
3. ✅ File appears in GCS bucket
4. ✅ Properties are processed and merged
5. ✅ Status changes are detected (J, A, P)

---

**Ready to test!** 🚀

