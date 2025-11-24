// Storage service for Google Cloud Storage via backend API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-api-url.vercel.app/api';

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

export interface UploadResponse {
  success: boolean;
  filePath: string;
  publicUrl: string;
  filename: string;
}

class StorageService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  /**
   * Upload file to Google Cloud Storage
   */
  async uploadFile(
    file: File,
    metadata: Omit<FileMetadata, 'filename' | 'uploadDate' | 'fileSize'>
  ): Promise<UploadResponse> {
    try {
      // Convert file to base64
      const fileData = await this.fileToBase64(file);

      const response = await fetch(`${this.apiUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          fileData,
          metadata: {
            rowCount: metadata.rowCount,
            columns: metadata.columns,
            sampleRows: metadata.sampleRows,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result: UploadResponse = await response.json();
      return result;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Failed to upload file');
    }
  }

  /**
   * Download file from Google Cloud Storage
   */
  async downloadFile(filePath: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.apiUrl}/upload?filename=${encodeURIComponent(filePath)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the public URL and fetch the file
      const fileInfo = await response.json();
      const fileResponse = await fetch(fileInfo.publicUrl);

      if (!fileResponse.ok) {
        throw new Error('Failed to download file');
      }

      return await fileResponse.blob();
    } catch (error: any) {
      console.error('Download error:', error);
      throw new Error(error.message || 'Failed to download file');
    }
  }

  /**
   * List all uploaded files
   */
  async listFiles(): Promise<Array<{
    name: string;
    size: number;
    timeCreated: string;
    contentType: string;
    publicUrl: string;
    metadata: any;
  }>> {
    try {
      const response = await fetch(`${this.apiUrl}/upload`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to list files');
      }

      const result = await response.json();
      return result.files || [];
    } catch (error: any) {
      console.error('List files error:', error);
      throw new Error(error.message || 'Failed to list files');
    }
  }

  /**
   * Delete file from Google Cloud Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/upload`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: filePath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      throw new Error(error.message || 'Failed to delete file');
    }
  }

  /**
   * Convert File to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Convert base64 to File object
   */
  base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const bstr = atob(arr[1] || arr[0]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }
}

export default new StorageService();

