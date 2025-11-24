# Configuration Files

## ⚠️ IMPORTANT: Keep Credentials Secure!

This directory contains configuration files for your application.

### Google Cloud Storage Credentials

**DO NOT COMMIT the actual credentials file to git!**

1. Copy your downloaded JSON file here:
   ```
   config/gcs-credentials.json
   ```

2. The file should be named: `gcs-credentials.json`
   - Copy from: `C:\Users\Raulm\Downloads\tax-delinquent-software-6aab6e3823be.json`
   - To: `config/gcs-credentials.json`

3. **This file is already in `.gitignore`** - it will NOT be committed to git.

---

## Setup Instructions

1. **Copy your JSON file:**
   ```bash
   # Copy from Downloads to config folder
   copy C:\Users\Raulm\Downloads\tax-delinquent-software-6aab6e3823be.json config\gcs-credentials.json
   ```

2. **Verify it's in `.gitignore`:**
   - The file `config/gcs-credentials.json` is already listed in `.gitignore`
   - Double-check it's there before committing

3. **Never commit this file!**
   - It contains secret credentials
   - Keep it local only

---

## Files in this directory:

- `gcs-credentials.example.json` - Template (safe to commit)
- `gcs-credentials.json` - Your actual credentials (DO NOT COMMIT)
- `README.md` - This file

