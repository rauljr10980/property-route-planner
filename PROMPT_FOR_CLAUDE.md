# Prompt for Claude AI: Excel File History & Management Tab

## Context
I have a React + TypeScript application with a tabbed interface. The app currently has:
- **Dashboard tab**: Shows analytics, graphs, and maps
- **Route Planner tab**: Property mapping and route creation
- **Status Tracker tab**: Upload Excel files and manage property data

## Task
Create a new **"File History"** tab that allows users to:
1. View all previously uploaded Excel files with metadata (filename, upload date, number of properties, file size)
2. Download any previously uploaded file
3. Delete files from history
4. Re-upload/modify files (replace existing file or upload new version)
5. View file details (preview first few rows, column names, total rows)

## Technical Requirements

### Tech Stack
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS for styling
- XLSX library for Excel file handling
- localStorage for persistence (already used in the app)
- Lucide React for icons

### File Structure
- Main app: `src/App.tsx` (manages tabs)
- Components: `src/components/` directory
- The app uses `localStorage` with keys like `'property-tax-uploads'` and `'property-tax-properties'`

### Implementation Details

1. **Create new component**: `src/components/FileHistory.tsx`
   - Should be a standalone component that manages file history
   - Store file data in localStorage with key `'property-tax-file-history'`
   - Each file entry should include:
     - Unique ID (timestamp or UUID)
     - Original filename
     - Upload date/time
     - File size (bytes)
     - Number of properties/rows
     - File data (as base64 or ArrayBuffer - consider storage limits)
     - Column names/headers
     - Sample rows (first 3-5 rows for preview)

2. **Add to App.tsx**:
   - Import the new FileHistory component
   - Add a new tab button in the navigation
   - Add the component to the tab content rendering

3. **Features to implement**:
   - **File List View**: Table or card layout showing all uploaded files
   - **Upload New File**: Button to upload Excel files (similar to existing upload functionality)
   - **File Preview**: Modal or expandable section showing:
     - File metadata (name, date, size, row count)
     - Column headers
     - First few sample rows
   - **Download Button**: Download the original Excel file
   - **Delete Button**: Remove file from history (with confirmation)
   - **Replace/Update**: Option to upload a new version of an existing file
   - **Search/Filter**: Ability to search files by name or filter by date

4. **Storage Considerations**:
   - localStorage has ~5-10MB limit
   - For large files, consider:
     - Storing only metadata and requiring re-upload
     - OR compressing file data
     - OR warning users about storage limits
   - Store file data as base64 string or ArrayBuffer

5. **UI/UX Requirements**:
   - Use Tailwind CSS classes (consistent with existing app)
   - Use Lucide React icons (FileText, Download, Trash2, Upload, Calendar, etc.)
   - Responsive design (mobile-friendly)
   - Loading states for file operations
   - Error handling with user-friendly messages
   - Confirmation dialogs for destructive actions (delete)

6. **Integration Points**:
   - When files are uploaded in Status Tracker tab, they should also be saved to File History
   - File History should be able to load a file and populate the Status Tracker or Dashboard
   - Consider sharing file data between components via localStorage or context

## Code Style
- Use TypeScript with proper interfaces/types
- Use functional components with hooks (useState, useEffect)
- Follow existing code patterns in the app
- Use async/await for file operations
- Handle errors gracefully with try/catch

## Example Data Structure
```typescript
interface FileHistoryEntry {
  id: string;
  filename: string;
  uploadDate: string; // ISO string
  fileSize: number; // bytes
  rowCount: number;
  columns: string[];
  sampleRows: any[]; // First 3-5 rows
  fileData?: string; // Base64 encoded file data (optional, for download)
}
```

## Deliverables
1. Complete `FileHistory.tsx` component
2. Updated `App.tsx` with new tab
3. Integration code to save files from Status Tracker to File History
4. Helper functions for file operations (save, load, delete)

## Notes
- The app already uses `localStorage.getItem()` and `localStorage.setItem()` for persistence
- Existing upload functionality is in `TaxTracker.tsx` component
- The app uses `XLSX.read()` and `XLSX.utils.sheet_to_json()` for Excel parsing
- Make sure to handle edge cases (empty files, invalid formats, storage quota exceeded)

