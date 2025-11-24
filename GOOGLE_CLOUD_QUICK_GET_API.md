# Quick Guide: Get API for "Tax Delinquent Software"

## 🎯 Quick Steps (5 minutes)

### 1. Make sure "Tax Delinquent Software" is selected
- Look at top dropdown → Click it → Select "Tax Delinquent Software"

### 2. Enable Storage API
**Link:** https://console.cloud.google.com/apis/library/storage-api.googleapis.com
- Click **"Enable"**
- Wait 30 seconds

### 3. Create Service Account
**Link:** https://console.cloud.google.com/iam-admin/serviceaccounts
- Click **"Create Service Account"**
- Name: `storage-access`
- Click **"Create and Continue"**
- Role: **"Storage Object Admin"**
- Click **"Done"**

### 4. Download JSON Key (THIS IS YOUR API CREDENTIAL)
- Click on the service account you just created
- Go to **"Keys"** tab
- Click **"Add Key"** → **"Create new key"**
- Select **JSON**
- Click **"Create"**
- **SAVE THE DOWNLOADED FILE!** ⚠️

### 5. Create Storage Bucket
**Link:** https://console.cloud.google.com/storage/browser
- Click **"Create bucket"**
- Name: `tax-delinquent-files-[your-unique-id]`
- Location: Choose region
- Click **"Create"**

---

## ✅ What You'll Have

- **Service Account JSON file** (your API credential)
- **Bucket name** (where files will be stored)
- **Project ID** (from JSON file)

---

## ⚠️ Important

The JSON file contains **SECRET CREDENTIALS**.

**We can't use it directly in React frontend!**

**Options:**
1. **Use Firebase Storage** (easier - I recommend this)
2. **Create backend API** (more secure - serverless function)

---

## Tell Me When Done

Once you have the JSON file downloaded, let me know:
- ✅ JSON file downloaded?
- ✅ Bucket name?
- ✅ Which option do you prefer? (Firebase or Backend API)

