# Quick Start: Get Your Google Maps API Key

## Fast Track (5 minutes)

1. **Go to**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Create/Select Project**: Click project dropdown → New Project (or select existing)
3. **Enable APIs**: 
   - Go to "APIs & Services" → "Library"
   - Search and enable: **"Maps JavaScript API"** 
   - Search and enable: **"Geocoding API"**
4. **Create API Key**:
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "API key"
   - Copy the generated key
5. **Add to .env file**:
   - Open `.env` file in your project root
   - Replace `your_google_maps_api_key_here` with your actual key
   - Save the file
6. **Restart dev server**:
   - Stop the current server (Ctrl+C)
   - Run `npm run dev` again

## Important Notes

- **Free Tier**: $200/month free credits (covers ~28,000 map loads)
- **Billing Required**: Google requires a billing account (but won't charge unless you exceed free tier)
- **Restrict Key**: After creating, click "Restrict Key" to secure it:
  - Application restrictions: HTTP referrers → Add `http://localhost:*`
  - API restrictions: Select only Maps JavaScript API and Geocoding API

## Need More Details?

See `GOOGLE_MAPS_SETUP.md` for complete step-by-step instructions with screenshots guidance.

