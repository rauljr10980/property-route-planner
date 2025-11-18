#!/bin/bash
# Quick deployment script for GitHub Pages

echo "🚀 Setting up GitHub Pages deployment..."
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
fi

# Check if .gitignore exists
if [ ! -f .gitignore ]; then
    echo "Creating .gitignore..."
    cat > .gitignore << EOF
node_modules
dist
.env
.env.local
*.log
.DS_Store
EOF
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "3. Run: git add ."
echo "4. Run: git commit -m 'Initial commit'"
echo "5. Run: git push -u origin main"
echo "6. Go to repository Settings > Pages > Source: GitHub Actions"
echo "7. Add VITE_GOOGLE_MAPS_API_KEY as a repository secret"
echo ""
echo "See DEPLOYMENT.md for detailed instructions!"

