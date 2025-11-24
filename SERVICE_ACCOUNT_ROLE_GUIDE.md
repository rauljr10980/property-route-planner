# Service Account Role Selection Guide

## ✅ Select This Role:

### **"Storage Object Admin"**

**Why:**
- ✅ Can upload files (write)
- ✅ Can download files (read)
- ✅ Can delete files (if needed)
- ✅ Can list files
- ✅ Perfect for your use case (file storage)

---

## How to Select It:

1. **Click the "Select a role" dropdown**

2. **Start typing:** `Storage Object Admin`
   - Or search for: `storage object admin`
   - Or browse: **"Storage"** category

3. **Select:** **"Storage Object Admin"**
   - You'll see it in the list
   - Click on it

4. **Leave "IAM condition (optional)" empty** (you don't need this)

5. **Click "Continue"** or **"Done"**

---

## Alternative Roles (If you want more restrictive):

If you want to be more specific, you can add TWO roles:

1. **"Storage Object Creator"**
   - Allows uploading/creating files

2. **"Storage Object Viewer"**
   - Allows reading/downloading files

But **"Storage Object Admin"** is simpler and covers everything you need!

---

## What NOT to Select:

❌ **"Storage Admin"** - Too powerful (manages buckets, not needed)
❌ **"Storage Legacy Bucket Owner"** - Old/deprecated
❌ **"Storage Legacy Bucket Reader"** - Old/deprecated

---

## Visual Guide:

```
┌─────────────────────────────────────────┐
│ Select a role                           │
│ ▼                                       │
│ ┌─────────────────────────────────────┐ │
│ │ Search roles...                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Type: "Storage Object Admin"           │
│                                         │
│ ✅ Storage Object Admin                │
│    Full control of GCS objects         │
│                                         │
└─────────────────────────────────────────┘
```

---

## After Selecting:

1. Click **"Continue"** or **"Done"**
2. You'll see a summary
3. Click **"Done"** to finish
4. Then proceed to create the JSON key!

---

## Quick Action:

**Just type:** `Storage Object Admin` in the search box
**Click:** The role when it appears
**Click:** Continue/Done

That's it! 🎉

