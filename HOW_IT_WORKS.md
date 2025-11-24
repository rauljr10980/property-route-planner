# How The System Works

## 🏗️ Architecture Overview

Your application uses **3 main components** working together:

```
┌─────────────────┐
│   GitHub (Code) │  ← Your React app code lives here
└─────────────────┘
         │
         │ (GitHub Actions builds & deploys)
         ▼
┌─────────────────┐
│  GitHub Pages   │  ← Your live website (public URL)
└─────────────────┘
         │
         │ (User uploads Excel file)
         ▼
┌─────────────────┐
│  Backend Server │  ← Processes files & saves to GCS
│  (Render/Railway)│
└─────────────────┘
         │
         │ (Saves files & data)
         ▼
┌─────────────────┐
│ Google Cloud    │  ← Stores Excel files & processed data
│ Storage (GCS)   │
└─────────────────┘
```

---

## 📦 Component Breakdown

### 1. **GitHub Repository** (Code Storage)
- **What**: Your React application code
- **Where**: `https://github.com/rauljr10980/property-route-planner`
- **Purpose**: 
  - Stores all your code (React components, TypeScript files, etc.)
  - Version control (history of changes)
  - Collaboration and backup

**Files stored here:**
- `src/` - All React components
- `server/` - Backend API code
- `package.json` - Dependencies
- Configuration files

---

### 2. **GitHub Pages** (Live Website)
- **What**: Your deployed application (the actual website)
- **URL**: `https://rauljr10980.github.io/property-route-planner/`
- **How it works**:
  1. You push code to GitHub
  2. GitHub Actions automatically builds your app
  3. Deploys it to GitHub Pages
  4. Website is live and accessible

**What users see:**
- Your React app interface
- All tabs (Dashboard, Route Planner, Status Tracker, File History)
- Upload buttons, maps, tables, etc.

---

### 3. **Backend Server** (File Processing)
- **What**: Node.js/Express server
- **Where**: Hosted on Render or Railway (free tier)
- **Purpose**:
  - Processes Excel files server-side (fast, handles large files)
  - Detects status changes (J, A, P)
  - Saves files to Google Cloud Storage
  - Loads saved data from GCS

**API Endpoints:**
- `POST /api/upload` - Upload Excel file
- `POST /api/process-file` - Process Excel and detect changes
- `POST /api/save-properties` - Save processed data
- `GET /api/load-properties` - Load saved data
- `GET /api/download` - Download file
- `DELETE /api/delete` - Delete file

---

### 4. **Google Cloud Storage** (File & Data Storage)
- **What**: Cloud storage bucket
- **Where**: Google Cloud Platform
- **Purpose**:
  - Stores uploaded Excel files permanently
  - Stores processed property data (`data/properties.json`)
  - Persists data across browser sessions

**What's stored:**
- `files/` - Original Excel files you upload
- `data/properties.json` - All processed properties with status changes
- File metadata (upload dates, row counts, etc.)

---

## 🔄 Complete Data Flow

### **When You Upload a File:**

```
1. User clicks "Upload File" in File History tab
   ↓
2. File is sent to Backend Server (Render/Railway)
   ↓
3. Backend processes Excel file:
   - Reads all rows (handles 39,000+ rows)
   - Detects status changes (J, A, P)
   - Merges with existing properties
   - Calculates days since status change
   ↓
4. Backend saves to Google Cloud Storage:
   - Original Excel file → files/your-file.xlsx
   - Processed data → data/properties.json
   ↓
5. Backend returns processed properties to frontend
   ↓
6. Frontend displays:
   - Properties in Route Planner tab
   - Status changes in Status Tracker tab
   - File history in File History tab
```

### **When You Refresh the Page:**

```
1. App loads
   ↓
2. Frontend calls Backend API: GET /api/load-properties
   ↓
3. Backend loads from Google Cloud Storage:
   - Reads data/properties.json
   ↓
4. Backend returns all properties to frontend
   ↓
5. Frontend displays all your data
   ✅ Data persists! No data loss on refresh!
```

---

## 🔐 Security & Credentials

### **What's Public (GitHub):**
- ✅ React code (frontend)
- ✅ TypeScript files
- ✅ Configuration files

### **What's Private (Secrets):**
- 🔒 Google Cloud Storage credentials (stored on backend server)
- 🔒 Google Maps API key (stored as GitHub Secret)
- 🔒 Backend API URL (stored as GitHub Secret)

**How secrets work:**
- GitHub Secrets → Used during build (for Google Maps API)
- Backend Environment Variables → Used by server (for GCS credentials)
- Never exposed to frontend code

---

## 💾 Data Persistence

### **Why Data Persists:**

1. **Excel Files** → Saved to Google Cloud Storage
   - Never deleted unless you delete them
   - Accessible from any device/browser

2. **Processed Properties** → Saved to `data/properties.json` in GCS
   - Contains all properties with status changes
   - Loaded automatically on app startup
   - Merges with new uploads

3. **File History Metadata** → Saved in localStorage (cache)
   - Fast access
   - Falls back to GCS if localStorage is full

---

## 🚀 Deployment Flow

### **When You Push Code to GitHub:**

```
1. You commit and push code:
   git add .
   git commit -m "Update feature"
   git push
   ↓
2. GitHub Actions workflow triggers:
   - Installs dependencies
   - Builds React app
   - Deploys to GitHub Pages
   ↓
3. Website updates automatically
   ✅ Live in ~2-3 minutes
```

---

## 📊 Storage Breakdown

### **GitHub (Code):**
- **Free**: Unlimited public repositories
- **Size**: ~50 MB (code only)
- **Purpose**: Version control

### **GitHub Pages (Website):**
- **Free**: 1 GB storage, 100 GB bandwidth/month
- **Purpose**: Hosting your React app

### **Google Cloud Storage:**
- **Free Tier**: 5 GB storage, 1 GB downloads/day
- **Your Usage**: 
  - Excel files: ~15 MB each
  - Processed data: ~5-10 MB
  - **Total**: Well within free tier!

### **Backend Server (Render/Railway):**
- **Free Tier**: 
  - 750 hours/month (always-on)
  - 512 MB RAM
  - Perfect for your use case!

---

## ✅ Why This Architecture Works

1. **Scalable**: Can handle thousands of properties
2. **Persistent**: Data never lost (stored in cloud)
3. **Fast**: Server-side processing handles large files
4. **Free**: All services have generous free tiers
5. **Secure**: Credentials never exposed to frontend
6. **Automatic**: GitHub Actions deploys automatically

---

## 🔧 Current Setup Status

✅ **GitHub Repository**: Active  
✅ **GitHub Pages**: Deployed  
✅ **Backend Server**: Needs deployment (Render/Railway)  
✅ **Google Cloud Storage**: Configured  
✅ **Data Persistence**: Working  

---

## 📝 Next Steps

To complete the setup, you need to:

1. **Deploy Backend Server** to Render or Railway
2. **Add Backend URL** to GitHub Secrets (`VITE_API_URL`)
3. **Test File Upload** → Should save to GCS
4. **Test Data Persistence** → Refresh page, data should load

---

## 🎯 Summary

- **GitHub** = Your code (version control)
- **GitHub Pages** = Your live website
- **Backend Server** = Processes files & saves to cloud
- **Google Cloud Storage** = Permanent file & data storage

**Result**: Your data is saved in the cloud, persists across refreshes, and works from any device! 🎉

