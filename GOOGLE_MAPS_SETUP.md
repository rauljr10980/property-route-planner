# How to Get a Google Maps API Key

Follow these steps to obtain a Google Maps API key for your Property Route Planner app:

## Step 1: Create a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account (or create one if needed)
3. Accept the terms of service if prompted

## Step 2: Create a New Project (or Select Existing)

1. Click on the project dropdown at the top of the page
2. Click **"New Project"**
3. Enter a project name (e.g., "Property Route Planner")
4. Click **"Create"**
5. Wait for the project to be created, then select it from the dropdown

## Step 3: Enable Required APIs

1. Go to the **"APIs & Services"** > **"Library"** menu
2. Search for and enable the following APIs:
   - **"Maps JavaScript API"** - Click it, then click **"Enable"**
   - **"Geocoding API"** - Search, click it, then click **"Enable"**
   - **"Places API"** (optional but recommended) - Search, click it, then click **"Enable"**

## Step 4: Create API Key

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"**
4. Your API key will be generated and displayed in a popup
5. **IMPORTANT**: Click **"Restrict Key"** to secure your API key (recommended)

## Step 5: Restrict Your API Key (Security Best Practice)

1. In the "API key created" popup, click **"Restrict Key"**
2. Under **"Application restrictions"**, select **"HTTP referrers (web sites)"**
3. Add your website referrers:
   - For development: `http://localhost:*` or `http://localhost:3000/*`
   - For production: Add your production domain
4. Under **"API restrictions"**, select **"Restrict key"**
5. Check only these APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API (if you enabled it)
6. Click **"Save"**

## Step 6: Get Your API Key

1. If you closed the popup, go to **"APIs & Services"** > **"Credentials"**
2. Find your API key in the list
3. Click the copy icon or click on the key name to view/copy it

## Step 7: Add API Key to Your App

1. Create a `.env` file in the root of your project (same folder as `package.json`)
2. Add the following line:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
3. Replace `your_actual_api_key_here` with your actual API key
4. **DO NOT** commit the `.env` file to Git (it's already in `.gitignore`)

## Step 8: Restart Your Dev Server

1. Stop your current dev server (Ctrl+C)
2. Run `npm run dev` again
3. The app should now use Google Maps!

## Important Notes

### Free Tier Limits
- Google Maps Platform offers $200 in free credits per month
- This covers approximately 28,000 map loads or 40,000 geocoding requests
- For most personal/small projects, this is more than enough
- Monitor your usage in the Google Cloud Console under "Billing"

### Billing Setup
1. Google requires a billing account to use the Maps API (even for free tier)
2. Go to **"Billing"** in the Cloud Console
3. Set up billing (credit card required, but you won't be charged unless you exceed the $200 monthly credit)
4. Don't worry - as long as you stay within free tier limits, you won't be charged

### Security Tips
- Always restrict your API key to specific domains/IPs
- Never commit your `.env` file to version control
- Monitor your API usage regularly
- Set up billing alerts to avoid unexpected charges

## Troubleshooting

**Problem**: Maps not loading even after adding API key
- **Solution**: Make sure you restarted the dev server after creating the `.env` file
- Check that the API key is correct in `.env`
- Verify that "Maps JavaScript API" is enabled

**Problem**: Geocoding not working
- **Solution**: Ensure "Geocoding API" is enabled in your Google Cloud project

**Problem**: "This page can't load Google Maps correctly" error
- **Solution**: Check that your API key restrictions allow `http://localhost:*` for development

## Need Help?

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Billing and Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

