@echo off
REM Quick deployment script for GitHub Pages (Windows)

echo Setting up GitHub Pages deployment...
echo.

REM Check if git is initialized
if not exist .git (
    echo Initializing git repository...
    git init
)

echo Setup complete!
echo.
echo Next steps:
echo 1. Create a new repository on GitHub
echo 2. Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
echo 3. Run: git add .
echo 4. Run: git commit -m "Initial commit"
echo 5. Run: git push -u origin main
echo 6. Go to repository Settings ^> Pages ^> Source: GitHub Actions
echo 7. Add VITE_GOOGLE_MAPS_API_KEY as a repository secret
echo.
echo See DEPLOYMENT.md for detailed instructions!
pause

