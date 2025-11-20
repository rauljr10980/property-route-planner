import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, TrendingUp, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Property {
  [key: string]: any;
  propertyId?: string;
  newStatus?: string;
  previousStatus?: string;
}

interface Upload {
  id: string;
  date: string;
  properties: Property[];
}

export default function TaxTracker() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [newProperties, setNewProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const savedUploads = localStorage.getItem('property-tax-uploads');
      if (savedUploads) {
        const parsedUploads = JSON.parse(savedUploads);
        setUploads(parsedUploads);
        
        if (parsedUploads.length > 1) {
          const lastUpload = parsedUploads[parsedUploads.length - 1];
          const previousUpload = parsedUploads[parsedUploads.length - 2];
          const changes = detectChanges(previousUpload.properties, lastUpload.properties);
          setNewProperties(changes);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error loading saved data');
    }
    setLoading(false);
  };

  const saveData = (newUploads: Upload[]) => {
    try {
      localStorage.setItem('property-tax-uploads', JSON.stringify(newUploads));
    } catch (error) {
      console.error('Error saving data:', error);
      setError('Error saving data. Storage might be full.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Property>(worksheet);

      const uploadDate = new Date().toISOString();
      const newUpload: Upload = {
        id: uploadDate,
        date: new Date(uploadDate).toLocaleDateString(),
        properties: jsonData
      };

      const updatedUploads = [...uploads, newUpload];
      
      let changes: Property[] = [];
      if (uploads.length > 0) {
        changes = detectChanges(uploads[uploads.length - 1].properties, jsonData);
        setNewProperties(changes);
      }

      setUploads(updatedUploads);
      saveData(updatedUploads);
      
      if (uploads.length === 0) {
        alert(`Successfully uploaded ${jsonData.length} properties. This is your baseline. Upload another file next month to detect changes.`);
      } else if (changes.length > 0) {
        alert(`Found ${changes.length} properties with new J, A, or P status!`);
      } else {
        alert(`Upload complete. No new status changes detected.`);
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      setError(error.message || 'Error processing file. Please ensure it\'s a valid Excel file.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const detectChanges = (previousData: Property[], currentData: Property[]): Property[] => {
    const changes: Property[] = [];
    
    currentData.forEach(currentProp => {
      const propertyId = getPropertyIdentifier(currentProp);
      const previousProp = previousData.find(p => getPropertyIdentifier(p) === propertyId);
      
      if (previousProp) {
        const currentStatus = getStatus(currentProp);
        const previousStatus = getStatus(previousProp);
        
        if (currentStatus && !previousStatus) {
          changes.push({
            ...currentProp,
            propertyId,
            newStatus: currentStatus,
            previousStatus: previousStatus || 'None'
          });
        }
      } else {
        const currentStatus = getStatus(currentProp);
        if (currentStatus) {
          changes.push({
            ...currentProp,
            propertyId,
            newStatus: currentStatus,
            previousStatus: 'None'
          });
        }
      }
    });
    
    return changes;
  };

  const getPropertyIdentifier = (property: Property): string => {
    const identifierKeys = [
      'Property ID',
      'Parcel Number',
      'Parcel ID',
      'Parcel',
      'Address',
      'Owner',
      'Owner Name',
      'Account Number',
      'Account'
    ];
    
    for (const key of identifierKeys) {
      if (property[key]) {
        return String(property[key]);
      }
    }
    
    for (const key in property) {
      if (property[key] && String(property[key]).trim()) {
        return String(property[key]);
      }
    }
    
    return 'Unknown';
  };

  const getStatus = (property: Property): string | null => {
    const statusKeys = ['Status', 'Judgment Status', 'Tax Status', 'Foreclosure Status'];
    
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

  const exportChanges = () => {
    if (newProperties.length === 0) {
      alert('No changes to export');
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(newProperties);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'New Status Properties');
      const fileName = `property_changes_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      alert(`Exported ${newProperties.length} properties to ${fileName}`);
    } catch (error) {
      console.error('Error exporting:', error);
      setError('Error exporting file');
    }
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        localStorage.removeItem('property-tax-uploads');
        setUploads([]);
        setNewProperties([]);
        alert('All data cleared successfully');
      } catch (error) {
        console.error('Error clearing data:', error);
        setError('Error clearing data');
      }
    }
  };

  const getStatusColor = (status: string | undefined): string => {
    switch(status) {
      case 'J': return 'bg-red-100 text-red-800 border-red-300';
      case 'A': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'P': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string | undefined): string => {
    switch(status) {
      case 'J': return 'Judgment';
      case 'A': return 'Active Judgment';
      case 'P': return 'Pending Judgment';
      default: return status || 'Unknown';
    }
  };

  if (loading && uploads.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Property Tax Status Tracker
              </h1>
              <p className="text-gray-600">
                Track properties receiving new J (Judgment), A (Active), or P (Pending) status
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex gap-4 items-center flex-wrap mb-6">
            <label className={`flex items-center gap-2 px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg cursor-pointer transition`}>
              <Upload size={20} />
              {loading ? 'Processing...' : 'Upload Excel File'}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>

            {uploads.length > 0 && (
              <>
                <button
                  onClick={exportChanges}
                  disabled={newProperties.length === 0 || loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  <Download size={20} />
                  Export Changes ({newProperties.length})
                </button>
                <button
                  onClick={clearAllData}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  Clear All Data
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="text-blue-600 font-semibold text-sm mb-1">Total Uploads</div>
              <div className="text-3xl font-bold text-blue-900">{uploads.length}</div>
            </div>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="text-green-600 font-semibold text-sm mb-1">New Status Changes</div>
              <div className="text-3xl font-bold text-green-900">{newProperties.length}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <div className="text-purple-600 font-semibold text-sm mb-1">Last Upload</div>
              <div className="text-lg font-bold text-purple-900">
                {uploads.length > 0 ? uploads[uploads.length - 1].date : 'None'}
              </div>
            </div>
          </div>
        </div>

        {newProperties.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-green-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">
                Properties with New Status ({newProperties.length})
              </h2>
            </div>
            <p className="text-gray-600 mb-4">
              These properties have received a new J, A, or P status since the last upload
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Additional Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {newProperties.map((prop, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {prop.propertyId || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 border border-gray-300">
                          {prop.previousStatus || 'None'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 text-xs font-medium rounded border ${getStatusColor(prop.newStatus)}`}>
                          {getStatusLabel(prop.newStatus)} ({prop.newStatus})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="max-w-md space-y-1">
                          {Object.entries(prop)
                            .filter(([key]) => !['propertyId', 'newStatus', 'previousStatus'].includes(key))
                            .slice(0, 4)
                            .map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium text-gray-700">{key}:</span> {String(value || 'N/A')}
                              </div>
                            ))
                          }
                          {Object.keys(prop).filter(key => !['propertyId', 'newStatus', 'previousStatus'].includes(key)).length > 4 && (
                            <div className="text-xs text-gray-500 italic">...and more</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {uploads.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Yet</h3>
            <p className="text-gray-600 mb-4">
              Upload your first Excel file from the county to get started tracking property status changes
            </p>
            <p className="text-sm text-gray-500">
              This will become your baseline. Next month, upload a new file to detect properties with new J, A, or P status.
            </p>
          </div>
        )}

        {uploads.length > 0 && newProperties.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <TrendingUp className="mx-auto mb-4 text-blue-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No New Status Changes</h3>
            <p className="text-gray-600">
              Upload another file to detect properties with newly assigned J, A, or P status
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3">Status Legend:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 border border-red-300 rounded text-xs font-medium">J</span>
              <span>Judgment - Property has final judgment for foreclosure</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-xs font-medium">A</span>
              <span>Active Judgment - Active foreclosure proceedings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded text-xs font-medium">P</span>
              <span>Pending Judgment - Foreclosure pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

