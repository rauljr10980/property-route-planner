# Deployment Guide - GitHub Pages

This guide will help you deploy your Property Route Planner app to GitHub Pages for free public hosting.

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Name it (e.g., `property-route-planner`)
4. Choose **Public** (required for free GitHub Pages)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click **"Create repository"**

## Step 2: Initialize Git and Push Code

Run these commands in your project directory:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: Property Route Planner app"

# Add your GitHub repository as remote
# Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Set up GitHub Pages

1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Scroll down to **"Pages"** in the left sidebar
4. Under **"Source"**, select **"GitHub Actions"**
5. Save the settings

## Step 4: Add API Key as Secret

Since we can't commit the `.env` file (for security), we need to add it as a GitHub secret:

1. In your GitHub repository, go to **"Settings"**
2. Click **"Secrets and variables"** → **"Actions"**
3. Click **"New repository secret"**
4. Name: `VITE_GOOGLE_MAPS_API_KEY`
5. Value: Your Google Maps API key
6. Click **"Add secret"**

## Step 5: Update API Key Restrictions

Update your Google Maps API key to allow your GitHub Pages domain:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **"APIs & Services"** → **"Credentials"**
3. Click on your API key
4. Under **"Application restrictions"** → **"HTTP referrers"**, add:
   - `https://YOUR_USERNAME.github.io/*`
   - `https://YOUR_USERNAME.github.io/PR/*` (if your repo name is PR)
   - Keep `http://localhost:*` for local development
5. Click **"Save"**

## Step 6: Trigger Deployment

The app will automatically deploy when you push to the `main` branch. To trigger manually:

1. Go to **"Actions"** tab in your repository
2. Click **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

## Step 7: Access Your Live Site

Once deployed, your site will be available at:
- `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

Or if your repo name is `PR`:
- `https://YOUR_USERNAME.github.io/PR/`

## Important Notes

### Repository Name
- If your repository is named `PR` (uppercase), the base path is `/PR/`
- If your repository has a different name, update `vite.config.ts` base path accordingly

### Updating the Site
- Every push to `main` branch automatically triggers a new deployment
- Check the **"Actions"** tab to see deployment status
- Deployment usually takes 2-3 minutes

### Troubleshooting

**Issue**: Build fails
- Check the **"Actions"** tab for error messages
- Ensure `VITE_GOOGLE_MAPS_API_KEY` secret is set correctly

**Issue**: Maps not loading on GitHub Pages
- Verify API key restrictions include your GitHub Pages domain
- Check browser console for errors
- Ensure the secret is named exactly `VITE_GOOGLE_MAPS_API_KEY`

**Issue**: 404 errors on routes
- GitHub Pages requires proper base path configuration
- Check `vite.config.ts` has the correct `base` path

## Alternative: Vercel Deployment (Easier)

If GitHub Pages gives you issues, Vercel is easier:

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Sign in with GitHub
4. Click **"New Project"**
5. Import your repository
6. Add environment variable: `VITE_GOOGLE_MAPS_API_KEY`
7. Click **"Deploy"**

Vercel automatically detects Vite and deploys with zero configuration!

