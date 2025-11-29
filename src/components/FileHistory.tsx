import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, History, Trash2, Eye, X, Download, Search, Calendar, FileText, CheckCircle, TrendingUp, ChevronDown } from 'lucide-react';
import { Property } from '../utils/fileProcessor';
import { saveSharedProperties, loadSharedProperties, loadSharedPropertiesSync, clearSharedProperties } from '../utils/sharedData';
import gcsStorage from '../services/gcsStorage';

interface FileHistoryEntry {
  id: string;
  filename: string;
  uploadDate: string;
  fileSize: number;
  rowCount: number;
  columns: string[];
  sampleRows: any[];
  fileData?: string; // Base64 encoded file data (for localStorage fallback)
  storagePath?: string; // Google Cloud Storage path
  publicUrl?: string; // Google Cloud Storage public URL
}

export default function FileHistory() {
  const [fileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileHistoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sharedProperties, setSharedProperties] = useState<Property[]>([]);
  const [lastUploadDate, setLastUploadDate] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<{ progress: number; message: string } | null>(null);
  const [comparisonReport, setComparisonReport] = useState<any>(null);
  const [showComparisonReport, setShowComparisonReport] = useState(true); // Default to showing the report
  const [changeFilter, setChangeFilter] = useState<'all' | 'status' | 'totpercan' | 'legalstatus'>('all');
  const [previousStatusFilter, setPreviousStatusFilter] = useState<'all' | 'J' | 'A' | 'P' | 'new'>('all');

  useEffect(() => {
    const initialize = async () => {
      await loadFileHistory();
      await loadSharedData();
      await loadComparisonReport();
    };
    initialize();
    
    // Listen for property updates
    const handlePropertiesUpdated = (event: CustomEvent) => {
      loadSharedData();
      loadComparisonReport();
    };
    
    window.addEventListener('propertiesUpdated', handlePropertiesUpdated as EventListener);
    return () => {
      window.removeEventListener('propertiesUpdated', handlePropertiesUpdated as EventListener);
    };
  }, []);

  const loadComparisonReport = async () => {
    try {
      const result = await gcsStorage.loadComparisonReport();
      if (result) {
        setComparisonReport(result.report);
      }
    } catch (error) {
      console.error('Error loading comparison report:', error);
    }
  };

  const loadSharedData = async () => {
    try {
      // Load from GCS first (persistent), fallback to localStorage
      const { properties, lastUploadDate } = await loadSharedProperties();
      setSharedProperties(properties);
      setLastUploadDate(lastUploadDate);
    } catch (error) {
      console.error('Error loading shared data:', error);
      // Fallback to sync version
      const { properties, lastUploadDate } = loadSharedPropertiesSync();
      setSharedProperties(properties);
      setLastUploadDate(lastUploadDate);
    }
  };

  const loadFileHistory = async () => {
    try {
      // Try to load from Google Cloud Storage first
      try {
        const files = await gcsStorage.listFiles();
        const history: FileHistoryEntry[] = files.map(file => {
          const metadata = file.metadata || {};
          return {
            id: file.name,
            filename: metadata.originalName || file.name,
            uploadDate: metadata.uploadDate || file.timeCreated,
            fileSize: file.size,
            rowCount: parseInt(metadata.rowCount || '0'),
            columns: metadata.columns ? JSON.parse(metadata.columns) : [],
            sampleRows: metadata.sampleRows ? JSON.parse(metadata.sampleRows) : [],
            storagePath: `files/${file.name}`,
            publicUrl: file.url
          };
        });
        setFileHistory(history);
        setLoading(false);
        return;
      } catch (gcsError) {
        console.log('GCS API not available, trying localStorage:', gcsError);
      }

      // Fallback to localStorage
      const savedHistory = localStorage.getItem('property-tax-file-history');
      if (savedHistory) {
        setFileHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading file history:', error);
    }
    setLoading(false);
  };

  const saveFileHistory = (history: FileHistoryEntry[]) => {
    try {
      localStorage.setItem('property-tax-file-history', JSON.stringify(history));
      setFileHistory(history);
    } catch (error) {
      console.warn('Could not save file history to localStorage (files are still saved in cloud):', error);
      // Files are saved in GCS, so localStorage is just for metadata cache
      // Continue without showing an error - the files are safe in the cloud
      setFileHistory(history);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProcessingProgress({ progress: 0, message: 'Starting...' });

    try {
      const uploadDate = new Date().toISOString();
      
      // Load existing properties (sync for immediate use)
      const { properties: existingProperties } = loadSharedPropertiesSync();

      // Always use server-side processing for all files (faster and more accurate)
      setProcessingProgress({ progress: 5, message: 'Uploading file to server for processing...' });
      
      const result = await gcsStorage.processFile(
        file,
        existingProperties,
        uploadDate,
        (progress, message) => {
          setProcessingProgress({ progress, message });
        }
      );

      // Check if processing is happening in background
      if (result.status === 'processing') {
        setProcessingProgress({ progress: 50, message: 'File uploaded. Processing in background...' });
        
        // Poll for completion (check every 2 seconds, max 30 times = 1 minute)
        let pollCount = 0;
        const maxPolls = 30;
        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const loadedData = await gcsStorage.loadProperties();
            if (loadedData.properties && loadedData.properties.length > 0) {
              clearInterval(pollInterval);
              setProcessingProgress({ progress: 100, message: 'Processing complete!' });
              
              // Load the processed data
              const mergedProperties = loadedData.properties || [];
              await saveSharedProperties(mergedProperties, uploadDate);
              
              // Trigger properties update event
              window.dispatchEvent(new CustomEvent('propertiesUpdated', { 
                detail: { properties: mergedProperties } 
              }));
              
              // Show success
              alert(`File processed successfully! ${mergedProperties.length} properties loaded.`);
              setProcessingProgress(null);
            } else if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              setProcessingProgress({ progress: 100, message: 'Processing may still be in progress. Please refresh in a moment.' });
              alert('File is being processed. Please wait a moment and refresh the page.');
            }
          } catch (error) {
            if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              setProcessingProgress(null);
              console.warn('Processing still in progress or failed:', error);
            }
          }
        }, 2000);
        
        return; // Exit early, polling will handle the rest
      }

      // Backend now returns only status changes, not all properties (performance optimization)
      const newStatusChanges = result.newStatusChanges || [];
      const rowCount = result.metadata?.rowCount || result.metadata?.propertiesCount || 0;
      const columns = result.metadata?.columns || [];
      const sampleRows = result.metadata?.sampleRows || [];
      const storagePath = result.storage?.storagePath;
      const publicUrl = result.storage?.publicUrl;

      setProcessingProgress({ progress: 95, message: 'Loading processed properties...' });

      // Backend saved properties to GCS, now load them
      // This separates upload (fast) from data loading (can be done async)
      let mergedProperties = [];
      if (result.propertiesSaved) {
        try {
          const loadedData = await gcsStorage.loadProperties();
          mergedProperties = loadedData.properties || [];
        } catch (loadError) {
          console.warn('Failed to load properties after processing:', loadError);
          // If load fails, properties are still in GCS, frontend can load later
        }
      } else if (result.properties) {
        // Fallback: if backend still returns properties (backward compatibility)
        mergedProperties = result.properties;
      }

      setProcessingProgress({ progress: 98, message: 'Saving to local cache...' });

      // Save merged properties to shared storage (saves to both localStorage and GCS)
      if (mergedProperties.length > 0) {
        await saveSharedProperties(mergedProperties, uploadDate);
      }

      // Load comparison report after processing
      await loadComparisonReport();

      // Convert file to base64 for storage in history (fallback)
      const fileData = await fileToBase64(file);

      const entry: FileHistoryEntry = {
        id: uploadDate,
        filename: file.name,
        uploadDate,
        fileSize: file.size,
        rowCount,
        columns,
        sampleRows,
        fileData: await fileToBase64(file), // Keep for fallback
        storagePath,
        publicUrl
      };

      const updatedHistory = [entry, ...fileHistory];
      saveFileHistory(updatedHistory);
      
      setProcessingProgress(null);
      
      // Show status change summary
      if (newStatusChanges.length > 0) {
        const statusSummary = newStatusChanges.reduce((acc, change) => {
          if (change.newStatus) {
            acc[change.newStatus] = (acc[change.newStatus] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const summaryText = Object.entries(statusSummary)
          .map(([status, count]) => `${count} properties with ${status} status`)
          .join(', ');
        
        alert(`File "${file.name}" processed successfully!\n\n${mergedProperties.length} total properties\n${newStatusChanges.length} status changes detected:\n${summaryText}\n\nCheck the File Comparison Report above to see all changes (new, removed, and status changes).`);
      } else {
        alert(`File "${file.name}" processed successfully!\n\n${mergedProperties.length} total properties\nNo status changes detected.\n\nCheck the File Comparison Report above to see all changes.`);
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      setProcessingProgress(null);
      
      // Provide more specific error messages
      let errorMessage = 'Error processing file';
      if (error.message) {
        if (error.message.includes('Missing required columns')) {
          errorMessage = `File format error: ${error.message}\n\nRequired columns: CAN (or Account Number), ADDRSTRING (or Address), ZIP_CODE (or Zip Code)`;
        } else if (error.message.includes('File size exceeds')) {
          errorMessage = error.message;
        } else if (error.message.includes('quota exceeded')) {
          errorMessage = error.message;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Network error: Could not connect to server. Please check your internet connection and try again.';
        } else if (error.message.includes('Invalid Excel file')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      } else {
        errorMessage = 'Please ensure it\'s a valid Excel file (.xlsx or .xls format).';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const downloadFile = async (entry: FileHistoryEntry) => {
    try {
      let blob: Blob;
      
      if (entry.storagePath) {
        // Download from Google Cloud Storage
        blob = await gcsStorage.downloadFile(entry.storagePath);
      } else if (entry.fileData) {
        // Fallback to base64 from localStorage
        const response = await fetch(entry.fileData);
        blob = await response.blob();
      } else {
        alert('File data not available for download');
        return;
      }

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = entry.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      alert(`Failed to download file: ${error.message || 'Unknown error'}`);
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file from history?')) {
      return;
    }

    try {
      const entry = fileHistory.find(e => e.id === id);
      if (entry?.storagePath) {
        // Delete from Google Cloud Storage
        await gcsStorage.deleteFile(entry.storagePath);
      }
      
      const updatedHistory = fileHistory.filter(entry => entry.id !== id);
      setFileHistory(updatedHistory);
      saveFileHistory(updatedHistory);
      alert('File deleted from history');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      alert(`Failed to delete file: ${error.message || 'Unknown error'}`);
    }
  };

  const loadFileFromHistory = async (entry: FileHistoryEntry) => {
    setLoading(true);
    setProcessingProgress({ progress: 0, message: 'Loading file...' });
    try {
      let file: File;
      
      setProcessingProgress({ progress: 20, message: 'Downloading file...' });
      
      if (entry.storagePath) {
        // Download from Google Cloud Storage
        const blob = await gcsStorage.downloadFile(entry.storagePath);
        file = new File([blob], entry.filename, { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
      } else if (entry.fileData) {
        // Fallback to base64 from localStorage
        const response = await fetch(entry.fileData);
        const blob = await response.blob();
        file = new File([blob], entry.filename, { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
      } else {
        alert('File data not available');
        setLoading(false);
        setProcessingProgress(null);
        return;
      }

      // Load existing properties (sync for immediate use)
      const { properties: existingProperties } = loadSharedPropertiesSync();

      // Process using server-side processing (same as new uploads)
      setProcessingProgress({ progress: 30, message: 'Processing file on server...' });
      
      const result = await gcsStorage.processFile(
        file,
        existingProperties,
        entry.uploadDate,
        (progress, message) => {
          setProcessingProgress({ progress, message });
        }
      );

      const mergedProperties = result.properties;
      const newStatusChanges = result.newStatusChanges;

      // Save merged properties to shared storage (saves to both localStorage and GCS)
      await saveSharedProperties(mergedProperties, entry.uploadDate);

      setProcessingProgress(null);

      // Show status change summary
      if (newStatusChanges.length > 0) {
        alert(`File "${entry.filename}" reloaded and processed!\n\n${mergedProperties.length} total properties\n${newStatusChanges.length} status changes detected.`);
      } else {
        alert(`File "${entry.filename}" reloaded and processed!\n\n${mergedProperties.length} total properties`);
      }
    } catch (error: any) {
      console.error('Error loading file:', error);
      setProcessingProgress(null);
      alert(`Failed to load file: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleClearAllData = async () => {
    if (!confirm('Are you sure you want to clear all cached data? This will remove all properties from browser storage (IndexedDB and localStorage). Files in cloud storage will remain.')) {
      return;
    }

    try {
      await clearSharedProperties();
      setSharedProperties([]);
      setLastUploadDate(null);
      alert('All cached data cleared successfully!');
      
      // Trigger properties update event
      window.dispatchEvent(new CustomEvent('propertiesUpdated', { 
        detail: { properties: [] } 
      }));
    } catch (error: any) {
      console.error('Error clearing data:', error);
      alert(`Failed to clear data: ${error.message || 'Unknown error'}`);
    }
  };

  const getFilteredFiles = (): FileHistoryEntry[] => {
    if (!searchTerm) return fileHistory;
    return fileHistory.filter(entry => 
      entry.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.columns.some(col => col.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  const filteredFiles = getFilteredFiles();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <History className="text-blue-600" size={32} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">File Upload & Processing</h2>
                <p className="text-sm text-gray-600 mt-1">Upload files here to merge and track status changes across all tabs</p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              <button
                onClick={handleClearAllData}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold shadow-md"
                title="Clear all cached data from browser storage"
              >
                <Trash2 size={18} />
                Clear Cache
              </button>
              <label className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition font-semibold shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload size={20} />
                {loading ? 'Processing...' : 'Upload & Process File'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Processing Progress */}
          {processingProgress && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-900">{processingProgress.message}</span>
                <span className="text-sm font-bold text-blue-700">{processingProgress.progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress.progress}%` }}
                />
              </div>
              {processingProgress.progress > 30 && processingProgress.progress < 100 && (
                <p className="text-xs text-blue-600 mt-2">
                  Processing on server for fast and accurate results...
                </p>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-blue-600 font-semibold text-sm">Total Files</div>
              <div className="text-3xl font-bold text-blue-900">{fileHistory.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-green-600 font-semibold text-sm">Total Properties</div>
              <div className="text-3xl font-bold text-green-900">
                {sharedProperties.length.toLocaleString()}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-orange-600 font-semibold text-sm">Last Upload</div>
              <div className="text-sm font-bold text-orange-900">
                {lastUploadDate 
                  ? new Date(lastUploadDate).toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-purple-600 font-semibold text-sm">Total Storage</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatFileSize(fileHistory.reduce((sum, file) => sum + file.fileSize, 0))}
              </div>
            </div>
          </div>
          </div>

          {/* Comparison Report */}
          {comparisonReport && (
            <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-purple-600" size={24} />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">File Comparison Report</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Changes detected between previous file and latest upload
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowComparisonReport(!showComparisonReport)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  {showComparisonReport ? 'Hide' : 'Show'} Report
                </button>
              </div>

              {showComparisonReport && (
                <div className="space-y-4">
                  {/* Summary Message */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-sm text-gray-800">
                      <strong>I've noticed that there are:</strong>
                      <br />
                      • <strong>{comparisonReport.summary?.statusChangesCount || 0}</strong> properties with status changes (J/A/P)
                      {comparisonReport.summary?.totPercanChangesCount !== undefined && (
                        <> • <strong>{comparisonReport.summary.totPercanChangesCount || 0}</strong> properties with TOT_PERCAN changes</>
                      )}
                      {comparisonReport.summary?.legalStatusChangesCount !== undefined && (
                        <> • <strong>{comparisonReport.summary.legalStatusChangesCount || 0}</strong> properties with LEGALSTATUS field changes</>
                      )}
                      {comparisonReport.summary?.foreclosedPropertiesCount > 0 && (
                        <> • <strong className="text-red-700">{comparisonReport.summary.foreclosedPropertiesCount}</strong> <span className="text-red-700 font-semibold">DEAD LEADS</span> (were Judgment, now foreclosed/new owner)</>
                      )}
                      {(!comparisonReport.summary || 
                        (comparisonReport.summary.statusChangesCount === 0 && 
                         (comparisonReport.summary.totPercanChangesCount || 0) === 0 && 
                         (comparisonReport.summary.legalStatusChangesCount || 0) === 0)) && (
                        <span className="text-gray-500 italic"> (No changes detected in this upload)</span>
                      )}
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-green-300">
                      <div className="text-green-600 font-semibold text-sm">New Properties</div>
                      <div className="text-2xl font-bold text-green-900">
                        {comparisonReport.summary.newPropertiesCount}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-red-300">
                      <div className="text-red-600 font-semibold text-sm">Removed</div>
                      <div className="text-2xl font-bold text-red-900">
                        {comparisonReport.summary.removedPropertiesCount}
                      </div>
                      {comparisonReport.summary.foreclosedPropertiesCount > 0 && (
                        <div className="text-xs text-red-700 mt-1 font-semibold">
                          {comparisonReport.summary.foreclosedPropertiesCount} Dead Leads (Were Judgment)
                        </div>
                      )}
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
                      <div className="text-blue-600 font-semibold text-sm">Status Changes</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {comparisonReport.summary.statusChangesCount}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-orange-300">
                      <div className="text-orange-600 font-semibold text-sm">TOT_PERCAN Changes</div>
                      <div className="text-2xl font-bold text-orange-900">
                        {comparisonReport.summary?.totPercanChangesCount || 0}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
                      <div className="text-purple-600 font-semibold text-sm">LEGALSTATUS Changes</div>
                      <div className="text-2xl font-bold text-purple-900">
                        {comparisonReport.summary?.legalStatusChangesCount || 0}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-300">
                      <div className="text-gray-600 font-semibold text-sm">Total Properties</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {comparisonReport.summary.totalPropertiesInNewFile.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Filter Buttons */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                      <h4 className="font-bold text-gray-800">Filter by Change Type</h4>
                      {/* Previous Status Dropdown - Only show for status changes */}
                      {(changeFilter === 'all' || changeFilter === 'status') && (
                        <div className="relative flex items-center gap-2">
                          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Previous Status:</label>
                          <select
                            value={previousStatusFilter}
                            onChange={(e) => setPreviousStatusFilter(e.target.value as 'all' | 'J' | 'A' | 'P' | 'new')}
                            className="px-4 py-2 rounded-md text-sm font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer pr-8 min-w-[180px]"
                          >
                            <option value="all">All Properties</option>
                            <option value="J">Judgment (J)</option>
                            <option value="A">Active (A)</option>
                            <option value="P">Pending (P)</option>
                            <option value="new">New (No Previous Status)</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        onClick={() => setChangeFilter('all')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                          changeFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        All Changes ({comparisonReport.summary.statusChangesCount + (comparisonReport.summary.totPercanChangesCount || 0) + (comparisonReport.summary.legalStatusChangesCount || 0)})
                      </button>
                      <button
                        onClick={() => setChangeFilter('status')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                          changeFilter === 'status'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        Status Changes ({comparisonReport.summary.statusChangesCount})
                      </button>
                      <button
                        onClick={() => setChangeFilter('totpercan')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                          changeFilter === 'totpercan'
                            ? 'bg-orange-600 text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        TOT_PERCAN Changes ({comparisonReport.summary?.totPercanChangesCount || 0})
                      </button>
                      <button
                        onClick={() => setChangeFilter('legalstatus')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                          changeFilter === 'legalstatus'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        LEGALSTATUS Changes ({comparisonReport.summary?.legalStatusChangesCount || 0})
                      </button>
                    </div>
                  </div>

                  {/* Status Change Breakdown */}
                  {comparisonReport.statusChanges && comparisonReport.statusChanges.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h4 className="font-bold text-gray-800 mb-3">Status Change Breakdown</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {['P→A', 'P→J', 'A→J', 'A→P', 'J→A', 'J→P', 'NEW→J', 'NEW→A', 'NEW→P'].map(changeType => {
                          const count = comparisonReport.statusChanges.filter((sc: any) => sc.changeType === changeType).length;
                          if (count === 0) return null;
                          return (
                            <div key={changeType} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="font-semibold text-gray-700">{changeType}:</span>
                              <span className="font-bold text-gray-900">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sample Changes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* New Properties Sample */}
                    {comparisonReport.newProperties && comparisonReport.newProperties.length > 0 && (
                      <div className="bg-white rounded-lg border border-green-300 p-4">
                        <h4 className="font-bold text-green-800 mb-2">New Properties (Sample)</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {comparisonReport.newProperties.slice(0, 5).map((np: any, idx: number) => (
                            <div key={idx} className="text-xs p-2 bg-green-50 rounded">
                              <div className="font-semibold">CAN: {np.CAN || np.identifier}</div>
                              <div className="text-gray-600 truncate">{np.address}</div>
                              {np.status && (
                                <div className="text-green-700 font-semibold">Status: {np.status}</div>
                              )}
                            </div>
                          ))}
                          {comparisonReport.newProperties.length > 5 && (
                            <div className="text-xs text-gray-500 italic">
                              +{comparisonReport.newProperties.length - 5} more...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dead Leads (Foreclosed Properties) - Priority Section */}
                    {comparisonReport.foreclosedProperties && comparisonReport.foreclosedProperties.length > 0 && (
                      <div className="bg-red-100 rounded-lg border-2 border-red-500 p-4 col-span-full">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="text-red-700" size={20} />
                          <h4 className="font-bold text-red-900 text-lg">⚠️ DEAD LEADS - Foreclosed/New Owner ({comparisonReport.foreclosedProperties.length})</h4>
                        </div>
                        <p className="text-sm text-red-800 mb-3 font-semibold">
                          These properties were previously Judgment (J) and are no longer in the file. They have been foreclosed or have a new owner - these leads are no longer valid.
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {comparisonReport.foreclosedProperties.map((fp: any, idx: number) => (
                            <div key={idx} className="text-xs p-3 bg-white border-2 border-red-300 rounded">
                              <div className="font-semibold text-red-900">CAN: {fp.CAN || fp.identifier}</div>
                              <div className="text-gray-700 truncate">{fp.address}</div>
                              <div className="text-red-700 font-semibold mt-1">{fp.reason || 'Foreclosed or New Owner - Lead No Longer Valid'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Removed Properties Sample */}
                    {comparisonReport.removedProperties && comparisonReport.removedProperties.length > 0 && (
                      <div className="bg-white rounded-lg border border-red-300 p-4">
                        <h4 className="font-bold text-red-800 mb-2">Removed Properties (Sample)</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {comparisonReport.removedProperties
                            .filter((rp: any) => !rp.isForeclosed) // Exclude foreclosed (already shown above)
                            .slice(0, 5)
                            .map((rp: any, idx: number) => (
                            <div key={idx} className="text-xs p-2 bg-red-50 rounded">
                              <div className="font-semibold">CAN: {rp.CAN || rp.identifier}</div>
                              <div className="text-gray-600 truncate">{rp.address}</div>
                              {rp.previousStatus && (
                                <div className="text-red-700 font-semibold">Was: {rp.previousStatus}</div>
                              )}
                            </div>
                          ))}
                          {comparisonReport.removedProperties.filter((rp: any) => !rp.isForeclosed).length > 5 && (
                            <div className="text-xs text-gray-500 italic">
                              +{comparisonReport.removedProperties.filter((rp: any) => !rp.isForeclosed).length - 5} more...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Changes Table - Filtered by Change Type */}
                    {((changeFilter === 'all' || changeFilter === 'status') && comparisonReport.statusChanges) ||
                     (changeFilter === 'totpercan' && comparisonReport.totPercanChanges) ||
                     (changeFilter === 'legalstatus' && comparisonReport.legalStatusChanges) ? (
                      <div className="bg-white rounded-lg border border-blue-300 p-4 col-span-full">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-blue-800">
                            {changeFilter === 'status' && `Status Changes (${comparisonReport.statusChanges.length})`}
                            {changeFilter === 'totpercan' && `TOT_PERCAN Changes (${comparisonReport.totPercanChanges.length})`}
                            {changeFilter === 'legalstatus' && `LEGALSTATUS Changes (${comparisonReport.legalStatusChanges.length})`}
                            {changeFilter === 'all' && `All Changes (${comparisonReport.statusChanges.length + (comparisonReport.totPercanChanges?.length || 0) + (comparisonReport.legalStatusChanges?.length || 0)})`}
                          </h4>
                          <p className="text-xs text-gray-500">
                            💡 Tip: Go to Dashboard tab to see full property details
                          </p>
                        </div>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-blue-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">CAN</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Address</th>
                                {changeFilter === 'status' || changeFilter === 'all' ? (
                                  <>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Previous Status</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">New Status</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Change Type</th>
                                  </>
                                ) : null}
                                {changeFilter === 'totpercan' ? (
                                  <>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Old TOT_PERCAN</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">New TOT_PERCAN</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Change Amount</th>
                                  </>
                                ) : null}
                                {changeFilter === 'legalstatus' ? (
                                  <>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Old LEGALSTATUS</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">New LEGALSTATUS</th>
                                  </>
                                ) : null}
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Summary</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {/* Status Changes */}
                              {(changeFilter === 'all' || changeFilter === 'status') && comparisonReport.statusChanges && comparisonReport.statusChanges.length > 0 && comparisonReport.statusChanges
                                .filter((sc: any) => {
                                  if (previousStatusFilter === 'all') return true;
                                  if (previousStatusFilter === 'new') return sc.oldStatus === null;
                                  return sc.oldStatus === previousStatusFilter;
                                })
                                .map((sc: any, idx: number) => (
                                <tr key={`status-${idx}`} className="hover:bg-blue-50">
                                  <td className="px-3 py-2 text-xs font-mono text-gray-900">
                                    {sc.CAN || sc.identifier}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={sc.address}>
                                    {sc.address}
                                  </td>
                                  <td className="px-3 py-2">
                                    {sc.oldStatus ? (
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        sc.oldStatus === 'J' ? 'bg-red-100 text-red-800' :
                                        sc.oldStatus === 'A' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {sc.oldStatus === 'J' ? 'Judgment (J)' :
                                         sc.oldStatus === 'A' ? 'Active (A)' :
                                         'Pending (P)'}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">NEW</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      sc.newStatus === 'J' ? 'bg-red-100 text-red-800' :
                                      sc.newStatus === 'A' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {sc.newStatus === 'J' ? 'Judgment (J)' :
                                       sc.newStatus === 'A' ? 'Active (A)' :
                                       'Pending (P)'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="text-xs font-semibold text-blue-700">
                                      {sc.changeType}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600 italic">
                                    Status changed from {sc.oldStatus || 'NEW'} to {sc.newStatus}
                                  </td>
                                </tr>
                              ))}
                              
                              {/* TOT_PERCAN Changes */}
                              {changeFilter === 'totpercan' && comparisonReport.totPercanChanges && comparisonReport.totPercanChanges.length > 0 && comparisonReport.totPercanChanges.map((tp: any, idx: number) => (
                                <tr key={`totpercan-${idx}`} className="hover:bg-orange-50">
                                  <td className="px-3 py-2 text-xs font-mono text-gray-900">
                                    {tp.CAN || tp.identifier}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={tp.address}>
                                    {tp.address}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-700">
                                    {tp.oldTotPercan !== null ? parseFloat(String(tp.oldTotPercan)).toFixed(2) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-700">
                                    {tp.newTotPercan !== null ? parseFloat(String(tp.newTotPercan)).toFixed(2) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2">
                                    {tp.changeAmount && (
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        parseFloat(tp.changeAmount) > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                      }`}>
                                        {parseFloat(tp.changeAmount) > 0 ? '+' : ''}{tp.changeAmount}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600 italic">
                                    TOT_PERCAN changed from {tp.oldTotPercan !== null ? parseFloat(String(tp.oldTotPercan)).toFixed(2) : 'N/A'} to {tp.newTotPercan !== null ? parseFloat(String(tp.newTotPercan)).toFixed(2) : 'N/A'}
                                  </td>
                                </tr>
                              ))}
                              
                              {/* LEGALSTATUS Changes */}
                              {changeFilter === 'legalstatus' && comparisonReport.legalStatusChanges && comparisonReport.legalStatusChanges.length > 0 && comparisonReport.legalStatusChanges.map((ls: any, idx: number) => (
                                <tr key={`legalstatus-${idx}`} className="hover:bg-purple-50">
                                  <td className="px-3 py-2 text-xs font-mono text-gray-900">
                                    {ls.CAN || ls.identifier}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={ls.address}>
                                    {ls.address}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-700">
                                    {ls.oldLegalStatus || 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-700">
                                    {ls.newLegalStatus || 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600 italic">
                                    LEGALSTATUS changed from "{ls.oldLegalStatus || 'N/A'}" to "{ls.newLegalStatus || 'N/A'}"
                                  </td>
                                </tr>
                              ))}
                              
                              {/* All Changes Combined */}
                              {changeFilter === 'all' && (
                                <>
                                  {comparisonReport.totPercanChanges && comparisonReport.totPercanChanges.length > 0 && comparisonReport.totPercanChanges.map((tp: any, idx: number) => (
                                    <tr key={`all-totpercan-${idx}`} className="hover:bg-orange-50">
                                      <td className="px-3 py-2 text-xs font-mono text-gray-900">
                                        {tp.CAN || tp.identifier}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={tp.address}>
                                        {tp.address}
                                      </td>
                                      <td colSpan={3} className="px-3 py-2 text-xs text-gray-500 italic">
                                        TOT_PERCAN Change
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600 italic">
                                        TOT_PERCAN: {tp.oldTotPercan !== null ? parseFloat(String(tp.oldTotPercan)).toFixed(2) : 'N/A'} → {tp.newTotPercan !== null ? parseFloat(String(tp.newTotPercan)).toFixed(2) : 'N/A'}
                                      </td>
                                    </tr>
                                  ))}
                                  {comparisonReport.legalStatusChanges && comparisonReport.legalStatusChanges.length > 0 && comparisonReport.legalStatusChanges.map((ls: any, idx: number) => (
                                    <tr key={`all-legalstatus-${idx}`} className="hover:bg-purple-50">
                                      <td className="px-3 py-2 text-xs font-mono text-gray-900">
                                        {ls.CAN || ls.identifier}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={ls.address}>
                                        {ls.address}
                                      </td>
                                      <td colSpan={3} className="px-3 py-2 text-xs text-gray-500 italic">
                                        LEGALSTATUS Change
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600 italic">
                                        LEGALSTATUS: "{ls.oldLegalStatus || 'N/A'}" → "{ls.newLegalStatus || 'N/A'}"
                                      </td>
                                    </tr>
                                  ))}
                                </>
                              )}
                              
                              {/* No Changes Message */}
                              {((changeFilter === 'all' || changeFilter === 'status') && (!comparisonReport.statusChanges || comparisonReport.statusChanges.length === 0)) ||
                               (changeFilter === 'totpercan' && (!comparisonReport.totPercanChanges || comparisonReport.totPercanChanges.length === 0)) ||
                               (changeFilter === 'legalstatus' && (!comparisonReport.legalStatusChanges || comparisonReport.legalStatusChanges.length === 0)) ? (
                                <tr>
                                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500 italic">
                                    No {changeFilter === 'status' ? 'status' : changeFilter === 'totpercan' ? 'TOT_PERCAN' : changeFilter === 'legalstatus' ? 'LEGALSTATUS' : ''} changes detected in this upload.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-gray-300 p-8 col-span-full text-center">
                        <p className="text-gray-500 italic">No comparison data available. Upload a file to generate a comparison report.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File List */}
        {filteredFiles.length > 0 ? (
          <div className="space-y-4">
            {filteredFiles.map((file) => (
              <div key={file.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <FileText className="text-blue-600" size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{file.filename}</h3>
                      <div className="flex gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(file.uploadDate).toLocaleString()}
                        </div>
                        <div>
                          {file.rowCount.toLocaleString()} properties
                        </div>
                        <div>
                          {formatFileSize(file.fileSize)}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {file.columns.slice(0, 5).map((col, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {col}
                          </span>
                        ))}
                        {file.columns.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            +{file.columns.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedFile(file)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      title="Preview"
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      onClick={() => downloadFile(file)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      title="Download"
                    >
                      <Download size={16} />
                      Download
                    </button>
                    <button
                      onClick={() => loadFileFromHistory(file)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                      title="Load & Process"
                    >
                      <Upload size={16} />
                      Load
                    </button>
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <History className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchTerm ? 'No files found' : 'No Upload History'}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try a different search term' : 'Upload your first Excel file to see it here'}
            </p>
          </div>
        )}

        {/* File Preview Modal */}
        {selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedFile.filename}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Uploaded: {new Date(selectedFile.uploadDate).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-600 font-semibold text-sm">Total Rows</div>
                    <div className="text-2xl font-bold text-blue-900">{selectedFile.rowCount.toLocaleString()}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-green-600 font-semibold text-sm">Columns</div>
                    <div className="text-2xl font-bold text-green-900">{selectedFile.columns.length}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-600 font-semibold text-sm">File Size</div>
                    <div className="text-2xl font-bold text-purple-900">{formatFileSize(selectedFile.fileSize)}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Column Names</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedFile.columns.map((col, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg font-medium">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Sample Data (First 5 Rows)</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          {selectedFile.columns.map((col, idx) => (
                            <th key={idx} className="px-4 py-2 text-left font-semibold text-gray-700 border-b">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFile.sampleRows.map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            {selectedFile.columns.map((col, colIdx) => (
                              <td key={colIdx} className="px-4 py-2 text-gray-900">
                                {String(row[col] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => downloadFile(selectedFile)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Download size={18} />
                    Download File
                  </button>
                  <button
                    onClick={() => {
                      loadFileFromHistory(selectedFile);
                      setSelectedFile(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    <Upload size={18} />
                    Load & Process
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

