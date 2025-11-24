# Storage Migration Plan: localStorage → Cloud Storage

## Current Issues

1. **localStorage limit:** ~5-10 MB total storage
2. **File size:** 15 MB per file (base64 encoded = ~20 MB)
3. **Will fail** after 1-2 files uploaded
4. **Browser-specific** - data lost when cleared

## Migration Strategy

### Option A: Supabase Storage (Recommended)

**Implementation Steps:**

1. **Setup Supabase** (5 minutes)
   - Create account at supabase.com
   - Create new project
   - Enable Storage
   - Create bucket: `property-tax-files`

2. **Install Supabase Client** (2 minutes)
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Create Storage Service** (30 minutes)
   - Create `src/services/storage.ts`
   - Handle file upload/download
   - Manage file metadata in database

4. **Update FileHistory Component** (1 hour)
   - Replace localStorage with Supabase calls
   - Add progress indicators for uploads
   - Handle errors gracefully

5. **Environment Variables** (5 minutes)
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Update GitHub Actions secrets

**Total time:** ~2 hours

---

### Option B: AWS S3 (Alternative)

**Implementation Steps:**

1. **Setup AWS** (30 minutes)
   - Create AWS account
   - Create S3 bucket
   - Create IAM user with permissions
   - Generate access keys

2. **Install AWS SDK** (2 minutes)
   ```bash
   npm install @aws-sdk/client-s3
   ```

3. **Create Backend Function** (2 hours)
   - **Problem:** S3 requires secret keys (can't expose in frontend)
   - **Solution:** Create serverless function (Vercel/Netlify) for signed URLs
   - OR use AWS Cognito for temporary credentials

4. **Update FileHistory Component** (1 hour)
   - Replace localStorage with S3 calls
   - Use signed URLs for uploads/downloads

**Total time:** ~3-4 hours (more complex)

---

## Code Changes Required

### Before (localStorage):
```typescript
// FileHistory.tsx
const fileData = await fileToBase64(file);
const entry = { ...metadata, fileData };
localStorage.setItem('file-history', JSON.stringify([...history, entry]));
```

### After (Supabase):
```typescript
// FileHistory.tsx
const { data, error } = await supabase.storage
  .from('property-tax-files')
  .upload(fileName, file);

// Store metadata in database table
const { data: metadata } = await supabase
  .from('file_history')
  .insert({ filename, size, upload_date, ... });
```

---

## Migration Timeline

1. **Week 1:** Set up cloud storage account
2. **Week 2:** Implement file upload/download
3. **Week 3:** Migrate existing files (if any)
4. **Week 4:** Test and deploy

---

## Cost Breakdown

### Supabase (Recommended)
- **Month 1-6:** FREE (1 GB storage = ~66 files)
- **Month 7+:** $25/month (100 GB = ~6,666 files)
- **Cost per file:** $0.0037/file after free tier

### AWS S3 (Alternative)
- **Storage:** $0.023/GB/month = $0.35/month per 15 GB
- **Transfer:** $0.09/GB (first 1 TB free)
- **Total:** ~$1-2/month for moderate usage
- **Cost per file:** ~$0.03/file

---

## Recommendation

**Start with Supabase Storage** because:
- ✅ Faster to implement (2 hours vs 4 hours)
- ✅ Better free tier for your use case
- ✅ Includes database for metadata
- ✅ Easier to maintain
- ✅ Better developer experience

**Switch to AWS S3 later** if:
- You need > 100 GB storage
- You want more control
- You're already using AWS infrastructure

---

## Files to Modify

1. `src/components/FileHistory.tsx` - Main component
2. `src/services/storage.ts` - New storage service (to create)
3. `src/utils/sharedData.ts` - May need updates
4. `.env` - Add Supabase credentials
5. `.github/workflows/deploy.yml` - Add secrets
6. `package.json` - Add Supabase dependency

---

## Next Steps

Let me know if you want me to:
1. ✅ Set up Supabase integration (recommended)
2. ⚠️ Set up AWS S3 integration (more complex)
3. 📋 Just provide setup instructions

