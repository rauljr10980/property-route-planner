import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Upload, Route, X, Filter, Navigation, AlertCircle, CheckCircle } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import * as XLSX from 'xlsx';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

const containerStyle = {
  width: '100%',
  height: '500px'
};

export default function PropertyRoutePlanner() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [filterPercent, setFilterPercent] = useState(100);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 29.4241, lng: -98.4936 });
  const [mapZoom, setMapZoom] = useState(11);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<any>({});
  const [rawData, setRawData] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  useEffect(() => {
    const filtered = properties.filter(prop => {
      // Use direct tax percentage if available, otherwise calculate
      let percent = 0;
      if (prop.taxPercentage !== undefined && prop.taxPercentage !== null) {
        percent = prop.taxPercentage;
      } else if (prop.taxesOwed && prop.appraisedValue && prop.appraisedValue > 0) {
        percent = (prop.taxesOwed / prop.appraisedValue) * 100;
      } else {
        // If no tax data, include the property (show all properties without tax data)
        return true;
      }
      return percent <= filterPercent;
    });
    setFilteredProperties(filtered);
  }, [properties, filterPercent]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setPreviewData(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Show preview of columns and first few rows
      const columns = Object.keys(jsonData[0]);
      setRawData(jsonData);
      setPreviewData({
        columns: columns,
        sampleRows: jsonData.slice(0, 3),
        totalRows: jsonData.length
      });

      setLoading(false);
    } catch (error: any) {
      console.error('Error reading file:', error);
      setError(error.message || 'Error reading file. Please check your Excel format.');
      setLoading(false);
    }

    e.target.value = '';
  };

  const geocodeWithGoogle = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!window.google || !window.google.maps) {
      // Fallback to OpenStreetMap if Google Maps not loaded
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              'User-Agent': 'PropertyRoutePlanner/1.0'
            }
          }
        );
        const geoData = await response.json();
        if (geoData && geoData[0]) {
          return {
            lat: parseFloat(geoData[0].lat),
            lng: parseFloat(geoData[0].lon)
          };
        }
      } catch (e) {
        console.error('OpenStreetMap geocoding error:', e);
      }
      return null;
    }

    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          console.warn(`Geocoding failed for ${address}: ${status}`);
          resolve(null);
        }
      });
    });
  };

  const processWithMapping = async () => {
    if (!previewData || !rawData) return;

    setLoading(true);
    setError('');

    try {
      const jsonData = rawData;

      const addressCol = columnMapping.address;
      const taxesCol = columnMapping.taxes;
      const valueCol = columnMapping.value;
      const taxPercentCol = columnMapping.taxPercent;

      if (!addressCol || !columnMapping.state || !columnMapping.zip) {
        throw new Error('Please select Street/City, State, and Zip Code columns');
      }

      // Geocode addresses with delay
      const geocodedData: any[] = [];
      const failedAddresses: string[] = [];
      
      for (let i = 0; i < Math.min(jsonData.length, 100); i++) {
        const row = jsonData[i];
        
        // Build full address from components
        const streetCity = row[addressCol];
        const state = row[columnMapping.state];
        const zip = row[columnMapping.zip];
        
        const address = `${streetCity}, ${state} ${zip}`.trim();
        
        if (!streetCity) {
          console.warn('No address found for row:', row);
          continue;
        }

        try {
          // Add delay to avoid rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          console.log(`Geocoding (${i + 1}/${Math.min(jsonData.length, 100)}): ${address}`);

          const location = await geocodeWithGoogle(address);
          
          if (location) {
            // Get tax percentage - prefer direct column, otherwise calculate
            let taxPercentage = 0;
            if (taxPercentCol && row[taxPercentCol]) {
              taxPercentage = parseFloat(row[taxPercentCol] || 0);
            } else if (taxesCol && valueCol && row[taxesCol] && row[valueCol]) {
              const taxesOwed = parseFloat(row[taxesCol] || 0);
              const appraisedValue = parseFloat(row[valueCol] || 0);
              if (appraisedValue > 0) {
                taxPercentage = (taxesOwed / appraisedValue) * 100;
              }
            }

            const prop = {
              id: i,
              address: address,
              lat: location.lat,
              lng: location.lng,
              taxesOwed: taxesCol ? parseFloat(row[taxesCol] || 0) : 0,
              appraisedValue: valueCol ? parseFloat(row[valueCol] || 0) : 0,
              taxPercentage: taxPercentage,
              owner: row[columnMapping.owner] || 'N/A',
              propertyType: row[columnMapping.propertyType] || 'N/A',
              ...row
            };
            geocodedData.push(prop);
            console.log(`✓ Successfully geocoded: ${address}`);
          } else {
            console.warn(`✗ No results for: ${address}`);
            failedAddresses.push(address);
          }
        } catch (err) {
          console.error('Geocoding error for:', address, err);
          failedAddresses.push(address);
        }
      }

      console.log(`Geocoding complete: ${geocodedData.length} succeeded, ${failedAddresses.length} failed`);
      
      if (failedAddresses.length > 0) {
        console.log('Failed addresses:', failedAddresses);
      }

      if (geocodedData.length === 0) {
        throw new Error(`Could not geocode any addresses. Failed on all ${failedAddresses.length} addresses. Check the browser console for details.`);
      }

      setProperties(geocodedData);
      
      if (geocodedData.length > 0) {
        // Center map on first property
        setMapCenter({ lat: geocodedData[0].lat, lng: geocodedData[0].lng });
      }

      // Show success message with any failures
      if (failedAddresses.length > 0) {
        alert(`Successfully geocoded ${geocodedData.length} properties. ${failedAddresses.length} addresses failed. Check console for details.`);
      }

      setPreviewData(null);
      setLoading(false);
    } catch (error: any) {
      console.error('Error processing file:', error);
      setError(error.message || 'Error processing file.');
      setLoading(false);
    }
  };

  const createRoute = () => {
    if (filteredProperties.length === 0) {
      alert('No properties to route');
      return;
    }

    const waypoints = filteredProperties
      .map(p => `${p.lat},${p.lng}`)
      .join('/');
    
    const url = `https://www.google.com/maps/dir/${waypoints}`;
    window.open(url, '_blank');
  };

  const calculateTaxPercent = (prop: any) => {
    // Use direct tax percentage if available, otherwise calculate
    if (prop.taxPercentage !== undefined && prop.taxPercentage !== null) {
      return parseFloat(prop.taxPercentage).toFixed(2);
    }
    if (!prop.taxesOwed || !prop.appraisedValue || prop.appraisedValue === 0) return 0;
    return ((prop.taxesOwed / prop.appraisedValue) * 100).toFixed(2);
  };

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const handleMapLoadError = useCallback((error: Error) => {
    console.error('Google Maps load error:', error);
    setMapLoadError(error.message || 'Failed to load Google Maps. Check your API key and restrictions.');
  }, []);

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places', 'geometry']}
      onLoad={onMapLoad}
      onError={handleMapLoadError}
      loadingElement={<div className="w-full h-[500px] bg-gray-200 flex items-center justify-center"><p>Loading Google Maps...</p></div>}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-indigo-600" />
                <h1 className="text-3xl font-bold text-gray-800">Property Route Planner</h1>
              </div>
              
              {!previewData && (
                <label className={`flex items-center gap-2 px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg cursor-pointer transition-colors`}>
                  <Upload className="w-5 h-5" />
                  {loading ? 'Processing...' : 'Upload Excel'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {loading && !previewData && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">Processing file...</p>
              </div>
            )}

            {previewData && (
              <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-800">
                    File Loaded! Found {previewData.totalRows} rows
                  </h3>
                </div>

                <p className="text-sm text-gray-700 mb-4">
                  Please map your Excel columns to the required fields:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street/City Column *
                      <span className="text-xs text-gray-500 block mt-1">Select the column with your full street address</span>
                    </label>
                    <select
                      value={columnMapping.address || ''}
                      onChange={(e) => setColumnMapping({...columnMapping, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select column...</option>
                      {previewData.columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State Column *
                    </label>
                    <select
                      value={columnMapping.state || ''}
                      onChange={(e) => setColumnMapping({...columnMapping, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select column...</option>
                      {previewData.columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zip Code Column *
                    </label>
                    <select
                      value={columnMapping.zip || ''}
                      onChange={(e) => setColumnMapping({...columnMapping, zip: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select column...</option>
                      {previewData.columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taxes Owed Column (optional)
                    </label>
                    <select
                      value={columnMapping.taxes || ''}
                      onChange={(e) => setColumnMapping({...columnMapping, taxes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select column...</option>
                      {previewData.columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appraised Value Column (optional)
                    </label>
                    <select
                      value={columnMapping.value || ''}
                      onChange={(e) => setColumnMapping({...columnMapping, value: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select column...</option>
                      {previewData.columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Percentage Column (optional)
                      <span className="text-xs text-gray-500 block mt-1">Direct percentage column (e.g., 5.2 for 5.2%)</span>
                    </label>
                    <select
                      value={columnMapping.taxPercent || ''}
                      onChange={(e) => setColumnMapping({...columnMapping, taxPercent: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select column...</option>
                      {previewData.columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Owner Column (optional)
                    </label>
                    <select
                      value={columnMapping.owner || ''}
                      onChange={(e) => setColumnMapping({...columnMapping, owner: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select column...</option>
                      {previewData.columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white p-4 rounded border border-gray-200 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 3 rows):</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          {previewData.columns.map((col: string) => (
                            <th key={col} className="px-2 py-1 text-left font-medium text-gray-700">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.sampleRows.map((row: any, idx: number) => (
                          <tr key={idx} className="border-b">
                            {previewData.columns.map((col: string) => (
                              <td key={col} className="px-2 py-1 text-gray-600">
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
                    onClick={processWithMapping}
                    disabled={!columnMapping.address || !columnMapping.state || !columnMapping.zip || loading}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Geocoding Addresses...' : 'Process Properties'}
                  </button>
                  <button
                    onClick={() => setPreviewData(null)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {properties.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Tax Percentage (≤ {filterPercent}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterPercent}
                      onChange={(e) => setFilterPercent(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={createRoute}
                    disabled={filteredProperties.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Navigation className="w-5 h-5" />
                    Create Route ({filteredProperties.length})
                  </button>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Total Properties:</strong> {properties.length} | 
                    <strong className="ml-2">Filtered:</strong> {filteredProperties.length}
                  </p>
                </div>
              </div>
            )}
          </div>

          {mapLoadError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium mb-1">Google Maps Error</p>
              <p className="text-red-700 text-sm mb-2">{mapLoadError}</p>
              <p className="text-red-600 text-xs">
                Common fixes: 1) Check API key restrictions allow <code>http://localhost:*</code>, 
                2) Enable "Maps JavaScript API" in Google Cloud Console, 
                3) Verify billing is set up (required even for free tier)
              </p>
            </div>
          )}

          {properties.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Property Map</h2>
                <div className="relative w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden">
                  {mapLoadError ? (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <div className="text-center p-6">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <p className="text-red-700 font-medium">Map failed to load</p>
                        <p className="text-sm text-gray-600 mt-2">Check console for details</p>
                      </div>
                    </div>
                  ) : (
                    <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={mapCenter}
                    zoom={mapZoom}
                    onLoad={onMapLoad}
                    options={{
                      streetViewControl: true,
                      mapTypeControl: true,
                      fullscreenControl: true,
                    }}
                  >
                    {filteredProperties.map((prop) => (
                      <Marker
                        key={prop.id}
                        position={{ lat: prop.lat, lng: prop.lng }}
                        onClick={() => {
                          setSelectedProperty(prop);
                          setMapCenter({ lat: prop.lat, lng: prop.lng });
                          setMapZoom(15);
                        }}
                        icon={{
                          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        }}
                      >
                        {selectedProperty && selectedProperty.id === prop.id && (
                          <InfoWindow
                            onCloseClick={() => setSelectedProperty(null)}
                          >
                            <div className="p-2">
                              <p className="font-semibold text-sm">{prop.address}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Tax Rate: {calculateTaxPercent(prop)}%
                              </p>
                              <button
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${prop.lat},${prop.lng}`, '_blank')}
                                className="mt-2 text-xs text-blue-600 hover:underline"
                              >
                                View on Google Maps
                              </button>
                            </div>
                          </InfoWindow>
                        )}
                      </Marker>
                    ))}
                    </GoogleMap>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-xl p-6 max-h-[600px] overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Properties</h2>
                <div className="space-y-3">
                  {filteredProperties.map((prop) => (
                    <div
                      key={prop.id}
                      onClick={() => {
                        setSelectedProperty(prop);
                        setMapCenter({ lat: prop.lat, lng: prop.lng });
                        setMapZoom(15);
                      }}
                      className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors border-2 border-transparent hover:border-indigo-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">{prop.address}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Tax Rate: <span className="font-semibold text-indigo-600">{calculateTaxPercent(prop)}%</span>
                          </p>
                        </div>
                        <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedProperty && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-gray-800">Property Details</h2>
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase">Address</h3>
                    <p className="text-lg text-gray-800">{selectedProperty.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase">Taxes Owed</h3>
                      <p className="text-lg text-gray-800">${selectedProperty.taxesOwed?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase">Appraised Value</h3>
                      <p className="text-lg text-gray-800">${selectedProperty.appraisedValue?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Tax Percentage</h3>
                    <p className="text-3xl font-bold text-indigo-600">{calculateTaxPercent(selectedProperty)}%</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase">Owner</h3>
                      <p className="text-lg text-gray-800">{selectedProperty.owner}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase">Property Type</h3>
                      <p className="text-lg text-gray-800">{selectedProperty.propertyType}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedProperty.lat},${selectedProperty.lng}`, '_blank')}
                    className="w-full mt-4 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-5 h-5" />
                    Navigate to Property
                  </button>
                </div>
              </div>
            </div>
          )}

          {properties.length === 0 && !loading && !previewData && (
            <div className="bg-white rounded-lg shadow-xl p-12 text-center">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Your Property Data</h2>
              <p className="text-gray-600 mb-4">
                Upload an Excel file with your property data to get started
              </p>
              {!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Google Maps API key not configured. Create a <code>.env</code> file with <code>VITE_GOOGLE_MAPS_API_KEY=your_key_here</code>
                  </p>
                  <p className="text-yellow-700 text-xs mt-2">
                    The app will use OpenStreetMap as a fallback, but Google Maps provides better accuracy.
                  </p>
                </div>
              ) : null}
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                <Upload className="w-5 h-5" />
                Choose File
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </LoadScript>
  );
}

