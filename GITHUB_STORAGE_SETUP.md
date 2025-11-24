# GitHub Integration for Google Cloud Storage

## ✅ Files Created:

1. **`api/upload.js`** - Serverless function for file uploads/downloads
2. **`src/services/storageService.ts`** - React service for API calls
3. **`vercel.json`** - Vercel configuration
4. **Updated `package.json`** - Added Google Cloud Storage dependency

---

## 🚀 Deployment Options:

Since you're using **GitHub Pages** (static hosting), we need a separate service for serverless functions.

### Option 1: Vercel (Recommended) ⭐

**Why:** Easy, free, great GitHub integration

**Steps:**
1. Go to https://vercel.com
2. Sign in with GitHub
3. Import your repository
4. Add environment variables (see below)
5. Deploy automatically

### Option 2: Netlify Functions

**Steps:**
1. Go to https://netlify.com
2. Sign in with GitHub
3. Import repository
4. Add environment variables
5. Deploy

---

## 🔐 Environment Variables Needed:

You'll need to add these as **secrets** in your deployment service:

### For Vercel/Netlify:

1. **GCS_PROJECT_ID** = `tax-delinquent-software`
2. **GCS_BUCKET_NAME** = `your-bucket-name` (create this first!)
3. **GCS_PRIVATE_KEY_ID** = (from your JSON file)
4. **GCS_PRIVATE_KEY** = (from your JSON file - full key with \n)
5. **GCS_CLIENT_EMAIL** = `service-account@tax-delinquent-software.iam.gserviceaccount.com`
6. **GCS_CLIENT_ID** = (from your JSON file)
7. **GCS_CLIENT_X509_CERT_URL** = (from your JSON file)

---

## 📋 Step-by-Step Setup:

### Step 1: Create Storage Bucket

1. Go to: https://console.cloud.google.com/storage/browser
2. Click **"Create bucket"**
3. Name: `tax-delinquent-files` (or unique name)
4. Location: Choose region
5. Click **"Create"**
6. **Note the bucket name!**

### Step 2: Set Up Vercel

1. **Go to Vercel:**
   - https://vercel.com
   - Sign in with GitHub

2. **Import Repository:**
   - Click **"Add New Project"**
   - Select your `property-route-planner` repository
   - Click **"Import"**

3. **Configure Project:**
   - Framework Preset: **Vite**
   - Root Directory: `.` (root)
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variables:**
   - Go to **Settings** → **Environment Variables**
   - Add all variables from list above
   - **Important:** For `GCS_PRIVATE_KEY`, replace actual `\n` with `\\n` (escape it)

5. **Deploy:**
   - Click **"Deploy"**
   - Wait for deployment to complete
   - Note your deployment URL (e.g., `https://your-app.vercel.app`)

### Step 3: Update React App

1. **Add API URL to `.env`:**
   ```env
   VITE_API_URL=https://your-app.vercel.app/api
   ```

2. **Update GitHub Secrets:**
   - Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
   - Add `VITE_API_URL` = your Vercel URL

3. **Update `.env` for local development:**
   - Create `.env.local` (already in `.gitignore`)
   - Add: `VITE_API_URL=http://localhost:3000/api` (for local dev)

### Step 4: Update GitHub Actions

Update `.github/workflows/deploy.yml` to include the API URL:

```yaml
env:
  VITE_GOOGLE_MAPS_API_KEY: ${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}
  VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

---

## 🔧 Extract Credentials from JSON:

You need to extract these values from `config/gcs-credentials.json`:

### Quick Script to Extract:

Create a file `extract-credentials.js`:

```javascript
import fs from 'fs';

const creds = JSON.parse(fs.readFileSync('config/gcs-credentials.json', 'utf8'));

console.log('GCS_PROJECT_ID=' + creds.project_id);
console.log('GCS_PRIVATE_KEY_ID=' + creds.private_key_id);
console.log('GCS_PRIVATE_KEY=' + JSON.stringify(creds.private_key)); // Already has \n
console.log('GCS_CLIENT_EMAIL=' + creds.client_email);
console.log('GCS_CLIENT_ID=' + creds.client_id);
console.log('GCS_CLIENT_X509_CERT_URL=' + creds.client_x509_cert_url);
```

Run it:
```bash
node extract-credentials.js
```

Then copy each value to your Vercel environment variables.

---

## 🎯 Quick Checklist:

- [ ] Create storage bucket in Google Cloud
- [ ] Set up Vercel account
- [ ] Import GitHub repository to Vercel
- [ ] Add environment variables to Vercel
- [ ] Deploy to Vercel
- [ ] Get Vercel deployment URL
- [ ] Update `VITE_API_URL` in `.env` and GitHub secrets
- [ ] Update `FileHistory.tsx` to use storage service
- [ ] Test file upload

---

## 💡 Alternative: Use Firebase Storage Instead

If this seems complex, **Firebase Storage** is easier:
- Works directly from React frontend
- No backend API needed
- Simpler setup
- Same Google infrastructure

**Want to switch to Firebase?** Just let me know!

---

## 📞 Next Steps:

1. **Create the bucket** (if you haven't)
2. **Set up Vercel** and add environment variables
3. **Tell me your Vercel URL** and I'll update the React app
4. **Test the integration**

Let me know when you're ready! 🚀

