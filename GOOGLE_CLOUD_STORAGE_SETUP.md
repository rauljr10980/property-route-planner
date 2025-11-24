# Google Cloud Storage Setup Guide

## Step-by-Step Setup Instructions

### Step 1: Access Google Cloud Console
**Go to:** https://console.cloud.google.com/

### Step 2: Create a New Project
1. Click on the project dropdown at the top (or "Select a project")
2. Click **"New Project"**
3. Fill in:
   - **Project name:** `property-tax-tracker` (or your preferred name)
   - **Organization:** (leave as default if personal)
   - **Location:** (leave as default)
4. Click **"Create"**
5. Wait for project to be created (30 seconds)
6. Select the new project from the dropdown

### Step 3: Enable Billing (Required for Storage)
⚠️ **Important:** Google Cloud requires billing enabled, but:
- You get **$300 free credit** for 90 days
- 5 GB free storage per month
- Only pay if you exceed free tier

1. Go to **Billing** in the left menu (or top menu)
2. Click **"Link a billing account"**
3. If you don't have one, create a billing account
4. Link your credit card (won't be charged unless you exceed free tier)

### Step 4: Enable Cloud Storage API
1. Go to **"APIs & Services"** → **"Library"** (left sidebar)
2. Search for: **"Cloud Storage API"**
3. Click on **"Cloud Storage API"**
4. Click **"Enable"**
5. Wait for it to enable (~30 seconds)

### Step 5: Enable Cloud Storage JSON API (Important!)
1. Still in **"APIs & Services"** → **"Library"**
2. Search for: **"Cloud Storage JSON API"**
3. Click on it
4. Click **"Enable"**

### Step 6: Create a Storage Bucket
1. Go to **"Cloud Storage"** → **"Buckets"** (left sidebar)
2. Click **"Create bucket"**
3. Fill in:
   - **Name:** `property-tax-files-[your-name]` (must be globally unique)
     - Example: `property-tax-files-raulm`
   - **Location type:** Choose:
     - **Region** (recommended) - cheaper, good performance
     - Select your region (e.g., `us-east1`)
   - **Storage class:** `Standard` (default)
   - **Access control:** `Uniform` (recommended) or `Fine-grained`
   - **Protection tools:** Leave defaults
4. Click **"Create"**

### Step 7: Configure Bucket Permissions
1. Click on your newly created bucket
2. Go to **"Permissions"** tab
3. Click **"Grant Access"**
4. For now, we'll use **Service Account** (more secure)
   - Click **"Add Principal"**
   - We'll create this in the next step

### Step 8: Create Service Account (For API Access)
1. Go to **"IAM & Admin"** → **"Service Accounts"** (left sidebar)
2. Click **"Create Service Account"**
3. Fill in:
   - **Service account name:** `storage-access`
   - **Service account ID:** (auto-filled)
   - **Description:** `Access to property tax files storage`
4. Click **"Create and Continue"**
5. **Grant roles:**
   - Search and select: **"Storage Object Admin"** (full access)
   - Or **"Storage Object Creator"** + **"Storage Object Viewer"** (read/write only)
6. Click **"Continue"** → **"Done"**

### Step 9: Create and Download Service Account Key
1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **JSON** format
5. Click **"Create"**
6. **IMPORTANT:** The JSON file will download automatically - **SAVE THIS FILE SECURELY**
   - This contains your credentials
   - Do NOT commit to git
   - Do NOT share publicly

### Step 10: Get Your Project Credentials
1. Go to **"APIs & Services"** → **"Credentials"** (left sidebar)
2. You should see:
   - **Project ID:** `property-tax-tracker-xxxxx` (copy this)
   - Your service account JSON key (already downloaded)

---

## Environment Variables Needed

You'll need these values from the JSON key file:

```json
{
  "type": "service_account",
  "project_id": "property-tax-tracker-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "storage-access@project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**For React app, you'll need:**
- `project_id` (or we'll use the full JSON in backend)
- `bucket_name`
- Service account JSON (keep secure!)

---

## Security Note ⚠️

**DO NOT** put service account keys in frontend React code!

**We have two options:**

### Option A: Use Firebase Storage (Simpler)
- Uses Firebase SDK (can work from frontend with rules)
- Easier integration
- Still uses Google Cloud infrastructure

### Option B: Create Backend API (More Secure)
- Serverless function (Vercel/Netlify)
- Keeps keys secure on server
- More professional approach

---

## Next Steps

1. **Get me the credentials** (after you set up)
2. I'll implement the integration
3. We'll decide on Option A (Firebase) or Option B (Backend API)

---

## Direct Links

- **Console:** https://console.cloud.google.com/
- **Create Project:** https://console.cloud.google.com/projectcreate
- **Storage:** https://console.cloud.google.com/storage
- **Service Accounts:** https://console.cloud.google.com/iam-admin/serviceaccounts
- **APIs Library:** https://console.cloud.google.com/apis/library

