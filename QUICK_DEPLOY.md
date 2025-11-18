# Quick Deploy to GitHub Pages

Follow these steps to deploy your app to GitHub Pages:

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click **"+"** → **"New repository"**
3. Name it: `property-route-planner` (or any name you prefer)
4. Make it **Public** (required for free GitHub Pages)
5. **DO NOT** initialize with README
6. Click **"Create repository"**

## Step 2: Push Your Code

Run these commands (replace `YOUR_USERNAME` and `YOUR_REPO_NAME`):

```bash
# Check current status
git status

# Commit all files
git commit -m "Initial commit: Property Route Planner app"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Set branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Scroll to **"Pages"** (left sidebar)
4. Under **"Source"**, select **"GitHub Actions"**
5. Save (the workflow will start automatically)

## Step 4: Add API Key as Secret

1. In your repository, go to **"Settings"** → **"Secrets and variables"** → **"Actions"**
2. Click **"New repository secret"**
3. Name: `VITE_GOOGLE_MAPS_API_KEY`
4. Value: Paste your Google Maps API key
5. Click **"Add secret"**

## Step 5: Update Google Maps API Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **"APIs & Services"** → **"Credentials"**
3. Click your API key
4. Under **"Application restrictions"** → **"HTTP referrers"**, add:
   - `https://YOUR_USERNAME.github.io/*`
   - `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/*`
5. Click **"Save"**

## Step 6: Update Base Path (if needed)

If your repository name is NOT "PR", update `vite.config.ts`:

```typescript
base: process.env.GITHUB_ACTIONS ? '/YOUR_REPO_NAME/' : '/',
```

Replace `YOUR_REPO_NAME` with your actual repository name.

## Step 7: Wait for Deployment

1. Go to **"Actions"** tab in your repository
2. Watch the deployment workflow run
3. Wait 2-3 minutes for deployment to complete

## Step 8: Access Your Live Site

Your site will be available at:
- `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

Example: If your username is `john` and repo is `property-route-planner`:
- `https://john.github.io/property-route-planner/`

## Troubleshooting

**Build fails?**
- Check **"Actions"** tab for error messages
- Ensure `VITE_GOOGLE_MAPS_API_KEY` secret is set correctly

**Maps not loading?**
- Verify API key restrictions include your GitHub Pages domain
- Check browser console (F12) for errors

**404 errors?**
- Make sure base path in `vite.config.ts` matches your repository name

## Alternative: Deploy to Vercel (Easier!)

1. Push code to GitHub (Steps 1-2 above)
2. Go to [Vercel](https://vercel.com) and sign in with GitHub
3. Click **"New Project"**
4. Import your repository
5. Add environment variable: `VITE_GOOGLE_MAPS_API_KEY`
6. Click **"Deploy"**

Done! Your site will be live in ~30 seconds with a custom domain like:
- `your-repo-name.vercel.app`

