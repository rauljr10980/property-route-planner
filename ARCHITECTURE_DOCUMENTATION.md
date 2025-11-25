# Property Tax Status Tracker - Complete Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Data Flow](#data-flow)
8. [File-by-File Documentation](#file-by-file-documentation)
9. [Deployment Architecture](#deployment-architecture)
10. [Key Features](#key-features)

---

## Overview

**Property Tax Status Tracker** is a full-stack web application designed to track property tax delinquencies, monitor status changes (Judgment, Active, Pending), and provide route planning capabilities. The system processes Excel files containing property data, identifies status changes over time, and provides visual dashboards and maps for property management.

### Core Functionality
- **Excel File Processing**: Upload and process large Excel files (up to 50MB) with optimized column extraction
- **Status Change Detection**: Automatically detect when properties receive new J (Judgment), A (Active), or P (Pending) status
- **Data Persistence**: Store files and processed data in Google Cloud Storage for persistence across sessions
- **Visual Dashboard**: Interactive maps, charts, and analytics for property data
- **Route Planning**: Create optimized routes for property visits (currently disabled for performance)
- **Multi-Tab Interface**: Unified application with Dashboard, Status Tracker, and File History tabs

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)            │
│                    Hosted on GitHub Pages                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │Status Tracker│  │ File History │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Shared Data Layer (localStorage + GCS)       │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                             │
                             │ HTTP/REST API
                             │
┌───────────────────────────▼─────────────────────────────────┐
│              Backend API (Node.js + Express)                 │
│              Hosted on Google Cloud Run                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  File Upload/Download/Delete/List Endpoints         │  │
│  │  Excel Processing (Server-Side)                      │  │
│  │  Properties Data Persistence                          │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                             │
                             │ Google Cloud Storage API
                             │
┌───────────────────────────▼─────────────────────────────────┐
│              Google Cloud Storage (GCS)                      │
│                                                              │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ files/       │              │ data/        │            │
│  │ (Excel files)│              │ (properties) │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Component Communication

1. **Frontend → Backend**: REST API calls via `fetch()` to Cloud Run service
2. **Backend → GCS**: Google Cloud Storage SDK for file operations
3. **Frontend → Frontend**: Custom Events (`propertiesUpdated`) for cross-component communication
4. **Frontend → localStorage**: Client-side caching (fallback when GCS unavailable)

---

## Technology Stack

### Frontend
- **React 18.2.0**: UI framework
- **TypeScript 5.3.3**: Type safety
- **Vite 5.0.8**: Build tool and dev server
- **Tailwind CSS 3.3.6**: Utility-first CSS framework
- **@react-google-maps/api 2.19.3**: Google Maps integration
- **recharts 3.4.1**: Charting library
- **lucide-react 0.294.0**: Icon library
- **xlsx 0.18.5**: Excel file parsing (client-side fallback)

### Backend
- **Node.js 20**: Runtime environment
- **Express 4.18.2**: Web framework
- **@google-cloud/storage 7.7.0**: GCS SDK
- **multer 1.4.5-lts.1**: File upload middleware
- **cors 2.8.5**: CORS middleware
- **xlsx 0.18.5**: Excel file processing (server-side)

### Infrastructure
- **GitHub Pages**: Frontend hosting
- **Google Cloud Run**: Backend hosting (serverless containers)
- **Google Cloud Storage**: File and data storage
- **Google Secret Manager**: Secure credential storage
- **GitHub Actions**: CI/CD pipeline

### External Services
- **Google Maps API**: Geocoding and map rendering
- **OpenStreetMap Nominatim**: Fallback geocoding service

---

## Project Structure

```
property-route-planner/
├── src/                          # Frontend source code
│   ├── App.tsx                   # Main application component (tab navigation)
│   ├── main.tsx                   # React entry point
│   ├── index.css                 # Global styles
│   ├── components/                # React components
│   │   ├── Dashboard.tsx         # Dashboard tab (stats, graphs, maps)
│   │   ├── FileHistory.tsx       # File upload and history management
│   │   ├── RoutePlanner.tsx      # Route planning (disabled)
│   │   └── TaxTracker.tsx        # Status tracker tab
│   ├── services/                 # Service layer
│   │   ├── gcsStorage.ts         # GCS API client
│   │   └── storageService.ts     # Legacy storage service
│   ├── utils/                    # Utility functions
│   │   ├── fileProcessor.ts      # Excel processing and status detection
│   │   └── sharedData.ts         # Shared state management
│   ├── types/                    # TypeScript type definitions
│   │   └── google-maps.d.ts      # Google Maps type definitions
│   └── scripts/                  # Utility scripts
│       └── analyzeColumnDefinitions.js
├── server/                       # Backend API server
│   ├── index.js                  # Express server and API endpoints
│   ├── Dockerfile                # Docker configuration for Cloud Run
│   ├── package.json              # Backend dependencies
│   └── .dockerignore             # Docker ignore file
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions deployment workflow
├── config/                       # Configuration files
│   ├── gcs-credentials.json     # GCS credentials (gitignored)
│   └── gcs-credentials.example.json
├── dist/                         # Build output (gitignored)
├── node_modules/                 # Dependencies (gitignored)
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── .gitignore                    # Git ignore rules
└── README.md                     # Project documentation
```

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx (Root)
├── LoadScript (Google Maps)
│   └── Tab Navigation
│       ├── Dashboard Tab
│       │   └── Dashboard Component
│       │       ├── Stats Cards
│       │       ├── Trend Filter & Line Chart
│       │       ├── Google Map
│       │       └── Top Properties List
│       ├── Status Tracker Tab
│       │   └── TaxTracker Component
│       │       ├── Stats Overview
│       │       ├── Status Changes Panel
│       │       ├── All Properties Table
│       │       └── Property Details Modal
│       └── File History Tab
│           └── FileHistory Component
│               ├── Upload Interface
│               ├── File List
│               └── File Preview Modal
```

### State Management

**Shared State Pattern**:
- Properties data stored in `localStorage` (fast access)
- Properties data synced to GCS (persistent storage)
- Custom Events (`propertiesUpdated`) notify all components of data changes
- Components listen to events and reload data when needed

**State Flow**:
1. User uploads file in `FileHistory`
2. File processed on backend
3. Properties saved via `sharedData.saveSharedProperties()`
4. Event dispatched: `propertiesUpdated`
5. All components (Dashboard, TaxTracker) listen and reload
6. UI updates automatically

---

## Backend Architecture

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/upload` | POST | Upload file to GCS |
| `/api/download` | GET | Download file from GCS |
| `/api/list` | GET | List all files in GCS |
| `/api/delete` | DELETE | Delete file from GCS |
| `/api/metadata` | GET | Get file metadata |
| `/api/process-file` | POST | Process Excel file server-side |
| `/api/save-properties` | POST | Save processed properties to GCS |
| `/api/load-properties` | GET | Load properties from GCS |

### Processing Pipeline

1. **File Upload**: Multer receives file in memory
2. **Excel Reading**: XLSX reads file buffer
3. **Column Identification**: Header row analyzed to find required columns by title
4. **Column Extraction**: Only needed columns extracted (optimized for large files)
5. **Status Detection**: LEGALSTATUS column checked for J, A, P values
6. **Merge Logic**: New data merged with existing properties
7. **Status Change Detection**: Compare previous vs current status
8. **Data Persistence**: Save to GCS (`files/` for Excel, `data/properties.json` for processed data)
9. **Response**: Return processed properties and status changes

### Column Mapping (Optimized)

The system only extracts 7 specific columns from Excel files:
- **Column E**: CAN (Account/Parcel Number) - Primary identifier
- **Column H**: ADDRSTRING (Address)
- **Column I**: ZIP_CODE (Zip Code)
- **Column Q**: Pnumber (Parcel Number)
- **Column R**: PSTRNAME (Owner Name)
- **Column AE**: LEGALSTATUS (Status: J, A, P)
- **Column BE**: TOT_PERCAN (Tax Percentage)

Columns are identified by **header title** (not position), making the system flexible to handle files with different column orders.

---

## Data Flow

### File Upload Flow

```
User selects Excel file
    ↓
FileHistory.handleFileUpload()
    ↓
gcsStorage.processFile() → POST /api/process-file
    ↓
Backend: Read Excel, extract columns, detect status
    ↓
Backend: Merge with existing properties
    ↓
Backend: Save to GCS (files/ + data/properties.json)
    ↓
Backend: Return processed data
    ↓
Frontend: saveSharedProperties() → Save to localStorage + GCS
    ↓
Frontend: Dispatch 'propertiesUpdated' event
    ↓
All components reload and display new data
```

### Data Loading Flow

```
Component mounts
    ↓
loadSharedProperties() → GET /api/load-properties
    ↓
Backend: Load from GCS (data/properties.json)
    ↓
Backend: Return properties array
    ↓
Frontend: Update localStorage (cache)
    ↓
Frontend: Return to component
    ↓
Component renders with data
```

### Status Change Detection

```
New file uploaded
    ↓
For each property:
    ↓
Extract CAN (identifier)
    ↓
Look up existing property by CAN
    ↓
Extract LEGALSTATUS (new status)
    ↓
Compare: existing.currentStatus vs newStatus
    ↓
If different:
    - Mark as status change
    - Calculate daysSinceStatusChange
    - Add to newStatusChanges array
    ↓
Return all properties + status changes
```

---

## File-by-File Documentation

### Frontend Files

#### `src/App.tsx` (270 lines)
**Purpose**: Root application component, manages tab navigation and Google Maps loading.

**Key Features**:
- Tab state management (`dashboard`, `tracker`, `history`)
- Google Maps API key validation
- Maps loading error handling
- Global upload button (redirects to File History)
- Tab navigation UI

**State**:
- `activeTab`: Current active tab
- `mapsError`: Google Maps loading errors
- `mapsLoaded`: Maps loading status

**Key Functions**:
- `handleUploadClick()`: Redirects to File History and triggers file input
- `handleFileSelected()`: Forwards file selection to FileHistory component

---

#### `src/main.tsx` (11 lines)
**Purpose**: React application entry point.

**Functionality**:
- Creates React root
- Renders App component
- Imports global CSS

---

#### `src/index.css` (Not read, but exists)
**Purpose**: Global CSS styles, Tailwind CSS imports.

---

#### `src/components/Dashboard.tsx` (629 lines)
**Purpose**: Homepage dashboard with statistics, charts, and property map.

**Key Features**:
- **Stats Cards**: Total properties, high priority count, total balance, avg motivation score
- **Trend Filter**: Filter by increasing/stable/decreasing balance trends
- **Line Chart**: Balance trends over time (using Recharts)
- **Google Map**: Interactive map with property markers
- **Top 10 Leads**: Table of highest priority properties
- **Property Details Modal**: Detailed view of selected property

**State**:
- `properties`: Array of all properties
- `selectedProperty`: Currently selected property for details
- `trendFilter`: Current trend filter ('all', 'increasing', 'stable', 'decreasing')
- `geocodedProperties`: Properties with lat/lng coordinates
- `mapCenter`, `mapZoom`: Map viewport state

**Key Functions**:
- `loadData()`: Loads properties from localStorage
- `geocodeProperties()`: Geocodes addresses to get coordinates
- `getFilteredProperties()`: Filters properties by trend
- `getAggregatedTrendData()`: Aggregates balance history for chart
- `getMotivationLabel()`: Returns label and color for motivation score

**Data Source**: Loads from `localStorage.getItem('property-tax-properties')` (synced from shared data)

---

#### `src/components/FileHistory.tsx` (632 lines)
**Purpose**: File upload, processing, and history management.

**Key Features**:
- **File Upload**: Upload Excel files with progress tracking
- **File List**: Display all uploaded files with metadata
- **File Preview**: Modal showing file columns and sample data
- **File Actions**: Download, Load (reprocess), Delete
- **Processing Progress**: Real-time progress bar during processing
- **Stats Display**: Total files, properties, last upload date, storage size

**State**:
- `fileHistory`: Array of uploaded file metadata
- `selectedFile`: Currently selected file for preview
- `loading`: Loading state
- `processingProgress`: Upload/processing progress
- `sharedProperties`: Current properties from shared data
- `lastUploadDate`: Last upload timestamp

**Key Functions**:
- `handleFileUpload()`: Main upload handler
  - Calls `gcsStorage.processFile()` (server-side processing)
  - Saves processed properties via `saveSharedProperties()`
  - Updates file history
  - Shows success/error alerts
- `loadFileFromHistory()`: Reload and reprocess a file
- `downloadFile()`: Download file from GCS
- `deleteFile()`: Delete file from GCS
- `loadFileHistory()`: Load file list from GCS or localStorage
- `loadSharedData()`: Load current properties

**Data Flow**:
1. User selects file
2. File sent to backend `/api/process-file`
3. Backend processes and returns properties
4. Properties saved via `saveSharedProperties()`
5. Event dispatched: `propertiesUpdated`
6. File metadata added to history

---

#### `src/components/TaxTracker.tsx` (1216 lines)
**Purpose**: Property tax status tracking and management.

**Key Features**:
- **Two-Page Layout**: "Dashboard" (home) and "Manage Data" pages
- **Status Changes Panel**: Table showing properties with new J/A/P status
- **Status Filters**: Filter by J, A, P, or all
- **All Properties Table**: Complete list with status change highlighting
- **Property Details Modal**: Detailed property information
- **Export Functionality**: Export all properties to Excel
- **Clear Data**: Clear all stored data

**State**:
- `currentPage`: 'home' or 'data'
- `properties`: All properties
- `selectedProperty`: Selected property for details
- `statusChangeFilter`: Set of statuses to filter by
- `showStatusChanges`: Toggle status changes panel visibility
- `trendFilter`: Balance trend filter
- `geocodedProperties`: Properties with coordinates

**Key Functions**:
- `loadPropertiesFromShared()`: Loads from GCS/localStorage
- `getStatusChanges()`: Returns properties with status changes
- `getFilteredStatusChanges()`: Filters status changes by selected statuses
- `getStatus()`: Extracts status from property
- `getStatusColor()`: Returns CSS class for status badge
- `exportProperties()`: Exports to Excel using XLSX
- `clearAllData()`: Clears localStorage

**Status Change Detection**:
- Compares `previousStatus` vs `currentStatus`
- Highlights rows with status changes (yellow background)
- Shows days since status change
- Filters by new status (J, A, P)

---

#### `src/components/RoutePlanner.tsx` (1026 lines)
**Purpose**: Route planning for property visits (currently disabled in App.tsx).

**Key Features**:
- **Status Filtering**: Filter properties by J, A, P status
- **Route Creation**: Generate Google Maps routes for filtered properties
- **Status Changes Panel**: Similar to TaxTracker
- **Interactive Map**: Google Map with property markers
- **Property List**: Sidebar with filtered properties

**State**:
- `properties`: All properties
- `filteredProperties`: Properties matching current filters
- `statusFilter`: Set of statuses to show
- `selectedProperty`: Selected property
- `statusChangeFilter`: Filter status changes by new status

**Key Functions**:
- `createRoute()`: Opens Google Maps with waypoints
- `toggleStatusFilter()`: Toggle status in filter
- `getStatusChanges()`: Get properties with status changes
- `geocodeProperties()`: Geocode addresses for map

**Note**: This component is currently disabled in `App.tsx` for performance reasons.

---

#### `src/services/gcsStorage.ts` (246 lines)
**Purpose**: Client-side service for Google Cloud Storage operations via backend API.

**Class**: `GCSStorageService`

**Methods**:
- `uploadFile()`: Upload file to GCS
- `downloadFile()`: Download file from GCS
- `listFiles()`: List all files in GCS
- `deleteFile()`: Delete file from GCS
- `getFileMetadata()`: Get file metadata
- `processFile()`: **Main method** - Process Excel file server-side
  - Uploads file to backend
  - Backend processes Excel
  - Returns processed properties and status changes
- `saveProperties()`: Save properties data to GCS
- `loadProperties()`: Load properties data from GCS

**Configuration**:
- `apiUrl`: Backend API URL from `VITE_API_URL` env var (defaults to `http://localhost:3001`)

**Error Handling**: All methods include try-catch with error logging and user-friendly error messages.

---

#### `src/services/storageService.ts` (Not fully read, but exists)
**Purpose**: Legacy storage service (may be unused).

---

#### `src/utils/fileProcessor.ts` (224 lines)
**Purpose**: Excel file processing and status change detection logic.

**Key Functions**:
- `getPropertyIdentifier()`: Extracts unique identifier from property (Account Number, Parcel Number, etc.)
- `getPropertyStatus()`: Extracts status (J, A, P) from property
- `processAndMergeFiles()`: **Main processing function**
  - Takes new file data and existing properties
  - Merges data by identifier
  - Detects status changes
  - Calculates `daysSinceStatusChange`
  - Returns merged properties and status changes array

**Status Change Logic**:
- Compares `existingProperty.currentStatus` vs `newStatus`
- If different, marks as status change
- Calculates days since change from `statusChangeDate`
- Tracks status history in `statusHistory` array

**Data Structures**:
- `Property`: Interface with `id`, `currentStatus`, `previousStatus`, `statusChangeDate`, `daysSinceStatusChange`, `statusHistory`
- `PropertyStatus`: Status history entry

---

#### `src/utils/sharedData.ts` (122 lines)
**Purpose**: Shared state management across all components.

**Key Functions**:
- `saveSharedProperties()`: Saves to both localStorage and GCS
  - Tries localStorage first (fast)
  - Falls back to GCS if localStorage full
  - Dispatches `propertiesUpdated` event
- `loadSharedProperties()`: Loads from GCS first, falls back to localStorage
- `loadSharedPropertiesSync()`: Synchronous version (uses localStorage only)
- `clearSharedProperties()`: Clears all data

**Storage Keys**:
- `property-tax-shared-properties`: Properties array
- `property-tax-last-upload`: Last upload timestamp

**Event System**:
- Dispatches `propertiesUpdated` CustomEvent when data changes
- Components listen via `window.addEventListener('propertiesUpdated', ...)`
- Enables cross-component communication

---

#### `src/types/google-maps.d.ts` (Not read, but exists)
**Purpose**: TypeScript type definitions for Google Maps API.

---

### Backend Files

#### `server/index.js` (645 lines)
**Purpose**: Express.js backend API server for file operations and Excel processing.

**Initialization**:
- Loads GCS credentials from:
  1. Secret Manager file (`/etc/secrets/gcs-credentials`) - Cloud Run
  2. Environment variable (`GCS_CREDENTIALS`) - JSON string
  3. Local file (`config/gcs-credentials.json`) - Development
- Initializes Google Cloud Storage client
- Configures multer for file uploads (50MB max, memory storage)

**Endpoints**:

1. **GET `/health`**: Health check
   - Returns: `{ status: 'ok', service: 'GCS API' }`

2. **POST `/api/upload`**: Upload file to GCS
   - Accepts: Multipart form data with file
   - Saves to: `files/{timestamp}-{filename}`
   - Returns: `{ storagePath, publicUrl, filename, size }`

3. **GET `/api/download`**: Download file from GCS
   - Query param: `path` (storage path)
   - Streams file to response

4. **GET `/api/list`**: List all files in GCS
   - Prefix: `files/`
   - Returns: Array of file metadata with signed URLs

5. **DELETE `/api/delete`**: Delete file from GCS
   - Body: `{ path: storagePath }`

6. **GET `/api/metadata`**: Get file metadata
   - Query param: `path`

7. **POST `/api/save-properties`**: Save properties data to GCS
   - Body: `{ properties: [], uploadDate: string }`
   - Saves to: `data/properties.json`

8. **GET `/api/load-properties`**: Load properties from GCS
   - Returns: `{ properties: [], uploadDate: string }`

9. **POST `/api/process-file`**: **Main processing endpoint**
   - Accepts: Multipart form data with file, `existingProperties` JSON, `uploadDate`
   - Processing steps:
     1. Read Excel file using XLSX
     2. Extract header row
     3. Map columns by title (CAN, ADDRSTRING, ZIP_CODE, Pnumber, PSTRNAME, LEGALSTATUS, TOT_PERCAN)
     4. Extract only needed columns (optimized for large files)
     5. Process in chunks (10,000 rows at a time)
     6. Identify properties by CAN
     7. Detect status from LEGALSTATUS column
     8. Merge with existing properties
     9. Detect status changes
     10. Save file to GCS (`files/`)
     11. Save processed properties to GCS (`data/properties.json`)
   - Returns: `{ properties, newStatusChanges, metadata, storage }`

**Column Mapping Logic**:
- `findColumnByTitle()`: Flexible matching (case-insensitive, partial matches)
- Maps column titles to field names:
  - CAN → Account/Parcel Number
  - ADDRSTRING → Address
  - ZIP_CODE → Zip Code
  - Pnumber → Parcel Number
  - PSTRNAME → Owner Name
  - LEGALSTATUS → Status (J, A, P)
  - TOT_PERCAN → Tax Percentage

**Status Detection**:
- Primary: `LEGALSTATUS` column
- Checks for: 'J', 'A', 'P' (case-insensitive)
- Supports: 'JUDGMENT', 'ACTIVE', 'PENDING' text values

**Error Handling**:
- Try-catch blocks around all async operations
- Detailed error logging
- User-friendly error messages
- Graceful fallbacks

**Server Configuration**:
- Port: `process.env.PORT || 3001`
- Listens on: `0.0.0.0` (all interfaces) for Cloud Run
- CORS: Enabled for all origins

---

#### `server/Dockerfile` (22 lines)
**Purpose**: Docker configuration for Google Cloud Run deployment.

**Configuration**:
- Base image: `node:20-slim`
- Working directory: `/app`
- Copies: `package.json`, then installs dependencies, then copies code
- Exposes: Port 8080 (Cloud Run sets PORT env var)
- Command: `node index.js`

---

#### `server/package.json` (19 lines)
**Purpose**: Backend dependencies.

**Dependencies**:
- `@google-cloud/storage`: GCS SDK
- `cors`: CORS middleware
- `express`: Web framework
- `multer`: File upload middleware
- `xlsx`: Excel processing

**Scripts**:
- `start`: `node index.js`
- `dev`: `node --watch index.js` (development with auto-reload)

---

### Configuration Files

#### `package.json` (33 lines)
**Purpose**: Frontend dependencies and scripts.

**Dependencies**:
- React, React DOM
- Vite, TypeScript
- Tailwind CSS, PostCSS, Autoprefixer
- Google Maps API wrapper
- Recharts, Lucide React icons
- XLSX (client-side Excel parsing)

**Scripts**:
- `dev`: Start development server
- `build`: Build for production
- `preview`: Preview production build
- `analyze-columns`: Analyze Excel column definitions

---

#### `vite.config.ts` (19 lines)
**Purpose**: Vite build configuration.

**Key Settings**:
- React plugin
- Base path: `/property-route-planner/` (for GitHub Pages)
- Build output: `dist/`
- Dev server: Port 3000, auto-open browser

---

#### `tsconfig.json` (23 lines)
**Purpose**: TypeScript compiler configuration.

**Key Settings**:
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode: Disabled (for flexibility)
- Includes: `src/` directory

---

#### `tailwind.config.js` (Not read, but exists)
**Purpose**: Tailwind CSS configuration.

---

#### `postcss.config.js` (Not read, but exists)
**Purpose**: PostCSS configuration for Tailwind.

---

#### `.gitignore` (48 lines)
**Purpose**: Git ignore rules.

**Ignored**:
- `node_modules/`
- `dist/`
- `.env` files
- `config/gcs-credentials.json` (sensitive)
- Large data files: `*.zip`, `*.gdb`, `*.xlsx`
- Extracted data directories
- Credentials files

---

#### `.github/workflows/deploy.yml` (66 lines)
**Purpose**: GitHub Actions CI/CD pipeline for GitHub Pages deployment.

**Workflow**:
1. **Trigger**: Push to `main`/`master` or manual dispatch
2. **Build Job**:
   - Checkout code
   - Setup Node.js 20
   - Install dependencies (`npm ci`)
   - Build with environment variables:
     - `VITE_GOOGLE_MAPS_API_KEY` (from secrets)
     - `VITE_API_URL` (from secrets)
   - Upload artifact to GitHub Pages
3. **Deploy Job**:
   - Deploy artifact to GitHub Pages
   - Uses `deploy-pages@v4` action

**Secrets Required**:
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key
- `VITE_API_URL`: Backend API URL (Cloud Run service URL)

---

## Deployment Architecture

### Frontend Deployment (GitHub Pages)

**Process**:
1. Code pushed to GitHub
2. GitHub Actions workflow triggered
3. Build step: `npm run build` with environment variables
4. Artifact uploaded to GitHub Pages
5. Deployed to: `https://rauljr10980.github.io/property-route-planner/`

**Configuration**:
- Base path: `/property-route-planner/` (matches repo name)
- Environment variables: Injected at build time via GitHub Secrets
- Static files: Served from `dist/` directory

---

### Backend Deployment (Google Cloud Run)

**Process**:
1. Code in `server/` directory
2. Docker image built from `Dockerfile`
3. Deployed to Cloud Run via `gcloud run deploy`
4. Service URL: `https://gcs-api-server-989612961740.us-central1.run.app`

**Configuration**:
- **Memory**: 1Gi
- **Timeout**: 600 seconds (10 minutes)
- **Max Instances**: 10
- **Region**: us-central1
- **Authentication**: Unauthenticated (public API)
- **Credentials**: Loaded from Secret Manager (`gcs-credentials`)

**Deployment Command**:
```bash
gcloud run deploy gcs-api-server \
  --source ./server \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCS_BUCKET_NAME=tax-delinquent-files" \
  --set-secrets "GCS_CREDENTIALS=gcs-credentials:latest" \
  --memory 1Gi \
  --timeout 600 \
  --max-instances 10
```

---

### Google Cloud Storage

**Bucket**: `tax-delinquent-files`

**Structure**:
```
tax-delinquent-files/
├── files/
│   ├── {timestamp}-{filename}.xlsx
│   └── ...
└── data/
    └── properties.json
```

**Permissions**:
- Service account: `service-account@tax-delinquent-software.iam.gserviceaccount.com`
- Required roles:
  - `roles/storage.objectAdmin` (create, read, update, delete)
  - `roles/storage.objectViewer` (list files)

**File Metadata**:
- Stored in GCS object metadata
- Includes: `originalName`, `uploadDate`, `rowCount`, `columns`, `sampleRows`

---

## Key Features

### 1. Optimized Excel Processing

**Problem**: Large Excel files (15MB+, 39,000+ rows) cause performance issues.

**Solution**:
- **Server-side processing**: All files processed on backend (faster, more memory)
- **Column extraction**: Only extracts 7 needed columns (not all columns)
- **Chunked processing**: Processes 10,000 rows at a time
- **Column identification by title**: Flexible to handle different column positions

**Performance**:
- Before: Processing all columns, client-side → Slow, memory issues
- After: Only needed columns, server-side → Fast, handles large files

---

### 2. Status Change Detection

**Logic**:
- Compares `previousStatus` vs `currentStatus` for each property
- Tracks `statusChangeDate` and `daysSinceStatusChange`
- Identifies new properties (previousStatus = null)
- Highlights status changes in UI

**Status Values**:
- **J**: Judgment
- **A**: Active
- **P**: Pending

**Detection Source**: `LEGALSTATUS` column (Column AE) in Excel file

---

### 3. Data Persistence

**Multi-Layer Storage**:
1. **Google Cloud Storage** (Primary):
   - Files: `files/{timestamp}-{filename}.xlsx`
   - Properties: `data/properties.json`
   - Persistent across sessions
2. **localStorage** (Cache):
   - Fast access
   - Falls back if GCS unavailable
   - Limited to ~5-10MB

**Sync Strategy**:
- Save: localStorage first (fast), then GCS (persistent)
- Load: GCS first (latest data), fallback to localStorage

---

### 4. Cross-Component Communication

**Event System**:
- Custom Event: `propertiesUpdated`
- Dispatched when properties data changes
- All components listen and reload data
- Enables real-time updates across tabs

**Implementation**:
```typescript
// Dispatch event
window.dispatchEvent(new CustomEvent('propertiesUpdated', {
  detail: { properties, uploadDate }
}));

// Listen in component
useEffect(() => {
  const handleUpdate = (event: CustomEvent) => {
    loadProperties();
  };
  window.addEventListener('propertiesUpdated', handleUpdate);
  return () => window.removeEventListener('propertiesUpdated', handleUpdate);
}, []);
```

---

### 5. Google Maps Integration

**Features**:
- Interactive map with property markers
- Geocoding: Address → Coordinates
- Marker colors based on status (J=red, A=yellow, P=green)
- Info windows with property details
- Route creation (opens Google Maps with waypoints)

**Fallback**:
- If Google Maps unavailable, uses OpenStreetMap Nominatim API

**Configuration**:
- API key: `VITE_GOOGLE_MAPS_API_KEY`
- Libraries: `places`, `geometry`

---

### 6. File History Management

**Features**:
- Upload history with metadata
- File preview (columns, sample rows)
- Download files from GCS
- Reload/reprocess files
- Delete files
- Search functionality

**Storage**:
- File metadata in localStorage (cache)
- Actual files in GCS
- Syncs on component mount

---

## Environment Variables

### Frontend (GitHub Secrets)
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key
- `VITE_API_URL`: Backend API URL (Cloud Run service URL)

### Backend (Cloud Run Environment)
- `PORT`: Server port (default: 3001, Cloud Run sets to 8080)
- `GCS_BUCKET_NAME`: GCS bucket name (default: `tax-delinquent-files`)
- `GCS_CREDENTIALS`: GCS service account credentials (JSON string, from Secret Manager)

---

## Security Considerations

1. **Credentials**: Never committed to git, stored in Secret Manager
2. **Signed URLs**: GCS files accessed via signed URLs (1-hour expiration)
3. **CORS**: Backend allows all origins (can be restricted if needed)
4. **File Size Limits**: 50MB max file size (multer configuration)
5. **API Keys**: Google Maps API key restricted to specific domains

---

## Performance Optimizations

1. **Column Extraction**: Only extracts 7 needed columns (not all)
2. **Chunked Processing**: Processes files in 10,000-row chunks
3. **Server-Side Processing**: All Excel processing on backend (more memory, faster)
4. **localStorage Caching**: Fast access to frequently used data
5. **Lazy Loading**: Components load data on demand
6. **Route Planner Disabled**: Disabled for performance (can be re-enabled)

---

## Known Limitations

1. **localStorage Size**: Limited to ~5-10MB (large files may exceed)
2. **Google Maps API Quotas**: Geocoding has rate limits
3. **File Size**: 50MB max (can be increased)
4. **Route Planner**: Currently disabled (can be re-enabled if needed)

---

## Future Enhancements

1. **Pagination**: For large property lists
2. **Advanced Filtering**: More filter options
3. **Export Formats**: CSV, PDF export
4. **Bulk Operations**: Bulk delete, bulk update
5. **User Authentication**: Multi-user support
6. **Real-Time Updates**: WebSocket for live updates
7. **Mobile App**: React Native version

---

## Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Google Cloud account (for GCS)
- Google Maps API key

### Local Development

1. **Clone repository**
2. **Install dependencies**:
   ```bash
   npm install
   cd server && npm install
   ```
3. **Configure environment**:
   - Create `.env` file:
     ```
     VITE_GOOGLE_MAPS_API_KEY=your_key_here
     VITE_API_URL=http://localhost:3001
     ```
   - Add GCS credentials: `config/gcs-credentials.json`
4. **Start backend**:
   ```bash
   cd server
   npm run dev
   ```
5. **Start frontend**:
   ```bash
   npm run dev
   ```

---

## Conclusion

This is a comprehensive full-stack application for property tax status tracking with:
- **Optimized Excel processing** for large files
- **Automatic status change detection**
- **Persistent cloud storage**
- **Interactive dashboards and maps**
- **Multi-tab unified interface**

The architecture is designed for scalability, performance, and maintainability, with clear separation between frontend, backend, and storage layers.

