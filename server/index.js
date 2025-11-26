// Backend API server for Google Cloud Storage
// Handles secure file uploads/downloads using service account
// Deploy to: Railway, Render, Google Cloud Run, or similar

import express from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS: Restrict to GitHub Pages domain for security
const allowedOrigins = [
  'https://rauljr10980.github.io',
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// ============================================================================
// COST CONTROL & RATE LIMITING - Budget: $10/month
// ============================================================================

// Rate limiting for status-related requests (J, A, P)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

// Daily quotas to prevent cost overruns
const dailyQuotaMap = new Map();
const DAILY_QUOTA_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// Cost-aware limits (conservative to stay within $10/month budget)
const COST_LIMITS = {
  // File processing is expensive (CPU, memory, GCS operations)
  PROCESS_FILE_PER_DAY: 10,        // Max 10 file uploads per day per IP
  PROCESS_FILE_PER_HOUR: 3,        // Max 3 file uploads per hour per IP
  PROCESS_FILE_SIZE_MB: 20,         // Max 20MB per file (reduced from 50MB)
  
  // Status-related API calls
  STATUS_REQUESTS_PER_DAY: 500,    // Max 500 status requests per day per IP
  STATUS_REQUESTS_PER_HOUR: 100,   // Max 100 status requests per hour per IP
  
  // General API calls
  GENERAL_REQUESTS_PER_DAY: 1000,  // Max 1000 general requests per day per IP
  GENERAL_REQUESTS_PER_HOUR: 200,  // Max 200 general requests per hour per IP
  
  // GCS operations (read/write costs money)
  GCS_OPERATIONS_PER_DAY: 200,     // Max 200 GCS operations per day per IP
};

// Check if request involves J, A, or P status
const involvesStatus = (req) => {
  // Status-related endpoints that always process J/A/P status
  const statusEndpoints = [
    '/api/process-file',      // Processes Excel and detects J/A/P status changes
    '/api/load-properties',   // Loads properties which contain J/A/P status
    '/api/save-properties'    // Saves properties which contain J/A/P status
  ];
  
  // Check if endpoint is status-related
  if (statusEndpoints.some(endpoint => req.path === endpoint || req.path.includes(endpoint))) {
    return true;
  }
  
  // Check query parameters for status filters (J, A, P)
  if (req.query) {
    const queryStr = JSON.stringify(req.query).toUpperCase();
    if (queryStr.includes('"J"') || queryStr.includes('"A"') || queryStr.includes('"P"') ||
        queryStr.includes('JUDGMENT') || queryStr.includes('ACTIVE') || queryStr.includes('PENDING') ||
        queryStr.includes('STATUS')) {
      return true;
    }
  }
  
  // Check request body for status-related data (only if body is already parsed)
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body).toUpperCase();
    // Check for status-related fields
    if (bodyStr.includes('"STATUS"') || bodyStr.includes('"LEGALSTATUS"') ||
        bodyStr.includes('"CURRENTSTATUS"') || bodyStr.includes('"PREVIOUSSTATUS"') ||
        bodyStr.includes('"NEWSTATUS"') || bodyStr.includes('"OLDSTATUS"')) {
      // Check if body contains J, A, or P status values
      if (bodyStr.match(/["\']J["\']|["\']A["\']|["\']P["\']/)) {
        return true;
      }
    }
    // Check for properties array that might contain status
    if (bodyStr.includes('"PROPERTIES"') && 
        (bodyStr.includes('"J"') || bodyStr.includes('"A"') || bodyStr.includes('"P"'))) {
      return true;
    }
  }
  
  return false;
};

// Daily quota checker
const checkDailyQuota = (ip, operationType, limit) => {
  const now = Date.now();
  const dayKey = `${ip}-${operationType}-${Math.floor(now / DAILY_QUOTA_WINDOW)}`;
  const hourKey = `${ip}-${operationType}-${Math.floor(now / (60 * 60 * 1000))}`;
  
  // Clean up old entries
  if (dailyQuotaMap.size > 50000) {
    for (const [key, value] of dailyQuotaMap.entries()) {
      if (now - value.firstRequest > DAILY_QUOTA_WINDOW) {
        dailyQuotaMap.delete(key);
      }
    }
  }
  
  const daily = dailyQuotaMap.get(dayKey) || { count: 0, firstRequest: now };
  const hourly = dailyQuotaMap.get(hourKey) || { count: 0, firstRequest: now };
  
  return { daily, hourly, dayKey, hourKey };
};

// Enhanced rate limiting with daily quotas
const statusRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Check if request involves status
  const isStatusRequest = involvesStatus(req);
  
  if (isStatusRequest) {
    // Check daily/hourly quotas for status requests
    const { daily, hourly, dayKey, hourKey } = checkDailyQuota(ip, 'status', COST_LIMITS.STATUS_REQUESTS_PER_DAY);
    
    if (daily.count >= COST_LIMITS.STATUS_REQUESTS_PER_DAY) {
      return res.status(429).json({ 
        error: 'Daily quota exceeded. Maximum 500 status-related requests per day to control costs.',
        quotaType: 'daily',
        limit: COST_LIMITS.STATUS_REQUESTS_PER_DAY,
        retryAfter: Math.ceil((DAILY_QUOTA_WINDOW - (now - daily.firstRequest)) / 1000)
      });
    }
    
    if (hourly.count >= COST_LIMITS.STATUS_REQUESTS_PER_HOUR) {
      return res.status(429).json({ 
        error: 'Hourly quota exceeded. Maximum 100 status-related requests per hour.',
        quotaType: 'hourly',
        limit: COST_LIMITS.STATUS_REQUESTS_PER_HOUR,
        retryAfter: 3600
      });
    }
    
    // Update quotas
    daily.count++;
    hourly.count++;
    dailyQuotaMap.set(dayKey, daily);
    dailyQuotaMap.set(hourKey, hourly);
    
    // Also check per-minute rate limit
    if (rateLimitMap.size > 10000) {
      for (const [key, value] of rateLimitMap.entries()) {
        if (now - value.firstRequest > RATE_LIMIT_WINDOW) {
          rateLimitMap.delete(key);
        }
      }
    }
    
    const key = `${ip}-${Math.floor(now / RATE_LIMIT_WINDOW)}`;
    const current = rateLimitMap.get(key) || { count: 0, firstRequest: now };
    
    if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({ 
        error: 'Too many status-related requests. Please try again later.',
        retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - current.firstRequest)) / 1000)
      });
    }
    
    current.count++;
    rateLimitMap.set(key, current);
  }
  
  next();
};

// Apply rate limiting to all API endpoints
app.use('/api', statusRateLimit);

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

// Configure multer for file uploads
// Use disk storage for large files to avoid memory issues
const uploadDir = path.join(__dirname, 'uploads');
try {
  mkdirSync(uploadDir, { recursive: true });
} catch (err) {
  // Directory might already exist
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Some systems send this for Excel
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      return cb(new Error('Invalid file type. Only .xlsx and .xls files are allowed.'));
    }
    
    if (!allowedMimes.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
      // Allow octet-stream as fallback (some browsers send this)
      console.warn(`Unexpected MIME type: ${file.mimetype} for file: ${file.originalname}`);
    }
    
    cb(null, true);
  }
});

// Health check (no rate limiting)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'GCS API',
    timestamp: new Date().toISOString(),
    limits: {
      fileProcessing: {
        perDay: COST_LIMITS.PROCESS_FILE_PER_DAY,
        perHour: COST_LIMITS.PROCESS_FILE_PER_HOUR,
        maxSizeMB: COST_LIMITS.PROCESS_FILE_SIZE_MB
      },
      statusRequests: {
        perDay: COST_LIMITS.STATUS_REQUESTS_PER_DAY,
        perHour: COST_LIMITS.STATUS_REQUESTS_PER_HOUR
      },
      generalRequests: {
        perDay: COST_LIMITS.GENERAL_REQUESTS_PER_DAY,
        perHour: COST_LIMITS.GENERAL_REQUESTS_PER_HOUR
      },
      gcsOperations: {
        perDay: COST_LIMITS.GCS_OPERATIONS_PER_DAY
      }
    }
  });
});

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Check file size limit
    const maxSizeMB = COST_LIMITS.PROCESS_FILE_SIZE_MB;
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      // Clean up temp file
      if (file.path && !file.buffer) {
        try { unlinkSync(file.path); } catch (e) {}
      }
      return res.status(400).json({ 
        error: `File size exceeds limit of ${maxSizeMB}MB. Please split your file or compress it.`,
        maxSizeMB,
        fileSizeMB: fileSizeMB.toFixed(2)
      });
    }
    
    // Check GCS operations quota (GCS read/write costs money)
    const { daily, dayKey } = checkDailyQuota(ip, 'gcs-operations', COST_LIMITS.GCS_OPERATIONS_PER_DAY);
    if (daily.count >= COST_LIMITS.GCS_OPERATIONS_PER_DAY) {
      // Clean up temp file
      if (file.path && !file.buffer) {
        try { unlinkSync(file.path); } catch (e) {}
      }
      return res.status(429).json({ 
        error: 'Daily storage quota exceeded. Maximum 200 storage operations per day to control costs.',
        quotaType: 'daily',
        limit: COST_LIMITS.GCS_OPERATIONS_PER_DAY
      });
    }
    
    // Update quota
    daily.count++;
    dailyQuotaMap.set(dayKey, daily);
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    // Create unique file path
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `files/${timestamp}-${sanitizedFilename}`;
    const fileRef = bucket.file(storagePath);

    // Upload to GCS
    // Read file data (from disk if using disk storage)
    const fileData = file.buffer || readFileSync(file.path);
    
    await fileRef.save(fileData, {
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
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const existingPropertiesJson = req.body.existingProperties || '[]';
    const uploadDate = req.body.uploadDate || new Date().toISOString();

    // Check file size limit (reduced to 20MB to control costs)
    const maxSizeMB = COST_LIMITS.PROCESS_FILE_SIZE_MB;
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      // Clean up temp file
      if (file.path && !file.buffer) {
        try { unlinkSync(file.path); } catch (e) {}
      }
      return res.status(400).json({ 
        error: `File size exceeds limit of ${maxSizeMB}MB. Large files consume more resources and cost more. Please split your file or compress it.`,
        maxSizeMB,
        fileSizeMB: fileSizeMB.toFixed(2)
      });
    }
    
    // Check daily quota for file processing (expensive operation)
    const { daily, hourly, dayKey, hourKey } = checkDailyQuota(ip, 'process-file', COST_LIMITS.PROCESS_FILE_PER_DAY);
    
    if (daily.count >= COST_LIMITS.PROCESS_FILE_PER_DAY) {
      // Clean up temp file
      if (file.path && !file.buffer) {
        try { unlinkSync(file.path); } catch (e) {}
      }
      return res.status(429).json({ 
        error: 'Daily file processing quota exceeded. Maximum 10 file uploads per day to control costs. Please try again tomorrow.',
        quotaType: 'daily',
        limit: COST_LIMITS.PROCESS_FILE_PER_DAY,
        retryAfter: Math.ceil((DAILY_QUOTA_WINDOW - (Date.now() - daily.firstRequest)) / 1000)
      });
    }
    
    if (hourly.count >= COST_LIMITS.PROCESS_FILE_PER_HOUR) {
      // Clean up temp file
      if (file.path && !file.buffer) {
        try { unlinkSync(file.path); } catch (e) {}
      }
      return res.status(429).json({ 
        error: 'Hourly file processing quota exceeded. Maximum 3 file uploads per hour. Please wait before uploading another file.',
        quotaType: 'hourly',
        limit: COST_LIMITS.PROCESS_FILE_PER_HOUR,
        retryAfter: 3600
      });
    }
    
    // Update quotas
    daily.count++;
    hourly.count++;
    dailyQuotaMap.set(dayKey, daily);
    dailyQuotaMap.set(hourKey, hourly);
    
    console.log(`📊 Processing file: ${file.originalname} (${file.size} bytes)`);
    console.log(`📊 File processing quota: ${daily.count}/${COST_LIMITS.PROCESS_FILE_PER_DAY} today, ${hourly.count}/${COST_LIMITS.PROCESS_FILE_PER_HOUR} this hour`);

    // Validate file is not empty
    if (file.size === 0) {
      // Clean up temp file
      if (file.path) {
        try { unlinkSync(file.path); } catch (e) {}
      }
      return res.status(400).json({ error: 'File is empty' });
    }

    // Do basic file format validation before processing
    // Read just the first few bytes to check if it's a valid Excel file
    try {
      const fileBuffer = file.buffer || readFileSync(file.path);
      const workbook = XLSX.read(fileBuffer, { 
        type: 'buffer',
        cellDates: false,
        dense: false,
        sheetStubs: false,
        sheetRows: 1 // Only read first row for validation
      });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        if (file.path && !file.buffer) {
          try { unlinkSync(file.path); } catch (e) {}
        }
        return res.status(400).json({ error: 'Invalid Excel file: No sheets found' });
      }

      // Quick check for required columns - find actual header row
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const fullRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const maxCols = fullRange.e.c;
      
      // Find the actual header row by searching for expected column names
      let headerRow = [];
      const expectedHeaders = ['CAN', 'LEGALSTATUS', 'ADDRSTRING', 'ZIP', 'ACCOUNT', 'ADDRESS'];
      
      for (let row = 0; row <= Math.min(fullRange.e.r, 20); row++) {
        const testRow = XLSX.utils.sheet_to_json(worksheet, { 
          range: { s: { c: 0, r: row }, e: { c: maxCols, r: row } },
          header: 1,
          defval: null
        })[0] || [];
        
        const rowValues = testRow.map(v => String(v || '').trim().toUpperCase());
        const foundHeaders = expectedHeaders.filter(header => 
          rowValues.some(val => val === header || val.includes(header) || header.includes(val))
        );
        
        if (foundHeaders.length >= 3) {
          headerRow = testRow;
          break;
        }
      }
      
      // Fallback to row 0 if no header found
      if (headerRow.length === 0) {
        headerRow = XLSX.utils.sheet_to_json(worksheet, { 
          range: { s: { c: 0, r: 0 }, e: { c: maxCols, r: 0 } },
          header: 1,
          defval: null
        })[0] || [];
      }

      const findColumnByTitle = (titles, headerRow) => {
        for (let i = 0; i < headerRow.length; i++) {
          const header = String(headerRow[i] || '').trim().toUpperCase();
          for (const title of titles) {
            if (header.includes(title.toUpperCase()) || title.toUpperCase().includes(header)) {
              return i;
            }
          }
        }
        return -1;
      };

      const columnMappings = {
        CAN: findColumnByTitle(['CAN', 'ACCOUNT', 'ACCOUNT NUMBER', 'PARCEL', 'PARCEL NUMBER', 'PROPERTY ID', 'ID'], headerRow),
        ADDRSTRING: findColumnByTitle(['ADDRSTRING', 'ADDRESS', 'STREET', 'STREET ADDRESS', 'ADDR', 'ADDRESS STRING'], headerRow),
        ZIP_CODE: findColumnByTitle(['ZIP CODE', 'ZIP', 'ZIPCODE', 'POSTAL CODE', 'POSTAL', 'ZIP_CODE'], headerRow)
      };

      const requiredColumns = ['CAN', 'ADDRSTRING', 'ZIP_CODE'];
      const missingColumns = requiredColumns.filter(col => columnMappings[col] < 0);
      
      if (missingColumns.length > 0) {
        if (file.path && !file.buffer) {
          try { unlinkSync(file.path); } catch (e) {}
        }
        return res.status(400).json({ 
          error: `Missing required columns: ${missingColumns.join(', ')}. Found headers: ${headerRow.filter(h => h).slice(0, 10).join(', ')}${headerRow.length > 10 ? '...' : ''}` 
        });
      }
    } catch (validationError) {
      if (file.path && !file.buffer) {
        try { unlinkSync(file.path); } catch (e) {}
      }
      console.error('File validation error:', validationError);
      return res.status(400).json({ 
        error: `Invalid Excel file: ${validationError.message || 'Unable to read file. Please ensure it\'s a valid .xlsx or .xls file.'}` 
      });
    }

    // Return immediately - process in background to avoid blocking
    // This makes the API responsive even for large files
    res.json({
      success: true,
      message: 'File upload accepted. Processing in background...',
      filename: file.originalname,
      fileSize: file.size,
      status: 'processing'
    });

    // Process file asynchronously (non-blocking)
    processFileAsync(file, existingPropertiesJson, uploadDate, ip).catch(error => {
      console.error('❌ Background processing error:', error);
      console.error('Error stack:', error.stack);
      // Log detailed error for debugging
      // Frontend will poll and see no properties if processing failed
      // Could store error status in GCS for frontend to check
    });
    
    return; // Exit early - processing continues in background
  } catch (error) {
    // Clean up temp file on error
    if (req.file?.path && !req.file?.buffer) {
      try {
        unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temp file on error:', cleanupError.message);
      }
    }
    console.error('Process file error:', error);
    res.status(500).json({ 
      error: error.message || 'File processing failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Async file processing function (non-blocking)
async function processFileAsync(file, existingPropertiesJson, uploadDate, ip) {
  try {
    console.log(`📊 Starting background processing: ${file.originalname} (${file.size} bytes)`);
    
    // Read file from disk (disk storage) or buffer (memory storage fallback)
    const fileBuffer = file.buffer || readFileSync(file.path);
    
    // Read Excel file with optimized options for large files
    // Use dense mode to reduce memory usage
    const workbook = XLSX.read(fileBuffer, { 
      type: 'buffer', 
      cellDates: false,
      dense: false, // Sparse mode uses less memory
      sheetStubs: false // Don't load empty cells
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the full range of the worksheet
    const fullRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const maxRows = fullRange.e.r;
    const maxCols = fullRange.e.c;
    
    // Find the actual header row by searching for expected column names
    // Look for rows that contain "CAN", "LEGALSTATUS", "ADDRSTRING", etc.
    let headerRowIndex = -1;
    let headerRow = [];
    const expectedHeaders = ['CAN', 'LEGALSTATUS', 'ADDRSTRING', 'ZIP', 'ACCOUNT', 'ADDRESS'];
    
    console.log(`🔍 Searching for header row in ${maxRows + 1} rows...`);
    
    // Search from top to bottom for the row containing expected headers
    for (let row = 0; row <= Math.min(maxRows, 20); row++) { // Check first 20 rows
      const testRow = XLSX.utils.sheet_to_json(worksheet, { 
        range: { s: { c: 0, r: row }, e: { c: maxCols, r: row } },
        header: 1,
        defval: null
      })[0] || [];
      
      // Check if this row contains expected header names
      const rowValues = testRow.map(v => String(v || '').trim().toUpperCase());
      const foundHeaders = expectedHeaders.filter(header => 
        rowValues.some(val => val === header || val.includes(header) || header.includes(val))
      );
      
      // If we find at least 3 expected headers, this is likely the header row
      if (foundHeaders.length >= 3) {
        headerRowIndex = row;
        headerRow = testRow;
        console.log(`✅ Found header row at index ${row} with headers: ${foundHeaders.join(', ')}`);
        break;
      }
    }
    
    // Fallback to row 0 if no header found
    if (headerRowIndex < 0) {
      console.log('⚠️ Header row not found, using row 0 as fallback');
      headerRowIndex = 0;
      headerRow = XLSX.utils.sheet_to_json(worksheet, { 
        range: { s: { c: 0, r: 0 }, e: { c: maxCols, r: 0 } },
        header: 1,
        defval: null
      })[0] || [];
    }
    
    console.log('📋 Header row:', headerRow);
    
    // Map column titles to their positions (flexible matching)
    const findColumnByTitle = (titles, headerRow) => {
      for (let i = 0; i < headerRow.length; i++) {
        const header = String(headerRow[i] || '').trim().toUpperCase();
        for (const title of titles) {
          if (header.includes(title.toUpperCase()) || title.toUpperCase().includes(header)) {
            return i; // Return column index (0-based)
          }
        }
      }
      return -1;
    };
    
    // Define column mappings - flexible title matching
    // These will match columns by their header titles, not position
    const columnMappings = {
      CAN: findColumnByTitle(['CAN', 'ACCOUNT', 'ACCOUNT NUMBER', 'PARCEL', 'PARCEL NUMBER', 'PROPERTY ID', 'ID'], headerRow),
      ADDRSTRING: findColumnByTitle(['ADDRSTRING', 'ADDRESS', 'STREET', 'STREET ADDRESS', 'ADDR', 'ADDRESS STRING'], headerRow),
      ZIP_CODE: findColumnByTitle(['ZIP CODE', 'ZIP', 'ZIPCODE', 'POSTAL CODE', 'POSTAL', 'ZIP_CODE'], headerRow),
      Pnumber: findColumnByTitle(['PNUMBER', 'P NUMBER', 'P_NUMBER', 'PARCEL NUMBER'], headerRow), // Column Q
      PSTRNAME: findColumnByTitle(['PSTRNAME', 'PSTR NAME', 'PSTR_NAME', 'OWNER', 'OWNER NAME'], headerRow), // Column R
      LEGALSTATUS: findColumnByTitle(['LEGALSTATUS', 'LEGAL STATUS', 'LEGAL_STATUS', 'STATUS', 'TAX STATUS'], headerRow), // Column AE
      TOT_PERCAN: findColumnByTitle(['TOT_PERCAN', 'TOT PERCAN', 'TOTAL PERCENT', 'PERCENT', 'TAX PERCENT'], headerRow) // Column BE
    };
    
    // Log all headers and mappings for debugging
    console.log('📋 All column headers:', headerRow.map((h, i) => `${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i/26) : ''}: ${h}`).join(', '));
    console.log('📍 Column mappings found:', columnMappings);
    
    // Get total rows (data rows = total rows - header row)
    const totalRows = maxRows + 1; // Total rows including header
    const dataRows = maxRows - headerRowIndex; // Rows after header
    
    console.log(`📈 Total rows in sheet: ${totalRows}, Header at row ${headerRowIndex}, Data rows: ${dataRows}`);
    
    // Only read the columns we need (much faster for large files)
    const neededColumns = Object.values(columnMappings).filter(idx => idx >= 0);
    const jsonData = [];
    
    // Process in chunks for large files
    const CHUNK_SIZE = 10000; // Process 10,000 rows at a time
    const headerMap = {}; // Map column index to field name
    
    // Build header map and validate required columns
    // Note: This validation is already done before response is sent, but keeping for safety
    const requiredColumns = ['CAN', 'ADDRSTRING', 'ZIP_CODE'];
    const missingColumns = requiredColumns.filter(col => columnMappings[col] < 0);
    
    if (missingColumns.length > 0) {
      // This shouldn't happen since we validate before sending response
      // But if it does, log error and don't save properties
      console.error(`Missing required columns in background processing: ${missingColumns.join(', ')}`);
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Process in chunks - start from the row AFTER the header row
    // Skip first 3 rows after header (they are test rows)
    const dataStartRow = headerRowIndex + 1 + 3;
    console.log(`📊 Starting data processing from row ${dataStartRow + 1} (skipped header row ${headerRowIndex + 1} and 3 test rows)`);
    for (let startRow = dataStartRow; startRow <= maxRows; startRow += CHUNK_SIZE) {
      const endRow = Math.min(startRow + CHUNK_SIZE - 1, maxRows);
      
      // Read only needed columns
      const chunkData = [];
      for (let row = startRow; row <= endRow; row++) {
        const rowData = {};
        Object.entries(columnMappings).forEach(([fieldName, colIndex]) => {
          if (colIndex >= 0) {
            const cellAddress = XLSX.utils.encode_cell({ c: colIndex, r: row });
            const cell = worksheet[cellAddress];
            rowData[fieldName] = cell ? (cell.v !== undefined ? cell.v : null) : null;
          }
        });
        
        // Validate row - filter out header/metadata rows
        const canValue = rowData.CAN ? String(rowData.CAN).trim() : '';
        
        // Skip if CAN is empty
        if (!canValue) continue;
        
        // Skip if CAN looks like a header/metadata row (contains descriptive text, is all caps header name, etc.)
        const canLower = canValue.toLowerCase();
        const isHeaderRow = 
          canValue.length > 50 || // Too long to be a valid ID
          canLower.includes('determines') ||
          canLower.includes('report ordering') ||
          canLower.includes('inside the system') ||
          canLower.includes('rpt_order_seq') ||
          canValue.toUpperCase() === 'RPT_ORDER_SEQ' ||
          canValue.toUpperCase() === 'CAN' ||
          canValue.toUpperCase() === 'ACCOUNT' ||
          canValue.toUpperCase() === 'ACCOUNT NUMBER' ||
          canValue.toUpperCase() === 'PROPERTY ID' ||
          canValue.toUpperCase() === 'ID' ||
          // Check if all values in the row are the same (indicates header row)
          (Object.values(rowData).filter(v => v).length > 0 && 
           new Set(Object.values(rowData).filter(v => v).map(v => String(v).trim())).size === 1);
        
        if (isHeaderRow) {
          console.log(`⚠️ Skipping header/metadata row: CAN="${canValue}"`);
          continue;
        }
        
        // Skip if CAN is not a valid identifier (should be numeric or alphanumeric, not descriptive text)
        // Valid IDs are typically: numbers, alphanumeric codes, or short identifiers
        // Allow numbers, alphanumeric with dashes/underscores, but reject long descriptive text
        const isValidId = (
          /^[0-9]+$/.test(canValue) || // Pure numbers
          (/^[A-Z0-9\-_\.]+$/i.test(canValue) && canValue.length <= 20 && !canLower.includes(' ')) // Alphanumeric without spaces
        );
        
        if (!isValidId) {
          console.log(`⚠️ Skipping invalid ID row: CAN="${canValue}" (not a valid identifier format)`);
          continue;
        }
        
        chunkData.push(rowData);
      }
      
      jsonData.push(...chunkData);
      if (chunkData.length > 0 || startRow === dataStartRow) {
        console.log(`✅ Processed rows ${startRow}-${endRow}: ${chunkData.length} valid rows, ${jsonData.length} total so far`);
      }
    }
    
    console.log(`📊 Row processing summary: ${jsonData.length} rows extracted from ${maxRows - headerRowIndex} data rows`);

    if (jsonData.length === 0) {
      throw new Error('No data found in Excel file after processing. Please check that the file contains valid data rows.');
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
      // Use CAN as primary identifier (from column E)
      if (property.CAN) {
        return String(property.CAN).trim();
      }
      // Fallback to other common identifiers
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
      // First check LEGALSTATUS column (Column AE)
      if (property.LEGALSTATUS) {
        const value = String(property.LEGALSTATUS).trim().toUpperCase();
        // More flexible matching - check for J, A, or P in various formats
        if (value.includes('JUDGMENT') || value.startsWith('J') || value === 'J') return 'J';
        if (value.includes('ACTIVE') || (value.startsWith('A') && value.length <= 10)) return 'A';
        if (value.includes('PENDING') || value.startsWith('P') || value === 'P') return 'P';
        // Check if it's exactly J, A, or P
        if (value === 'J' || value === 'A' || value === 'P') return value;
      }
      // Fallback to other status columns
      const statusKeys = ['Status', 'Judgment Status', 'Tax Status', 'Foreclosure Status', 'status', 'LEGALSTATUS', 'currentStatus'];
      for (const key of statusKeys) {
        if (property[key]) {
          const value = String(property[key]).trim().toUpperCase();
          if (value === 'J' || value === 'A' || value === 'P' || 
              value.includes('JUDGMENT') || value.includes('ACTIVE') || value.includes('PENDING')) {
            if (value.includes('JUDGMENT') || value.startsWith('J')) return 'J';
            if (value.includes('ACTIVE') || value.startsWith('A')) return 'A';
            if (value.includes('PENDING') || value.startsWith('P')) return 'P';
            if (value === 'J' || value === 'A' || value === 'P') return value;
          }
        }
      }
      return null;
    };
    
    // Track status detection for debugging
    let statusCounts = { J: 0, A: 0, P: 0, null: 0 };

    // Process properties and detect status changes
    const processedProperties = [];
    const newStatusChanges = [];
    const processedIds = new Set();

    jsonData.forEach((propData) => {
      const identifier = getPropertyIdentifier(propData);
      if (!identifier) return;

      const newStatus = getPropertyStatus(propData);
      // Track status counts for debugging
      if (newStatus) statusCounts[newStatus]++;
      else statusCounts.null++;
      
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
    
    // IMPORTANT: Replace all properties with new file data, don't merge with old cached data
    // The processedProperties array contains ALL properties from the new file
    // This ensures the new file completely replaces old data, not merges with it
    const finalProperties = processedProperties; // Use only new file's properties
    
    console.log(`✅ Processing complete: ${finalProperties.length} properties from new file, ${newStatusChanges.length} status changes`);
    console.log(`📊 Data processing summary:`);
    console.log(`   - Total rows in sheet: ${totalRows}`);
    console.log(`   - Header row found at index: ${headerRowIndex}`);
    console.log(`   - Data rows processed: ${jsonData.length}`);
    console.log(`   - Valid properties after filtering: ${processedProperties.length}`);
    console.log(`📊 Status detection summary:`);
    console.log(`   - Judgment (J): ${statusCounts.J}`);
    console.log(`   - Active (A): ${statusCounts.A}`);
    console.log(`   - Pending (P): ${statusCounts.P}`);
    console.log(`   - No status (null): ${statusCounts.null}`);
    
    // Log sample LEGALSTATUS values for debugging
    const sampleStatuses = jsonData.slice(0, 20).map(p => p.LEGALSTATUS).filter(s => s);
    if (sampleStatuses.length > 0) {
      console.log(`📋 Sample LEGALSTATUS values: ${[...new Set(sampleStatuses)].slice(0, 10).join(', ')}`);
    }

    // Upload file to GCS
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `files/${timestamp}-${sanitizedFilename}`;
    const fileRef = bucket.file(storagePath);

    // Read file for upload (from disk if using disk storage)
    const fileDataForUpload = file.buffer || readFileSync(file.path);

    await fileRef.save(fileDataForUpload, {
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
    // IMPORTANT: Replace all properties with new file data (don't merge with old cached data)
    const dataPath = 'data/properties.json';
    const dataFileRef = bucket.file(dataPath);
    const propertiesData = {
      properties: finalProperties, // Use only new file's properties
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
      console.log(`✅ Saved ${finalProperties.length} properties to GCS (replaced all old data with new file)`);
    } catch (saveError) {
      console.warn('⚠️ Failed to save properties to GCS (will be saved by frontend):', saveError.message);
      // Continue - frontend will save it
    }

    // Clean up temp file from disk storage
    if (file.path && !file.buffer) {
      try {
        unlinkSync(file.path);
        console.log('✅ Cleaned up temporary file');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temp file:', cleanupError.message);
      }
    }

    console.log(`✅ Background processing complete: ${file.originalname}`);
    console.log(`   - Processed ${finalProperties.length} properties from new file`);
    console.log(`   - Found ${newStatusChanges.length} status changes`);
    console.log(`   - Replaced all old data with new file data`);
    
    // Properties are saved to GCS, frontend can load them via /api/load-properties
  } catch (error) {
    // Clean up temp file on error
    if (file?.path && !file?.buffer) {
      try {
        unlinkSync(file.path);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temp file on error:', cleanupError.message);
      }
    }
    console.error('Background processing error:', error);
    throw error; // Re-throw for caller to handle
  }
}

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

