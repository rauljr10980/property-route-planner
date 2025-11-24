# Get API Credentials for "Tax Delinquent Software" Project

## Step 1: Select Your Project

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/

2. **Click the project dropdown at the top**
   - Look for "Tax Delinquent Software" in the list
   - Click on it to select it
   - Make sure it's selected (name should show at the top)

---

## Step 2: Enable Cloud Storage API

1. **Direct link (with your project):**
   - https://console.cloud.google.com/apis/library/storage-api.googleapis.com

2. **Or navigate manually:**
   - Go to **"APIs & Services"** → **"Library"** (left sidebar)
   - Search for: **"Cloud Storage API"**
   - Click on it
   - Click **"Enable"** (if not already enabled)
   - Wait ~30 seconds

---

## Step 3: Enable Cloud Storage JSON API

1. **Go to APIs Library:**
   - https://console.cloud.google.com/apis/library

2. **Search for:** `Cloud Storage JSON API`
3. **Click on it**
4. **Click "Enable"**

---

## Step 4: Create Service Account (For API Access)

1. **Go to Service Accounts:**
   - Direct link: https://console.cloud.google.com/iam-admin/serviceaccounts

2. **Click "Create Service Account"**

3. **Fill in:**
   - **Service account name:** `storage-access` (or any name)
   - **Service account ID:** (auto-filled, based on name)
   - **Description:** `Access to property tax files storage`

4. **Click "Create and Continue"**

5. **Grant this service account access to your project:**
   - Click **"Select a role"** dropdown
   - Type: `Storage Object Admin`
   - Select **"Storage Object Admin"** (full access to storage objects)
   - Or select:
     - `Storage Object Creator` (can create/upload files)
     - `Storage Object Viewer` (can read/download files)

6. **Click "Continue"**

7. **Click "Done"** (skip optional steps)

---

## Step 5: Create and Download JSON Key (This is Your API Credential!)

1. **You should see your new service account in the list**
   - Click on it (the email address)

2. **Go to the "Keys" tab**

3. **Click "Add Key"** → **"Create new key"**

4. **Select "JSON"** (not P12)

5. **Click "Create"**

6. **⚠️ IMPORTANT:** A JSON file will automatically download
   - **Save this file securely!**
   - It contains your credentials
   - **DO NOT** commit to git
   - **DO NOT** share publicly
   - This is your API credential file

---

## Step 6: Create Storage Bucket (If you haven't already)

1. **Go to Cloud Storage:**
   - Direct link: https://console.cloud.google.com/storage/browser

2. **Click "Create bucket"**

3. **Fill in:**
   - **Name:** `tax-delinquent-files` (or any unique name)
     - Must be globally unique (add your name/numbers if needed)
     - Example: `tax-delinquent-files-raulm-123`
   - **Location type:** `Region`
   - **Region:** Choose closest to you (e.g., `us-east1`)
   - **Storage class:** `Standard`
   - **Access control:** `Uniform` (recommended)

4. **Click "Create"**

---

## What You Need From the JSON File

Open the downloaded JSON file. It should look like this:

```json
{
  "type": "service_account",
  "project_id": "tax-delinquent-software-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "storage-access@tax-delinquent-software.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**Important values:**
- `project_id` - Your project ID
- `client_email` - Service account email
- `private_key` - Secret key (keep secure!)

---

## ⚠️ Security Warning

**DO NOT put this JSON file in your React frontend code!**

It contains secret credentials. We need to:

1. **Use it in a backend API** (serverless function)
2. **OR use Firebase Storage** instead (easier for React apps)

---

## Next Steps

Once you have:
- ✅ Service account created
- ✅ JSON key file downloaded
- ✅ Storage bucket created
- ✅ Bucket name noted

**Tell me:**
1. What's your **bucket name?**
2. Do you have the **JSON file downloaded?**

Then I'll help you:
- Set up secure backend API (Vercel/Netlify function)
- OR switch to Firebase Storage (easier option)
- Update your React app to use Google Cloud Storage

---

## Quick Links for Your Project

Make sure "Tax Delinquent Software" is selected, then use these:

- **Storage API:** https://console.cloud.google.com/apis/library/storage-api.googleapis.com
- **Service Accounts:** https://console.cloud.google.com/iam-admin/serviceaccounts
- **Cloud Storage Buckets:** https://console.cloud.google.com/storage/browser
- **APIs Library:** https://console.cloud.google.com/apis/library

