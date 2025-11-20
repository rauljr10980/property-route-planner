import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, TrendingUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PropertyTaxTracker() {
  const [uploads, setUploads] = useState([]);
  const [newProperties, setNewProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const uploadsData = await window.storage.get('uploads');
      if (uploadsData) {
        setUploads(JSON.parse(uploadsData.value));
      }
    } catch (error) {
      console.log('No previous data found');
    }
    setLoading(false);
  };

  const saveData = async (newUploads) => {
    try {
      await window.storage.set('uploads', JSON.stringify(newUploads));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const uploadDate = new Date().toISOString();
        const newUpload = {
          id: uploadDate,
          date: new Date(uploadDate).toLocaleDateString(),
          properties: jsonData
        };

        const updatedUploads = [...uploads, newUpload];
        
        if (uploads.length > 0) {
          const changes = detectChanges(uploads[uploads.length - 1].properties, jsonData);
          setNewProperties(changes);
        }

        setUploads(updatedUploads);
        await saveData(updatedUploads);
      } catch (error) {
        alert('Error processing file. Please ensure it\'s a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const detectChanges = (previousData, currentData) => {
    const changes = [];
    const statusFields = ['J', 'A', 'P', 'j', 'a', 'p'];
    
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
      }
    });
    
    return changes;
  };

  const getPropertyIdentifier = (property) => {
    return property['Property ID'] || 
           property['Parcel Number'] || 
           property['Address'] ||
           property['Owner'] ||
           Object.values(property)[0];
  };

  const getStatus = (property) => {
    const statusFields = ['Status', 'J', 'A', 'P', 'Judgment Status'];
    for (let field of statusFields) {
      if (property[field]) {
        const value = String(property[field]).toUpperCase();
        if (value === 'J' || value === 'A' || value === 'P') {
          return value;
        }
      }
    }
    
    for (let key in property) {
      const value = String(property[key]).toUpperCase();
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

    const ws = XLSX.utils.json_to_sheet(newProperties);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'New Status Properties');
    XLSX.writeFile(wb, `property_changes_${new Date().toLocaleDateString()}.xlsx`);
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        await window.storage.delete('uploads');
        setUploads([]);
        setNewProperties([]);
      } catch (error) {
        console.error('Error clearing data:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'J': return 'bg-red-100 text-red-800';
      case 'A': return 'bg-yellow-100 text-yellow-800';
      case 'P': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'J': return 'Judgment';
      case 'A': return 'Active Judgment';
      case 'P': return 'Pending Judgment';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Property Tax Status Tracker
          </h1>
          <p className="text-gray-600 mb-6">
            Track properties receiving new J (Judgment), A (Active), or P (Pending) status
          </p>

          <div className="flex gap-4 items-center flex-wrap">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
              <Upload size={20} />
              Upload Excel File
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploads.length > 0 && (
              <>
                <button
                  onClick={exportChanges}
                  disabled={newProperties.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  <Download size={20} />
                  Export Changes
                </button>
                <button
                  onClick={clearAllData}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Clear All Data
                </button>
              </>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 font-semibold">Total Uploads</div>
              <div className="text-3xl font-bold text-blue-900">{uploads.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 font-semibold">New Status Changes</div>
              <div className="text-3xl font-bold text-green-900">{newProperties.length}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-purple-600 font-semibold">Last Upload</div>
              <div className="text-lg font-bold text-purple-900">
                {uploads.length > 0 ? uploads[uploads.length - 1].date : 'None'}
              </div>
            </div>
          </div>
        </div>

        {newProperties.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-green-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">
                Properties with New Status
              </h2>
            </div>
            <p className="text-gray-600 mb-4">
              These properties have received a new J, A, or P status since the last upload
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Property ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Previous Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">New Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {newProperties.map((prop, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {prop.propertyId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                          {prop.previousStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(prop.newStatus)}`}>
                          {getStatusLabel(prop.newStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="max-w-md overflow-x-auto">
                          {Object.entries(prop)
                            .filter(([key]) => !['propertyId', 'newStatus', 'previousStatus'].includes(key))
                            .slice(0, 3)
                            .map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {uploads.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Yet</h3>
            <p className="text-gray-600">
              Upload your first Excel file from the county to get started tracking property status changes
            </p>
          </div>
        )}

        {uploads.length > 0 && newProperties.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <AlertCircle className="mx-auto mb-4 text-blue-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No New Status Changes</h3>
            <p className="text-gray-600">
              Upload another file to detect properties with newly assigned J, A, or P status
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Status Legend:</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <div><span className="font-semibold">J</span> - Judgment (property has final judgment for foreclosure)</div>
            <div><span className="font-semibold">A</span> - Active Judgment (active foreclosure proceedings)</div>
            <div><span className="font-semibold">P</span> - Pending Judgment (foreclosure pending)</div>
          </div>
        </div>
      </div>
    </div>
  );
}