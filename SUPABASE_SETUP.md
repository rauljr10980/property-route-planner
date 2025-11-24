# Supabase Storage Setup Guide

## Quick Setup (30 minutes)

### Step 1: Create Supabase Account (5 min)

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub (recommended) or email
3. Click "New Project"
4. Fill in:
   - **Name:** `property-tax-tracker`
   - **Database Password:** (generate a strong password - save it!)
   - **Region:** Choose closest to you (US East recommended)
   - **Pricing Plan:** Free tier is fine to start

### Step 2: Create Storage Bucket (5 min)

1. In your Supabase project, go to **Storage** (left sidebar)
2. Click **"New bucket"**
3. Settings:
   - **Name:** `property-tax-files`
   - **Public bucket:** ✅ **Enable this** (allows direct access)
   - **File size limit:** `50 MB` (or your max file size)
   - **Allowed MIME types:** 
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx)
     - `application/vnd.ms-excel` (xls)
     - `application/octet-stream` (fallback)

4. Click **"Create bucket"**

### Step 3: Create Database Table for Metadata (10 min)

1. Go to **SQL Editor** (left sidebar)
2. Run this SQL to create the file history table:

```sql
-- Create file_history table
CREATE TABLE IF NOT EXISTS file_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  file_size BIGINT NOT NULL,
  row_count INTEGER NOT NULL,
  columns TEXT[],
  sample_rows JSONB,
  storage_path TEXT NOT NULL,
  user_id UUID, -- Optional: for future user authentication
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_file_history_upload_date 
ON file_history(upload_date DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE file_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on file_history"
ON file_history
FOR ALL
USING (true)
WITH CHECK (true);
```

### Step 4: Get API Keys (2 min)

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGc...` (long string)

3. Save these - you'll need them next!

### Step 5: Install Supabase Client (2 min)

```bash
npm install @supabase/supabase-js
```

### Step 6: Create Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Important:** Add `.env` to `.gitignore` (should already be there)

### Step 7: Update GitHub Secrets (for deployment)

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key

3. Update `.github/workflows/deploy.yml` to include:
   ```yaml
   env:
     VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
     VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
   ```

---

## File Structure After Setup

```
src/
  services/
    storage.ts          # New: Supabase storage service
  components/
    FileHistory.tsx     # Updated: Use storage service
```

---

## Next Steps

I can implement the Supabase integration for you. It will:

1. ✅ Create `src/services/storage.ts` - Storage service
2. ✅ Update `FileHistory.tsx` - Replace localStorage with Supabase
3. ✅ Add upload progress indicators
4. ✅ Handle errors gracefully
5. ✅ Update environment variable handling

**Time estimate:** 2 hours

Would you like me to proceed with the implementation?

