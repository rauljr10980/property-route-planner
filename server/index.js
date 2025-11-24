// Backend API server for Google Cloud Storage
// Handles secure file uploads/downloads using service account
// Deploy to: Railway, Render, Google Cloud Run, or similar

import express from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Cloud Storage
let storage;
let bucket;

try {
  // Load credentials from:
  // 1. Secret Manager file (Cloud Run: /etc/secrets/gcs-credentials)
  // 2. Environment variable (JSON string)
  // 3. Local file (development)
  let credentials;
  
  // Try Secret Manager file first (Cloud Run)
  const secretPath = '/etc/secrets/gcs-credentials';
  if (existsSync(secretPath)) {
    console.log('📁 Loading credentials from Secret Manager...');
    credentials = JSON.parse(readFileSync(secretPath, 'utf8'));
  } else if (process.env.GCS_CREDENTIALS) {
    // Try environment variable (JSON string)
    try {
      console.log('📁 Loading credentials from environment variable...');
      credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    } catch (parseError) {
      console.error('❌ Failed to parse GCS_CREDENTIALS as JSON:', parseError.message);
      console.error('GCS_CREDENTIALS length:', process.env.GCS_CREDENTIALS?.length);
      throw parseError;
    }
  } else {
    // Try to read from local file (for local development)
    console.log('📁 Loading credentials from local file...');
    const credsPath = path.join(__dirname, '../config/gcs-credentials.json');
    credentials = JSON.parse(readFileSync(credsPath, 'utf8'));
  }

  storage = new Storage({
    projectId: credentials.project_id,
    credentials: credentials
  });

  // Use bucket name from env or default
  const bucketName = process.env.GCS_BUCKET_NAME || 'tax-delinquent-files';
  bucket = storage.bucket(bucketName);

  console.log('✅ Google Cloud Storage initialized');
  console.log('📁 Bucket:', bucketName);
  console.log('🔑 Project:', credentials.project_id);
} catch (error) {
  console.error('❌ Failed to initialize GCS:', error.message);
  console.error('Error stack:', error.stack);
  process.exit(1);
}

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'GCS API' });
});

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    // Create unique file path
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `files/${timestamp}-${sanitizedFilename}`;
    const fileRef = bucket.file(storagePath);

    // Upload to GCS
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        metadata: {
          originalName: file.originalname,
          uploadDate: new Date().toISOString(),
          rowCount: metadata.rowCount?.toString() || '',
          columns: JSON.stringify(metadata.columns || []),
          sampleRows: JSON.stringify(metadata.sampleRows || [])
        }
      }
    });

    // Generate signed URL (valid for 1 hour) - more secure than public access
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000 // 1 hour
    });

    res.json({
      storagePath,
      publicUrl: signedUrl, // Actually a signed URL, but keeping name for compatibility
      filename: file.originalname,
      size: file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Download file
app.get('/api/download', async (req, res) => {
  try {
    const { path: storagePath } = req.query;

    if (!storagePath) {
      return res.status(400).json({ error: 'Path parameter required' });
    }

    const fileRef = bucket.file(storagePath);
    const [exists] = await fileRef.exists();

    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Stream file to response
    const stream = fileRef.createReadStream();
    stream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || 'Download failed' });
  }
});

// List files
app.get('/api/list', async (req, res) => {
  try {
    const [files] = await bucket.getFiles({ prefix: 'files/' });

    const fileList = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        const [exists] = await file.exists();
        
        if (!exists) return null;

        // Generate signed URL (valid for 1 hour) - more secure than public access
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000 // 1 hour
        });

        return {
          name: file.name,
          url: signedUrl,
          size: parseInt(metadata.size || '0'),
          timeCreated: metadata.timeCreated,
          metadata: metadata.metadata
        };
      })
    );

    // Filter out nulls and sort by timeCreated (newest first)
    const validFiles = fileList.filter(f => f !== null);
    validFiles.sort((a, b) => 
      new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime()
    );

    res.json(validFiles);
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message || 'List failed' });
  }
});

// Delete file
app.delete('/api/delete', async (req, res) => {
  try {
    const { path: storagePath } = req.body;

    if (!storagePath) {
      return res.status(400).json({ error: 'Path parameter required' });
    }

    const fileRef = bucket.file(storagePath);
    await fileRef.delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message || 'Delete failed' });
  }
});

// Get file metadata
app.get('/api/metadata', async (req, res) => {
  try {
    const { path: storagePath } = req.query;

    if (!storagePath) {
      return res.status(400).json({ error: 'Path parameter required' });
    }

    const fileRef = bucket.file(storagePath);
    const [metadata] = await fileRef.getMetadata();

    res.json(metadata);
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: error.message || 'Metadata fetch failed' });
  }
});

// Save properties data to GCS (for persistence)
app.post('/api/save-properties', async (req, res) => {
  try {
    const { properties, uploadDate } = req.body;

    if (!properties || !Array.isArray(properties)) {
      return res.status(400).json({ error: 'Properties array required' });
    }

    const dataPath = 'data/properties.json';
    const fileRef = bucket.file(dataPath);

    const data = {
      properties,
      uploadDate: uploadDate || new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await fileRef.save(JSON.stringify(data, null, 2), {
      metadata: {
        contentType: 'application/json',
        metadata: {
          uploadDate: data.uploadDate,
          propertyCount: properties.length.toString()
        }
      }
    });

    console.log(`✅ Saved ${properties.length} properties to GCS`);

    res.json({ success: true, propertyCount: properties.length });
  } catch (error) {
    console.error('Save properties error:', error);
    res.status(500).json({ error: error.message || 'Failed to save properties' });
  }
});

// Load properties data from GCS
app.get('/api/load-properties', async (req, res) => {
  try {
    const dataPath = 'data/properties.json';
    const fileRef = bucket.file(dataPath);

    const [exists] = await fileRef.exists();
    
    if (!exists) {
      return res.json({ properties: [], uploadDate: null });
    }

    const [file] = await fileRef.download();
    const data = JSON.parse(file.toString());

    console.log(`✅ Loaded ${data.properties?.length || 0} properties from GCS`);

    res.json({
      properties: data.properties || [],
      uploadDate: data.uploadDate || null,
      lastUpdated: data.lastUpdated || null
    });
  } catch (error) {
    console.error('Load properties error:', error);
    // Return empty if file doesn't exist or can't be read
    res.json({ properties: [], uploadDate: null });
  }
});

// Process Excel file server-side (for large files)
app.post('/api/process-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const existingPropertiesJson = req.body.existingProperties || '[]';
    const uploadDate = req.body.uploadDate || new Date().toISOString();

    console.log(`📊 Processing file: ${file.originalname} (${file.size} bytes)`);

    // Read Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get total rows (approximate)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalRows = range.e.r + 1;
    
    console.log(`📈 Total rows: ${totalRows}`);

    // Convert to JSON in chunks for large files
    const CHUNK_SIZE = 5000; // Process 5000 rows at a time
    const jsonData = [];
    
    // Process in chunks to avoid memory issues
    for (let startRow = 0; startRow <= range.e.r; startRow += CHUNK_SIZE) {
      const endRow = Math.min(startRow + CHUNK_SIZE - 1, range.e.r);
      const chunkRange = XLSX.utils.encode_range({
        s: { c: 0, r: startRow },
        e: { c: range.e.c, r: endRow }
      });
      
      const chunkSheet = XLSX.utils.sheet_to_json(worksheet, {
        range: chunkRange,
        defval: null
      });
      
      jsonData.push(...chunkSheet);
      console.log(`✅ Processed rows ${startRow + 1}-${endRow + 1} (${jsonData.length}/${totalRows})`);
    }

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in Excel file' });
    }

    // Extract metadata
    const columns = Object.keys(jsonData[0] || {});
    const sampleRows = jsonData.slice(0, 5);

    // Process status changes (simplified version - full logic in frontend)
    const existingProperties = JSON.parse(existingPropertiesJson);
    const existingMap = new Map();
    existingProperties.forEach(prop => {
      if (prop.id) {
        existingMap.set(prop.id, prop);
      }
    });

    // Helper functions (same as frontend)
    const getPropertyIdentifier = (property) => {
      const keys = ['Account Number', 'accountNumber', 'Account', 'account', 
                    'Parcel Number', 'parcelNumber', 'Parcel', 'parcel',
                    'Property ID', 'propertyId', 'ID', 'id'];
      for (const key of keys) {
        if (property[key]) {
          return String(property[key]).trim();
        }
      }
      return null;
    };

    const getPropertyStatus = (property) => {
      const statusKeys = ['Status', 'Judgment Status', 'Tax Status', 'Foreclosure Status', 'status'];
      for (const key of statusKeys) {
        if (property[key]) {
          const value = String(property[key]).trim().toUpperCase();
          if (value === 'J' || value === 'A' || value === 'P') {
            return value;
          }
        }
      }
      for (const key in property) {
        const value = String(property[key]).trim().toUpperCase();
        if (value === 'J' || value === 'A' || value === 'P') {
          return value;
        }
      }
      return null;
    };

    // Process properties and detect status changes
    const processedProperties = [];
    const newStatusChanges = [];
    const processedIds = new Set();

    jsonData.forEach((propData) => {
      const identifier = getPropertyIdentifier(propData);
      if (!identifier) return;

      const newStatus = getPropertyStatus(propData);
      const existingProperty = existingMap.get(identifier);

      let property = {
        ...propData,
        id: identifier,
        currentStatus: newStatus,
        previousStatus: existingProperty?.currentStatus || null,
        statusChangeDate: uploadDate,
        daysSinceStatusChange: 0
      };

      if (existingProperty) {
        const oldStatus = existingProperty.currentStatus || null;
        if (oldStatus !== newStatus && newStatus) {
          // Status changed
          const statusChangeDate = new Date(uploadDate);
          const now = new Date();
          const daysSinceChange = Math.max(0, Math.floor((now.getTime() - statusChangeDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          property = {
            ...property,
            previousStatus: oldStatus,
            daysSinceStatusChange: daysSinceChange
          };

          newStatusChanges.push({
            property,
            oldStatus,
            newStatus,
            daysSinceChange
          });
        } else {
          // Status didn't change, keep existing status change date
          property = {
            ...property,
            previousStatus: existingProperty.previousStatus,
            statusChangeDate: existingProperty.statusChangeDate || uploadDate,
            daysSinceStatusChange: existingProperty.daysSinceStatusChange || 0
          };
        }
      } else if (newStatus) {
        // New property with status
        newStatusChanges.push({
          property,
          oldStatus: null,
          newStatus,
          daysSinceChange: 0
        });
      }

      processedProperties.push(property);
      processedIds.add(identifier);
    });

    console.log(`✅ Processing complete: ${processedProperties.length} properties, ${newStatusChanges.length} status changes`);

    // Upload file to GCS
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `files/${timestamp}-${sanitizedFilename}`;
    const fileRef = bucket.file(storagePath);

    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        metadata: {
          originalName: file.originalname,
          uploadDate: uploadDate,
          rowCount: processedProperties.length.toString(),
          columns: JSON.stringify(columns),
          sampleRows: JSON.stringify(sampleRows)
        }
      }
    });

    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000
    });

    // Save processed properties to GCS for persistence
    const dataPath = 'data/properties.json';
    const dataFileRef = bucket.file(dataPath);
    const propertiesData = {
      properties: processedProperties,
      uploadDate: uploadDate,
      lastUpdated: new Date().toISOString()
    };
    
    try {
      await dataFileRef.save(JSON.stringify(propertiesData, null, 2), {
        metadata: {
          contentType: 'application/json',
          metadata: {
            uploadDate: uploadDate,
            propertyCount: processedProperties.length.toString()
          }
        }
      });
      console.log(`✅ Saved ${processedProperties.length} properties to GCS for persistence`);
    } catch (saveError) {
      console.warn('⚠️ Failed to save properties to GCS (will be saved by frontend):', saveError.message);
      // Continue - frontend will save it
    }

    res.json({
      success: true,
      properties: processedProperties,
      newStatusChanges,
      metadata: {
        filename: file.originalname,
        uploadDate,
        fileSize: file.size,
        rowCount: processedProperties.length,
        columns,
        sampleRows,
        totalRows,
        statusChangesCount: newStatusChanges.length
      },
      storage: {
        storagePath,
        publicUrl: signedUrl
      }
    });
  } catch (error) {
    console.error('Process file error:', error);
    res.status(500).json({ 
      error: error.message || 'File processing failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check endpoint (must be before server starts)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'GCS API Server is running',
    port: PORT,
    bucket: bucket?.name || 'not initialized'
  });
});

// Start server
// Cloud Run requires listening on 0.0.0.0 (all interfaces)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GCS API Server running on port ${PORT}`);
  console.log(`📁 Bucket: ${bucket.name}`);
  console.log(`✅ Server is ready to accept connections`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

