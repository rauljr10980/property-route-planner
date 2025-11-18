# Property Route Planner

A React application that allows you to upload Excel files with property data, geocode addresses using Google Maps, and create optimized routes for property visits.

## Features

- 📊 **Excel File Upload**: Upload `.xlsx` or `.xls` files with property data
- 🗺️ **Interactive Google Maps**: View all properties on an interactive map
- 📍 **Address Geocoding**: Automatically convert addresses to coordinates using Google Maps API (with OpenStreetMap fallback)
- 🎯 **Smart Filtering**: Filter properties by tax percentage
- 🚗 **Route Planning**: Generate optimized Google Maps routes for selected properties
- 💡 **Property Details**: View detailed information for each property

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Google Maps API Key** (Optional but recommended)
   
   Create a `.env` file in the root directory:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```
   
   To get a Google Maps API key:
   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project or select an existing one
   3. Enable the "Maps JavaScript API" and "Geocoding API"
   4. Create credentials (API Key)
   5. Copy the API key to your `.env` file
   
   **Note**: If you don't configure a Google Maps API key, the app will use OpenStreetMap's Nominatim service as a fallback (free but may have rate limits).

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

   The app will open at `http://localhost:3000`

## Usage

1. **Prepare Your Excel File**
   - Your Excel file should have columns for:
     - **Street/City** (required): Full street address
     - **State** (required): State abbreviation (e.g., TX)
     - **Zip Code** (required): ZIP code
     - **Taxes Owed** (optional): Amount of taxes owed
     - **Appraised Value** (optional): Property value
     - **Owner** (optional): Owner name
     - **Property Type** (optional): Type of property

2. **Upload and Map Columns**
   - Click "Upload Excel" and select your file
   - Map your Excel columns to the required fields
   - Click "Process Properties"

3. **View Properties on Map**
   - All geocoded properties will appear as red markers on the map
   - Click on a marker to see property details
   - Click on a property in the list to center the map on it

4. **Filter and Create Routes**
   - Use the slider to filter properties by tax percentage
   - Click "Create Route" to open an optimized route in Google Maps

## Excel File Format Example

| Street Address | State | Zip Code | Taxes Owed | Appraised Value | Owner |
|---------------|-------|----------|------------|-----------------|-------|
| 123 Main St   | TX    | 78205    | 5000       | 150000          | John Doe |
| 456 Oak Ave   | TX    | 78210    | 3000       | 120000          | Jane Smith |

## Technologies

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Google Maps API** - Maps and geocoding
- **XLSX** - Excel file parsing
- **Lucide React** - Icons

## Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Deployment

This app can be deployed to GitHub Pages for free hosting. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

**Quick deploy steps:**
1. Push code to GitHub repository
2. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
3. Add `VITE_GOOGLE_MAPS_API_KEY` as repository secret
4. Update Google Maps API key restrictions to include your GitHub Pages domain
5. Push to `main` branch to trigger deployment

Your live site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

**Alternative:** Deploy to [Vercel](https://vercel.com) for easier setup - just connect your GitHub repo!

## License

MIT

