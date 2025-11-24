# What is the "Server"?

## Simple Explanation

The **"server"** is a separate program that runs on your computer (or in the cloud) that handles the heavy work your browser can't do efficiently.

---

## Your Application Has Two Parts

### 1. **Frontend** (What you see in the browser)
- Location: `src/` directory
- What it does: Shows the UI, buttons, forms, maps
- Runs in: Your web browser
- Files: React components, TypeScript files

### 2. **Backend/Server** (The worker behind the scenes)
- Location: `server/` directory
- What it does: Processes files, talks to Google Cloud Storage, does heavy calculations
- Runs as: A separate program (Node.js)
- Files: `server/index.js`, `server/package.json`

---

## What the Server Does

Your server (`server/index.js`) handles:

1. **File Processing**
   - Reads Excel files
   - Processes 39,000 rows in chunks
   - Detects status changes (J, A, P)

2. **Google Cloud Storage**
   - Uploads files to GCS
   - Downloads files from GCS
   - Manages file storage

3. **Security**
   - Keeps your Google Cloud credentials safe (never exposed to browser)
   - Handles authentication securely

---

## How It Works

```
Your Browser (Frontend)          Server (Backend)          Google Cloud Storage
     │                                │                            │
     │  "Upload this Excel file"      │                            │
     ├───────────────────────────────>│                            │
     │                                │  "Process the file"        │
     │                                │  (Reads Excel, processes) │
     │                                │                            │
     │                                │  "Save to GCS"             │
     │                                ├───────────────────────────>│
     │                                │                            │
     │  "Here are the results"        │                            │
     │<───────────────────────────────┤                            │
```

---

## Why Do We Need a Server?

### Without Server (Old Way):
- ❌ Browser tries to process 39,000 rows → **Slow, crashes, inaccurate**
- ❌ Google Cloud credentials exposed in browser → **Security risk**
- ❌ Browser memory limits → **Can't handle large files**

### With Server (Current Way):
- ✅ Server processes files → **Fast, accurate, reliable**
- ✅ Credentials stay on server → **Secure**
- ✅ No browser limits → **Handles any file size**

---

## Where Does It Run?

### Local Development (Testing):
- Runs on your computer: `http://localhost:3001`
- You start it with: `cd server && npm start`

### Production (Live):
- Runs on cloud service (Railway, Render, etc.)
- Accessible via URL like: `https://your-app.railway.app`
- Runs 24/7 automatically

---

## Server Files

```
server/
├── index.js          ← Main server code (handles uploads, processing)
├── package.json      ← Dependencies (what the server needs to run)
└── (node_modules)    ← Installed packages (created when you run npm install)
```

---

## How to Use It

### Start the Server:
```bash
cd server
npm install    # Install dependencies (first time only)
npm start      # Start the server
```

### What You'll See:
```
🚀 GCS API Server running on port 3001
📁 Bucket: tax-delinquent-files
```

### Then:
- Your React app (frontend) connects to it
- When you upload a file, frontend sends it to server
- Server processes it and sends results back

---

## Summary

**Server = The worker that does the heavy lifting**

- Processes your Excel files
- Talks to Google Cloud Storage
- Keeps your data secure
- Runs separately from your browser

Think of it like:
- **Frontend** = The restaurant (what customers see)
- **Server** = The kitchen (where the work happens)

---

**That's it!** The server is just a program that helps your app work better. 🚀

