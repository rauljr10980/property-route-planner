# Google Cloud Storage Setup Guide

## ✅ What's Done

1. ✅ Created `src/services/gcsStorage.ts` - Frontend service for GCS operations
2. ✅ Created `server/index.js` - Backend API server for secure uploads
3. ✅ Created `server/package.json` - Backend dependencies
4. ✅ Updated `FileHistory.tsx` - Now uses GCS instead of Firebase
5. ✅ You already have GCS credentials in `config/gcs-credentials.json`

---

## 🚀 Next Steps

### Step 1: Create GCS Bucket

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/storage/browser?project=tax-delinquent-software

2. **Create a new bucket:**
   - Click **"Create Bucket"**
   - Name: `tax-delinquent-files` (or any name you prefer)
   - Location: Choose closest to you (e.g., `us-central1`)
   - Storage class: **Standard**
   - Access control: **Uniform**
   - Click **"Create"**

3. **Make bucket public (for downloads):**
   - Click on your bucket
   - Go to **"Permissions"** tab
   - Click **"Grant Access"**
   - Principal: `allUsers`
   - Role: **Storage Object Viewer**
   - Click **"Save"**

---

### Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

---

### Step 3: Set Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3001
GCS_BUCKET_NAME=tax-delinquent-files
GCS_CREDENTIALS={"type":"service_account","project_id":"tax-delinquent-software",...}
```

**OR** keep using the credentials file (for local dev):
- The server will automatically read from `config/gcs-credentials.json` if `GCS_CREDENTIALS` env var is not set.

---

### Step 4: Run Backend Server (Local Development)

```bash
cd server
npm start
```

The server will run on `http://localhost:3001`

---

### Step 5: Update Frontend API URL

In your React app, set the API URL:

**Option A: Environment Variable**
Create/update `.env` in the root:
```env
VITE_API_URL=http://localhost:3001
```

**Option B: Update `src/services/gcsStorage.ts`**
Change the default:
```typescript
this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

---

### Step 6: Deploy Backend (Choose One)

#### Option A: Railway (Recommended - Free Tier)
1. Go to https://railway.app
2. Sign up/login
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository
5. Set root directory: `server`
6. Add environment variables:
   - `GCS_BUCKET_NAME=tax-delinquent-files`
   - `GCS_CREDENTIALS=<paste your JSON credentials>`
7. Deploy!

#### Option B: Render (Free Tier)
1. Go to https://render.com
2. Sign up/login
3. Click **"New"** → **"Web Service"**
4. Connect your GitHub repo
5. Set:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add environment variables (same as Railway)
7. Deploy!

#### Option C: Google Cloud Run (Free Tier)
1. Go to https://console.cloud.google.com/run
2. Click **"Create Service"**
3. Upload your `server/` directory
4. Set environment variables
5. Deploy!

---

### Step 7: Update Frontend for Production

Once your backend is deployed, update the frontend:

**In `.env` (or GitHub Secrets for GitHub Pages):**
```env
VITE_API_URL=https://your-backend-url.railway.app
```

**For GitHub Pages:**
Add `VITE_API_URL` to GitHub Secrets (Settings → Secrets and variables → Actions)

---

## 📋 Testing

1. **Start backend:** `cd server && npm start`
2. **Start frontend:** `npm run dev`
3. **Upload a file** in the File History tab
4. **Check GCS bucket** - file should appear!

---

## 🔒 Security Notes

- ✅ Service account keys stay on the backend (never exposed to frontend)
- ✅ Backend validates uploads before storing in GCS
- ✅ Files are publicly readable (for downloads)
- ✅ Backend can be secured with API keys if needed

---

## 💰 Free Tier Limits

- **Storage:** 5 GB free
- **Downloads:** 1 GB/day free
- **Uploads:** 20,000 operations/day free

Perfect for your use case! 🎉

---

## 🆘 Troubleshooting

**"Failed to upload to GCS"**
- Check backend is running
- Check `GCS_BUCKET_NAME` matches your bucket
- Check service account has "Storage Object Admin" role

**"Bucket not found"**
- Make sure bucket name is correct
- Make sure bucket exists in the same project

**"Permission denied"**
- Check service account has correct IAM roles
- Check bucket permissions are set correctly

---

**Ready to test!** 🚀

