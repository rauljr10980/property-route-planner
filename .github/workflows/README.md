# GitHub Actions Workflows

This directory contains the GitHub Actions workflow for automatically deploying to GitHub Pages.

## Workflow: deploy.yml

This workflow automatically builds and deploys your app to GitHub Pages when you push to the `main` or `master` branch.

### How it works:

1. **Trigger**: Runs on push to `main`/`master` or manual trigger
2. **Build**: Installs dependencies, builds the app with your API key from secrets
3. **Deploy**: Deploys the built site to GitHub Pages

### Required Setup:

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Select "GitHub Actions"

2. **Add Secret**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add secret: `VITE_GOOGLE_MAPS_API_KEY` with your API key value

3. **Update API Key Restrictions**:
   - In Google Cloud Console, add your GitHub Pages domain:
     - `https://YOUR_USERNAME.github.io/*`
     - `https://YOUR_USERNAME.github.io/PR/*` (if repo name is PR)

### Customizing Base Path:

If your repository has a different name than "PR", update `vite.config.ts`:

```typescript
base: process.env.GITHUB_ACTIONS ? '/YOUR_REPO_NAME/' : '/',
```

