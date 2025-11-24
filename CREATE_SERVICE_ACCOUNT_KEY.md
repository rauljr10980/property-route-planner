# Create Service Account Key (Get JSON Credential File)

## ✅ You're Almost Done!

You can see your service account is created. Now you need to create a key (JSON file).

---

## Step-by-Step: Create JSON Key

### 1. Look for "Add Key" button
- On the page you're viewing, you should see an **"Add Key"** button
- It might be at the top, or in a "Keys" tab

### 2. Click "Add Key"
- Click the **"Add Key"** button

### 3. Select "Create new key"
- A menu will appear
- Click **"Create new key"**

### 4. Choose JSON format
- A popup will appear asking for key type
- Select **"JSON"** (not P12)
- Click **"Create"**

### 5. Download will start automatically
- ⚠️ **IMPORTANT:** A JSON file will automatically download
- **Save this file securely!**
- It contains your secret credentials
- **DO NOT** share it publicly or commit to git

---

## Visual Guide

```
┌─────────────────────────────────────────────────┐
│ Email | Status | Name | ... | Actions          │
├─────────────────────────────────────────────────┤
│ service-account@... | Enabled | Service Account│
│                                                 │
│ [No keys]                                       │
│                                                 │
│ [+ ADD KEY ▼]  ← Click this button!            │
└─────────────────────────────────────────────────┘
```

---

## Alternative: Go to Keys Tab

If you don't see "Add Key" button:

1. **Look for "Keys" tab** (at the top of the service account page)
2. **Click on "Keys" tab**
3. You should see:
   - "No keys" message
   - **"+ ADD KEY"** button
4. **Click "+ ADD KEY"**
5. Follow steps 3-5 above

---

## What the JSON File Looks Like

The downloaded file will be named something like:
- `tax-delinquent-software-xxxxx-xxxxxxxxxxxx.json`

When you open it, it will look like:

```json
{
  "type": "service_account",
  "project_id": "tax-delinquent-software-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "service-account@tax-delinquent-software.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**⚠️ This file contains SECRET credentials! Keep it secure!**

---

## After You Download the JSON File

**Tell me:**
1. ✅ Did you download the JSON file?
2. ✅ What's the filename?
3. ✅ Where did you save it?

**Next steps:**
- I'll help you set up secure storage integration
- We'll use this credential in a backend API (not in frontend!)
- I'll show you how to integrate it with your React app

---

## ⚠️ Important Security Notes

**DO NOT:**
- ❌ Commit this file to git
- ❌ Share it publicly
- ❌ Put it in your React frontend code
- ❌ Upload it anywhere public

**DO:**
- ✅ Save it in a secure location
- ✅ We'll use it in a backend API (secure)
- ✅ Or switch to Firebase Storage (simpler for frontend)

---

## Quick Action

1. **Click "ADD KEY"** button (should be visible on the page)
2. **Click "Create new key"**
3. **Select "JSON"**
4. **Click "Create"**
5. **Save the downloaded file!**

Then let me know when you have it! 🎉

