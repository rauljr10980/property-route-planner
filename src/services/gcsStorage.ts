// Google Cloud Storage service for file uploads/downloads
// Free tier: 5 GB storage, 1 GB downloads/day
// Uses backend API for secure uploads (service account keys stay on server)

export interface FileMetadata {
  filename: string;
  uploadDate: string;
  fileSize: number;
  rowCount: number;
  columns: string[];
  sampleRows: any[];
  storagePath?: string;
  publicUrl?: string;
}

export interface StorageFile {
  name: string;
  url: string;
  size: number;
  timeCreated: string;
  metadata?: any;
}

class GCSStorageService {
  private apiUrl: string;

  constructor() {
    // Use environment variable or default to local dev server
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Upload file to Google Cloud Storage via backend API
   */
  async uploadFile(
    file: File,
    metadata: Omit<FileMetadata, 'filename' | 'uploadDate' | 'fileSize'>
  ): Promise<{ storagePath: string; publicUrl: string; filename: string }> {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        rowCount: metadata.rowCount,
        columns: metadata.columns,
        sampleRows: metadata.sampleRows
      }));

      // Upload via backend API
      const response = await fetch(`${this.apiUrl}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Failed to upload file');
      }

      const result = await response.json();
      return {
        storagePath: result.storagePath,
        publicUrl: result.publicUrl,
        filename: file.name
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Failed to upload file');
    }
  }

  /**
   * Download file from Google Cloud Storage via backend API
   */
  async downloadFile(storagePath: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.apiUrl}/api/download?path=${encodeURIComponent(storagePath)}`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Download error:', error);
      throw new Error(error.message || 'Failed to download file');
    }
  }

  /**
   * List all uploaded files via backend API
   */
  async listFiles(): Promise<StorageFile[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/list`);
      
      if (!response.ok) {
        throw new Error('Failed to list files');
      }

      const files = await response.json();
      return files;
    } catch (error: any) {
      console.error('List files error:', error);
      throw new Error(error.message || 'Failed to list files');
    }
  }

  /**
   * Delete file from Google Cloud Storage via backend API
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: storagePath })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete file' }));
        throw new Error(errorData.error || errorData.message || `Failed to delete file: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      throw new Error(error.message || 'Failed to delete file');
    }
  }

  /**
   * Get file metadata via backend API
   */
  async getFileMetadata(storagePath: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/metadata?path=${encodeURIComponent(storagePath)}`);
      
      if (!response.ok) {
        throw new Error('Failed to get file metadata');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Get metadata error:', error);
      throw new Error(error.message || 'Failed to get file metadata');
    }
  }

  /**
   * Process Excel file server-side (all files for fast and accurate processing)
   * Returns processed properties and status changes
   */
  async processFile(
    file: File,
    existingProperties: any[],
    uploadDate: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<{
    properties?: any[]; // Optional - backend may not return all properties
    newStatusChanges?: any[];
    metadata?: any;
    storage?: { storagePath: string; publicUrl: string };
    propertiesSaved?: boolean; // Flag indicating properties were saved to GCS
    status?: 'processing' | 'complete'; // Background processing status
    message?: string;
    filename?: string;
    fileSize?: number;
  }> {
    try {
      onProgress?.(10, 'Uploading file to server...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('existingProperties', JSON.stringify(existingProperties));
      formData.append('uploadDate', uploadDate);

      onProgress?.(30, 'Processing file on server...');

      const response = await fetch(`${this.apiUrl}/api/process-file`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        throw new Error(errorData.error || errorData.message || 'Failed to process file');
      }

      onProgress?.(90, 'Finalizing...');

      const result = await response.json();

      onProgress?.(100, 'Complete!');

      // Backend now returns only status changes, not all properties
      // Frontend needs to load properties separately if needed
      // This reduces response size from 5MB+ to <100KB
      return result;
    } catch (error: any) {
      console.error('Process file error:', error);
      throw new Error(error.message || 'Failed to process file');
    }
  }

  /**
   * Save properties data to GCS for persistence
   */
  async saveProperties(properties: any[], uploadDate: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/save-properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties, uploadDate })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Save failed' }));
        throw new Error(error.error || error.message || 'Failed to save properties');
      }
    } catch (error: any) {
      console.error('Save properties error:', error);
      throw new Error(error.message || 'Failed to save properties');
    }
  }

  /**
   * Load properties data from GCS
   */
  async loadProperties(): Promise<{ properties: any[]; uploadDate: string | null }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/load-properties`);

      if (!response.ok) {
        throw new Error('Failed to load properties');
      }

      const result = await response.json();
      return {
        properties: result.properties || [],
        uploadDate: result.uploadDate || null
      };
    } catch (error: any) {
      console.error('Load properties error:', error);
      // Return empty on error (will fallback to localStorage)
      return { properties: [], uploadDate: null };
    }
  }

  /**
   * Load comparison report from GCS
   */
  async loadComparisonReport(): Promise<{ report: any; uploadDate: string | null } | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/comparison-report`);

      if (!response.ok) {
        throw new Error('Failed to load comparison report');
      }

      const result = await response.json();
      if (!result.report) {
        return null;
      }

      return {
        report: result.report,
        uploadDate: result.uploadDate || null
      };
    } catch (error: any) {
      console.error('Load comparison report error:', error);
      return null;
    }
  }

  /**
   * Fetch CAD (County Appraisal District) information from Bexar County website
   */
  async fetchCAD(can: string): Promise<{
    success: boolean;
    can: string;
    cad: string | null;
    propertyInfo?: any;
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/fetch-cad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ can })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch CAD' }));
        throw new Error(error.error || error.message || 'Failed to fetch CAD');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Fetch CAD error:', error);
      throw new Error(error.message || 'Failed to fetch CAD');
    }
  }

  /**
   * Batch fetch CAD for multiple properties
   */
  async fetchCADBatch(properties: any[]): Promise<{
    success: boolean;
    total: number;
    successful: number;
    failed: number;
    results: any[];
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/fetch-cad-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch CAD batch' }));
        throw new Error(error.error || error.message || 'Failed to fetch CAD batch');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Fetch CAD batch error:', error);
      throw new Error(error.message || 'Failed to fetch CAD batch');
    }
  }

  /**
   * Reprocess an existing file from GCS (without downloading)
   * Note: existingProperties is no longer sent - backend loads from GCS to avoid 413 errors
   */
  async reprocessFile(
    storagePath: string,
    existingProperties: any[], // Not used anymore - backend loads from GCS
    uploadDate: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<{
    properties?: any[];
    newStatusChanges?: any[];
    status?: 'processing' | 'complete';
    message?: string;
    filename?: string;
  }> {
    try {
      onProgress?.(10, 'Reprocessing file from cloud storage...');

      const response = await fetch(`${this.apiUrl}/api/reprocess-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storagePath,
          // Don't send existingProperties - backend loads from GCS to avoid 413 Payload Too Large
          uploadDate
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        throw new Error(errorData.error || errorData.message || 'Failed to reprocess file');
      }

      onProgress?.(50, 'Processing in background...');

      const result = await response.json();

      // If processing is in background, poll for completion
      if (result.status === 'processing') {
        onProgress?.(70, 'Waiting for processing to complete...');
        // Poll for properties to be ready
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          const loadedData = await this.loadProperties();
          if (loadedData.properties.length > 0) {
            onProgress?.(100, 'Complete!');
            return {
              properties: loadedData.properties,
              status: 'complete',
              filename: result.filename
            };
          }
          attempts++;
        }
      }

      onProgress?.(100, 'Complete!');
      return result;
    } catch (error: any) {
      console.error('Reprocess file error:', error);
      throw new Error(error.message || 'Failed to reprocess file');
    }
  }
}

export default new GCSStorageService();

