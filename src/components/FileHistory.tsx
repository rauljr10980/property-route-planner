import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, History, Trash2, Eye, X, Download, Search, Calendar, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileHistoryEntry {
  id: string;
  filename: string;
  uploadDate: string;
  fileSize: number;
  rowCount: number;
  columns: string[];
  sampleRows: any[];
  fileData?: string; // Base64 encoded file data
}

export default function FileHistory() {
  const [fileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileHistoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFileHistory();
  }, []);

  const loadFileHistory = () => {
    try {
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
      console.error('Error saving file history:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please delete some files to free up space.');
      } else {
        alert('Failed to save file history. Storage might be full.');
      }
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

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert('No data found in the Excel file');
        return;
      }

      const fileSize = file.size;
      const rowCount = jsonData.length;
      const columns = Object.keys(jsonData[0] || {});
      const sampleRows = jsonData.slice(0, 5);

      // Convert file to base64 for storage
      const fileData = await fileToBase64(file);

      const entry: FileHistoryEntry = {
        id: new Date().toISOString(),
        filename: file.name,
        uploadDate: new Date().toISOString(),
        fileSize,
        rowCount,
        columns,
        sampleRows,
        fileData
      };

      const updatedHistory = [entry, ...fileHistory];
      saveFileHistory(updatedHistory);
      
      alert(`File "${file.name}" added to history!`);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please ensure it\'s a valid Excel file.');
    } finally {
      e.target.value = '';
    }
  };

  const downloadFile = (entry: FileHistoryEntry) => {
    if (!entry.fileData) {
      alert('File data not available for download');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = entry.fileData;
      link.download = entry.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const deleteFile = (id: string) => {
    if (!confirm('Are you sure you want to delete this file from history?')) {
      return;
    }

    const updatedHistory = fileHistory.filter(entry => entry.id !== id);
    saveFileHistory(updatedHistory);
    alert('File deleted from history');
  };

  const loadFileFromHistory = async (entry: FileHistoryEntry) => {
    if (!entry.fileData) {
      alert('File data not available');
      return;
    }

    try {
      // Convert base64 back to file
      const response = await fetch(entry.fileData);
      const blob = await response.blob();
      const file = new File([blob], entry.filename, { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Trigger a custom event that other components can listen to
      const event = new CustomEvent('loadFileFromHistory', { 
        detail: { file, entry } 
      });
      window.dispatchEvent(event);

      alert(`File "${entry.filename}" loaded! The file will be processed in the appropriate tab.`);
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Failed to load file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
              <h2 className="text-2xl font-bold text-gray-900">File Upload History</h2>
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
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
                <Upload size={20} />
                Upload New File
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-blue-600 font-semibold text-sm">Total Files</div>
              <div className="text-3xl font-bold text-blue-900">{fileHistory.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-green-600 font-semibold text-sm">Total Rows</div>
              <div className="text-3xl font-bold text-green-900">
                {fileHistory.reduce((sum, file) => sum + file.rowCount, 0).toLocaleString()}
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

