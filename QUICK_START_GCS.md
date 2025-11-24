# 🚀 Quick Start: Google Cloud Storage

## Step 1: Create Bucket (2 minutes)

1. **Open the link below** (already opened for you):
   https://console.cloud.google.com/storage/browser?project=tax-delinquent-software

2. **Click "Create Bucket"**
   - Name: `tax-delinquent-files`
   - Location: `us-central1` (or closest to you)
   - Click **"Create"**

3. **Make it public:**
   - Click on the bucket
   - Go to **"Permissions"** tab
   - Click **"Grant Access"**
   - Principal: `allUsers`
   - Role: **Storage Object Viewer**
   - Click **"Save"**

---

## Step 2: Install Backend (1 minute)

Open a new terminal and run:

```bash
cd server
npm install
```

---

## Step 3: Start Backend (30 seconds)

```bash
npm start
```

You should see: `🚀 GCS API Server running on port 3001`

---

## Step 4: Test Upload

1. **Keep backend running** (don't close that terminal)
2. **In another terminal**, start your React app:
   ```bash
   npm run dev
   ```
3. **Go to File History tab**
4. **Upload an Excel file**
5. **Check your GCS bucket** - file should appear! 🎉

---

## ✅ That's It!

Your files are now stored in Google Cloud Storage (free tier: 5GB storage, 1GB downloads/day).

---

## 🔧 If Backend Fails

**Error: "Bucket not found"**
- Make sure you created the bucket with name `tax-delinquent-files`
- Or update `server/index.js` line 33: `const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';`

**Error: "Permission denied"**
- Make sure service account has "Storage Object Admin" role
- Check bucket permissions allow public reads

---

**Ready to go!** 🚀

