import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, X, Navigation, AlertCircle, CheckCircle } from 'lucide-react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { loadSharedProperties, Property } from '../utils/sharedData';
import { getPropertyStatus as getPropertyStatusUtil } from '../utils/fileProcessor';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

const containerStyle = {
  width: '100%',
  height: '500px'
};

interface Property {
  id: string | number;
  address?: string;
  lat?: number;
  lng?: number;
  taxesOwed?: number;
  appraisedValue?: number;
  taxPercentage?: number;
  owner?: string;
  propertyType?: string;
  currentStatus?: 'J' | 'A' | 'P' | null;
  previousStatus?: 'J' | 'A' | 'P' | null;
  statusChangeDate?: string;
  daysSinceStatusChange?: number;
  [key: string]: any;
}

export default function RoutePlanner() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 29.4241, lng: -98.4936 });
  const [mapZoom, setMapZoom] = useState(11);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<'J' | 'A' | 'P'>>(new Set(['J', 'A', 'P'])); // Default: show all
  const [showStatusChanges, setShowStatusChanges] = useState(true);
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all'); // 'all', 'new', 'blank-to-p', 'blank-to-a', 'blank-to-j', 'p-to-a', 'a-to-j', 'other'
  const [statusChangeFilter, setStatusChangeFilter] = useState<Set<'J' | 'A' | 'P'>>(new Set(['J', 'A', 'P'])); // Filter by new status

  useEffect(() => {
    loadPropertiesFromShared();
    
    // Listen for property updates
    const handlePropertiesUpdated = (event: CustomEvent) => {
      loadPropertiesFromShared();
    };
    
    window.addEventListener('propertiesUpdated', handlePropertiesUpdated as EventListener);
    return () => {
      window.removeEventListener('propertiesUpdated', handlePropertiesUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    // Geocode properties when they're loaded
    if (properties.length > 0) {
      geocodeProperties();
    } else {
      setFilteredProperties([]);
    }
  }, [properties]);

  useEffect(() => {
    // Filter properties by status
    if (properties.length > 0) {
      const filtered = properties.filter(prop => {
        if (statusFilter.size === 0) return false; // No filters selected
        if (statusFilter.has('J') && statusFilter.has('A') && statusFilter.has('P')) {
          return true; // Show all
        }
        const status = prop.currentStatus || getPropertyStatusUtil(prop);
        return status && statusFilter.has(status as 'J' | 'A' | 'P');
      });
      setFilteredProperties(filtered);
    }
  }, [properties, statusFilter]);

  const loadPropertiesFromShared = async () => {
    try {
      setLoading(true);
      // Load from GCS first (persistent), fallback to localStorage
      const { properties: sharedProps } = await loadSharedProperties();
      setProperties(sharedProps);
      setLoading(false);
    } catch (error) {
      console.error('Error loading shared properties:', error);
      setError('Error loading properties. Please upload a file in the File History tab.');
      setLoading(false);
    }
  };

  const geocodeProperties = async () => {
    const geocodedData: Property[] = [];
    
    for (const prop of properties) {
      // Check if property already has coordinates
      if (prop.lat && prop.lng) {
        geocodedData.push(prop);
        continue;
      }
      
      // Try to get address from property
      const address = prop.address || prop.Address || 
        `${prop.Street || ''} ${prop.City || ''}, ${prop.State || 'TX'} ${prop.Zip || ''}`.trim();
      
      if (!address) {
        geocodedData.push(prop);
        continue;
      }
      
      try {
        const location = await geocodeWithGoogle(address);
        if (location) {
          geocodedData.push({
            ...prop,
            lat: location.lat,
            lng: location.lng,
            address: address
          });
        } else {
          geocodedData.push(prop);
        }
      } catch (err) {
        geocodedData.push(prop);
      }
    }
    
    // Update properties with geocoded data, but don't set filteredProperties here
    // (filteredProperties will be set by the status filter effect)
    setProperties(geocodedData);
    if (geocodedData.length > 0 && geocodedData[0].lat && geocodedData[0].lng) {
      setMapCenter({ lat: geocodedData[0].lat, lng: geocodedData[0].lng });
    }
  };

  // Removed upload functionality - all files are uploaded in File History tab

  const geocodeWithGoogle = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // Check if Google Maps is available
    if (!window.google || !window.google.maps) {
      console.warn('Google Maps not loaded, using OpenStreetMap fallback');
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

    // Use Google Maps Geocoder
    return new Promise((resolve) => {
      try {
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
            if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
              setMapLoadError(`Google Maps API error: ${status}. Please check your API key and billing.`);
            }
            resolve(null);
          }
        });
      } catch (error) {
        console.error('Geocoding error:', error);
        setMapLoadError('Geocoding service error. Please check your API key configuration.');
        resolve(null);
      }
    });
  };

  // Removed processWithMapping - all files are processed in File History tab

  const createRoute = (statuses?: ('J' | 'A' | 'P')[]) => {
    let propertiesToRoute = filteredProperties;
    
    // If specific statuses provided, filter to those
    if (statuses && statuses.length > 0) {
      propertiesToRoute = filteredProperties.filter(p => 
        p.currentStatus && statuses.includes(p.currentStatus)
      );
    }
    
    // Only include properties with coordinates
    const propertiesWithCoords = propertiesToRoute.filter(p => p.lat && p.lng);
    
    if (propertiesWithCoords.length === 0) {
      alert('No properties with valid locations to route');
      return;
    }

    const waypoints = propertiesWithCoords
      .map(p => `${p.lat},${p.lng}`)
      .join('/');
    
    const url = `https://www.google.com/maps/dir/${waypoints}`;
    window.open(url, '_blank');
  };

  const toggleStatusFilter = (status: 'J' | 'A' | 'P') => {
    const newFilter = new Set(statusFilter);
    if (newFilter.has(status)) {
      newFilter.delete(status);
    } else {
      newFilter.add(status);
    }
    // If all are unchecked, check all
    if (newFilter.size === 0) {
      newFilter.add('J');
      newFilter.add('A');
      newFilter.add('P');
    }
    setStatusFilter(newFilter);
  };

  const getStatusColor = (status: 'J' | 'A' | 'P' | null | undefined) => {
    switch (status) {
      case 'J': return 'bg-red-500';
      case 'A': return 'bg-yellow-500';
      case 'P': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: 'J' | 'A' | 'P' | null | undefined) => {
    switch (status) {
      case 'J': return 'Judgment';
      case 'A': return 'Active';
      case 'P': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getStatusCounts = () => {
    const counts = { J: 0, A: 0, P: 0, total: properties.length };
    properties.forEach(prop => {
      const status = prop.currentStatus || getPropertyStatusUtil(prop);
      if (status === 'J') counts.J++;
      else if (status === 'A') counts.A++;
      else if (status === 'P') counts.P++;
    });
    return counts;
  };

  const getStatusChanges = () => {
    return properties
      .filter(prop => {
        // Include properties with status changes or new properties
        return (prop.previousStatus !== prop.currentStatus) || 
               (prop.previousStatus === null && prop.currentStatus !== null);
      })
      .map(prop => {
        const oldStatus = prop.previousStatus === null ? 'Blank' : prop.previousStatus;
        const newStatus = prop.currentStatus === null ? 'Blank' : prop.currentStatus;
        const isNew = prop.previousStatus === null && prop.currentStatus !== null;
        
        let changeType = 'other';
        if (isNew) {
          if (prop.currentStatus === 'P') changeType = 'blank-to-p';
          else if (prop.currentStatus === 'A') changeType = 'blank-to-a';
          else if (prop.currentStatus === 'J') changeType = 'blank-to-j';
        } else if (prop.previousStatus === 'P' && prop.currentStatus === 'A') {
          changeType = 'p-to-a';
        } else if (prop.previousStatus === 'A' && prop.currentStatus === 'J') {
          changeType = 'a-to-j';
        } else if (prop.previousStatus === 'P' && prop.currentStatus === 'J') {
          changeType = 'p-to-j';
        } else if (prop.previousStatus === 'A' && prop.currentStatus === 'P') {
          changeType = 'a-to-p';
        } else if (prop.previousStatus === 'J' && prop.currentStatus === 'A') {
          changeType = 'j-to-a';
        } else if (prop.previousStatus === 'J' && prop.currentStatus === 'P') {
          changeType = 'j-to-p';
        }
        
        return {
          property: prop,
          oldStatus,
          newStatus,
          isNew,
          changeType,
          transition: `${oldStatus} → ${newStatus}`,
          daysSinceChange: prop.daysSinceStatusChange || 0
        };
      });
  };

  const getFilteredStatusChanges = () => {
    let allChanges = getStatusChanges();
    
    // Filter by change type first
    if (changeTypeFilter !== 'all') {
      if (changeTypeFilter === 'new') {
        allChanges = allChanges.filter(c => c.isNew);
      } else {
        allChanges = allChanges.filter(c => c.changeType === changeTypeFilter);
      }
    }
    
    // Filter by new status (J, A, P)
    if (statusChangeFilter.size < 3) {
      allChanges = allChanges.filter(c => {
        if (!c.newStatus || c.newStatus === 'Blank') return false;
        return statusChangeFilter.has(c.newStatus);
      });
    }
    
    return allChanges;
  };

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'all': 'All Changes',
      'new': 'New Properties',
      'blank-to-p': 'Blank → P (New with P)',
      'blank-to-a': 'Blank → A (New with A)',
      'blank-to-j': 'Blank → J (New with J)',
      'p-to-a': 'P → A',
      'a-to-j': 'A → J',
      'p-to-j': 'P → J',
      'a-to-p': 'A → P',
      'j-to-a': 'J → A',
      'j-to-p': 'J → P',
      'other': 'Other Changes'
    };
    return labels[type] || type;
  };

  const calculateTaxPercent = (prop: Property) => {
    if (prop.taxPercentage !== undefined && prop.taxPercentage !== null) {
      return parseFloat(prop.taxPercentage.toString()).toFixed(2);
    }
    if (!prop.taxesOwed || !prop.appraisedValue || prop.appraisedValue === 0) return 0;
    return ((prop.taxesOwed / prop.appraisedValue) * 100).toFixed(2);
  };

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Property Route Planner</h1>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Properties loaded from File History</p>
              <p className="text-xs text-gray-500">Upload files in the File History tab</p>
            </div>
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

          {loading && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">Loading properties...</p>
            </div>
          )}

          {properties.length > 0 && (
            <div className="space-y-4">
              {/* Status Filter */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Status</h3>
                <div className="flex flex-wrap gap-3">
                  {(['J', 'A', 'P'] as const).map((status) => {
                    const isSelected = statusFilter.has(status);
                    const counts = getStatusCounts();
                    const count = status === 'J' ? counts.J : status === 'A' ? counts.A : counts.P;
                    return (
                      <button
                        key={status}
                        onClick={() => toggleStatusFilter(status)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          isSelected
                            ? `${getStatusColor(status)} text-white`
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-current"></span>
                        {getStatusLabel(status)} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Route Creation Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-3">
                  {/* All J, A, P Route - Always visible */}
                  <button
                    onClick={() => createRoute(['J', 'A', 'P'])}
                    disabled={properties.filter(p => (p.currentStatus === 'J' || p.currentStatus === 'A' || p.currentStatus === 'P') && p.lat && p.lng).length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold shadow-lg"
                  >
                    <Navigation className="w-5 h-5" />
                    All J, A, P ({properties.filter(p => (p.currentStatus === 'J' || p.currentStatus === 'A' || p.currentStatus === 'P') && p.lat && p.lng).length})
                  </button>
                  
                  {/* Filtered Route - Based on current filter */}
                  <button
                    onClick={() => createRoute()}
                    disabled={filteredProperties.filter(p => p.lat && p.lng).length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    <Navigation className="w-5 h-5" />
                    Filtered Route ({filteredProperties.filter(p => p.lat && p.lng).length})
                  </button>
                  
                  {/* Individual Status Routes */}
                  <div className="flex flex-wrap gap-2 border-l-2 border-gray-300 pl-3">
                    <button
                      onClick={() => createRoute(['J'])}
                      disabled={properties.filter(p => p.currentStatus === 'J' && p.lat && p.lng).length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <Navigation className="w-4 h-4" />
                      J Only ({properties.filter(p => p.currentStatus === 'J' && p.lat && p.lng).length})
                    </button>
                    
                    <button
                      onClick={() => createRoute(['A'])}
                      disabled={properties.filter(p => p.currentStatus === 'A' && p.lat && p.lng).length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <Navigation className="w-4 h-4" />
                      A Only ({properties.filter(p => p.currentStatus === 'A' && p.lat && p.lng).length})
                    </button>
                    
                    <button
                      onClick={() => createRoute(['P'])}
                      disabled={properties.filter(p => p.currentStatus === 'P' && p.lat && p.lng).length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <Navigation className="w-4 h-4" />
                      P Only ({properties.filter(p => p.currentStatus === 'P' && p.lat && p.lng).length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Properties</p>
                    <p className="text-lg font-bold text-gray-800">{properties.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Filtered</p>
                    <p className="text-lg font-bold text-blue-600">{filteredProperties.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">With Locations</p>
                    <p className="text-lg font-bold text-green-600">{filteredProperties.filter(p => p.lat && p.lng).length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status Filter</p>
                    <p className="text-lg font-bold text-purple-600">
                      {Array.from(statusFilter).join(', ') || 'None'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Status Changes Panel */}
        {properties.length > 0 && getStatusChanges().length > 0 && (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  Properties with New Status
                  <span className="ml-2 text-sm font-normal text-gray-500">({getStatusChanges().length})</span>
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  These properties have received a new J, A, or P status since the last upload
                </p>
              </div>
              <button
                onClick={() => setShowStatusChanges(!showStatusChanges)}
                className="text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 text-sm font-medium transition-colors"
              >
                {showStatusChanges ? 'Hide' : 'Show'}
              </button>
            </div>

            {showStatusChanges && (
              <div className="space-y-4">
                {/* Status Filter (P, A, J, All) */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Filter by New Status</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        if (statusChangeFilter.size === 3) {
                          setStatusChangeFilter(new Set());
                        } else {
                          setStatusChangeFilter(new Set(['J', 'A', 'P']));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        statusChangeFilter.size === 3
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      All Properties with New Status ({getStatusChanges().length})
                    </button>
                    {(['J', 'A', 'P'] as const).map((status) => {
                      const count = getStatusChanges().filter(c => c.newStatus === status).length;
                      const isSelected = statusChangeFilter.has(status);
                      return (
                        <button
                          key={status}
                          onClick={() => {
                            const newFilter = new Set(statusChangeFilter);
                            if (newFilter.has(status)) {
                              newFilter.delete(status);
                            } else {
                              newFilter.add(status);
                            }
                            if (newFilter.size === 0) {
                              newFilter.add('J');
                              newFilter.add('A');
                              newFilter.add('P');
                            }
                            setStatusChangeFilter(newFilter);
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            isSelected
                              ? `${getStatusColor(status)} text-white shadow-sm`
                              : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {getStatusLabel(status)} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Change Type Filter */}
                <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-600 mr-2 self-center">Change Type:</span>
                  {['all', 'new', 'blank-to-p', 'blank-to-a', 'blank-to-j', 'p-to-a', 'a-to-j', 'p-to-j', 'a-to-p', 'j-to-a', 'j-to-p', 'other'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setChangeTypeFilter(type)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        changeTypeFilter === type
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {getChangeTypeLabel(type)}
                    </button>
                  ))}
                </div>

                {/* Status Changes List */}
                <div className="max-h-96 overflow-x-auto overflow-y-auto border border-gray-200 rounded-lg bg-white">
                  <table 
                    className="w-full text-sm"
                    style={{ tableLayout: 'fixed', maxWidth: '100%' }}
                  >
                    <colgroup>
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '28%' }} />
                    </colgroup>
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">Property ID</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">Previous Status</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">New Status</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">Additional Details</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">Days</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {getFilteredStatusChanges().map((change, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => {
                            if (change.property.lat && change.property.lng) {
                              setSelectedProperty(change.property);
                              setMapCenter({ lat: change.property.lat!, lng: change.property.lng! });
                              setMapZoom(15);
                            }
                          }}
                        >
                          <td className="px-2 py-2 text-gray-900 font-medium text-xs truncate" title={String(change.property.id)}>
                            {String(change.property.id)}
                          </td>
                          <td className="px-2 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                              change.oldStatus === 'Blank' || change.oldStatus === 'None' ? 'bg-gray-200 text-gray-700' :
                              change.oldStatus === 'J' ? 'bg-red-100 text-red-700' :
                              change.oldStatus === 'A' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {change.oldStatus === 'Blank' ? 'None' : change.oldStatus}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                                change.newStatus === 'Blank' ? 'bg-gray-200 text-gray-700' :
                                change.newStatus === 'J' ? 'bg-red-500 text-white' :
                                change.newStatus === 'A' ? 'bg-yellow-500 text-white' :
                                'bg-green-500 text-white'
                              }`}>
                                {change.newStatus === 'P' ? 'Pending Judgment (P)' : 
                                 change.newStatus === 'A' ? 'Active (A)' :
                                 change.newStatus === 'J' ? 'Judgment (J)' : change.newStatus}
                              </span>
                              {change.isNew && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                                  NEW
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-gray-700 text-xs">
                            <div className="space-y-0.5">
                              {change.property['Request Seq.'] && (
                                <div className="truncate" title={`Request Seq.: ${change.property['Request Seq.']}`}>
                                  <span className="text-gray-500">Request Seq.:</span> {change.property['Request Seq.']}
                                </div>
                              )}
                              {change.property['__EMPTY'] && (
                                <div className="truncate" title={`__EMPTY: ${change.property['__EMPTY']}`}>
                                  <span className="text-gray-500">__EMPTY:</span> {String(change.property['__EMPTY'])}
                                </div>
                              )}
                              {change.property['__EMPTY_1'] && (
                                <div className="truncate" title={`__EMPTY_1: ${change.property['__EMPTY_1']}`}>
                                  <span className="text-gray-500">__EMPTY_1:</span> {String(change.property['__EMPTY_1'])}
                                </div>
                              )}
                              {change.property['BEXAR COUNTY'] && (
                                <div className="truncate" title={`BEXAR COUNTY: ${change.property['BEXAR COUNTY']}`}>
                                  <span className="text-gray-500">BEXAR COUNTY:</span> {String(change.property['BEXAR COUNTY'])}
                                </div>
                              )}
                              {change.property.address && (
                                <div className="truncate text-gray-600" title={change.property.address}>
                                  {change.property.address}
                                </div>
                              )}
                              {!change.property['Request Seq.'] && !change.property['__EMPTY'] && !change.property['BEXAR COUNTY'] && !change.property.address && (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-gray-600 text-xs whitespace-nowrap">
                            {change.daysSinceChange}d
                          </td>
                          <td className="px-2 py-2">
                            {change.property.lat && change.property.lng ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMapCenter({ lat: change.property.lat!, lng: change.property.lng! });
                                  setMapZoom(15);
                                  setSelectedProperty(change.property);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium hover:underline whitespace-nowrap"
                              >
                                View Map
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-4 border-t border-gray-200">
                  <div className="bg-indigo-50 rounded-lg p-3 text-center border border-indigo-100">
                    <p className="text-xl font-bold text-indigo-600">
                      {getStatusChanges().filter(c => c.isNew).length}
                    </p>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">New Properties</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                    <p className="text-xl font-bold text-red-600">
                      {getStatusChanges().filter(c => c.changeType === 'p-to-a' || c.changeType === 'a-to-j' || c.changeType === 'p-to-j').length}
                    </p>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">Escalations</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                    <p className="text-xl font-bold text-green-600">
                      {getStatusChanges().filter(c => c.changeType === 'a-to-p' || c.changeType === 'j-to-a' || c.changeType === 'j-to-p').length}
                    </p>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">Improvements</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-xl font-bold text-gray-700">
                      {getFilteredStatusChanges().length}
                    </p>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">Filtered</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        {mapLoadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium mb-1">Google Maps Error</p>
                <p className="text-red-700 text-sm mb-2">{mapLoadError}</p>
                <div className="text-xs text-red-600 space-y-1">
                  <p>Common issues:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>API key not set in .env file</li>
                    <li>Maps JavaScript API not enabled in Google Cloud Console</li>
                    <li>API key restrictions blocking your domain</li>
                    <li>Geocoding API not enabled</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {(!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium mb-1">⚠️ Google Maps API Key Not Configured</p>
                <p className="text-yellow-700 text-sm">
                  Please set <code className="bg-yellow-100 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your <code className="bg-yellow-100 px-1 py-0.5 rounded">.env</code> file
                </p>
              </div>
            </div>
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
                    {filteredProperties.filter(p => p.lat && p.lng).map((prop) => {
                      const status = prop.currentStatus;
                      let iconColor = 'red';
                      if (status === 'J') iconColor = 'red';
                      else if (status === 'A') iconColor = 'yellow';
                      else if (status === 'P') iconColor = 'green';
                      
                      // Check if this property has a status change
                      const hasStatusChange = prop.previousStatus !== prop.currentStatus || 
                                            (prop.previousStatus === null && prop.currentStatus !== null);
                      
                      return (
                      <Marker
                        key={prop.id}
                        position={{ lat: prop.lat!, lng: prop.lng! }}
                        onClick={() => {
                          setSelectedProperty(prop);
                          setMapCenter({ lat: prop.lat!, lng: prop.lng! });
                          setMapZoom(15);
                        }}
                        icon={{
                          url: hasStatusChange 
                            ? `http://maps.google.com/mapfiles/ms/icons/${iconColor}-pushpin.png`
                            : `http://maps.google.com/mapfiles/ms/icons/${iconColor}-dot.png`,
                          scaledSize: hasStatusChange ? new window.google.maps.Size(40, 40) : undefined
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
                              {hasStatusChange && (
                                <div className="mt-2 p-2 bg-blue-50 rounded">
                                  <p className="text-xs font-semibold text-blue-800 mb-1">Status Changed:</p>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      prop.previousStatus === null ? 'bg-gray-200 text-gray-700' :
                                      prop.previousStatus === 'J' ? 'bg-red-100 text-red-700' :
                                      prop.previousStatus === 'A' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {prop.previousStatus === null ? 'Blank' : prop.previousStatus}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                      prop.currentStatus === 'J' ? 'bg-red-500 text-white' :
                                      prop.currentStatus === 'A' ? 'bg-yellow-500 text-white' :
                                      prop.currentStatus === 'P' ? 'bg-green-500 text-white' :
                                      'bg-gray-200 text-gray-700'
                                    }`}>
                                      {prop.currentStatus || 'Blank'}
                                    </span>
                                  </div>
                                  {prop.daysSinceStatusChange !== undefined && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {prop.daysSinceStatusChange} day{prop.daysSinceStatusChange !== 1 ? 's' : ''} ago
                                    </p>
                                  )}
                                </div>
                              )}
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
                    );
                    })}
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800 text-sm">{prop.address}</p>
                          {prop.currentStatus && (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${getStatusColor(prop.currentStatus)}`}>
                              {prop.currentStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Tax Rate: <span className="font-semibold text-indigo-600">{calculateTaxPercent(prop)}%</span>
                        </p>
                        {prop.daysSinceStatusChange !== undefined && prop.daysSinceStatusChange > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Status changed {prop.daysSinceStatusChange} day{prop.daysSinceStatusChange !== 1 ? 's' : ''} ago
                          </p>
                        )}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Tax Percentage</h3>
                    <p className="text-3xl font-bold text-indigo-600">{calculateTaxPercent(selectedProperty)}%</p>
                  </div>
                  {selectedProperty.currentStatus && (
                    <div className={`${getStatusColor(selectedProperty.currentStatus)} bg-opacity-20 p-4 rounded-lg`}>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Status</h3>
                      <p className="text-3xl font-bold text-gray-800">
                        {selectedProperty.currentStatus} - {getStatusLabel(selectedProperty.currentStatus)}
                      </p>
                      {selectedProperty.previousStatus && selectedProperty.previousStatus !== selectedProperty.currentStatus && (
                        <p className="text-xs text-gray-600 mt-1">
                          Changed from {selectedProperty.previousStatus}
                        </p>
                      )}
                      {selectedProperty.daysSinceStatusChange !== undefined && (
                        <p className="text-xs text-gray-600 mt-1">
                          {selectedProperty.daysSinceStatusChange} day{selectedProperty.daysSinceStatusChange !== 1 ? 's' : ''} since change
                        </p>
                      )}
                    </div>
                  )}
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

        {properties.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Properties Loaded</h2>
            <p className="text-gray-600 mb-4">
              Upload an Excel file in the <strong>File History</strong> tab to get started
            </p>
            <p className="text-sm text-gray-500">
              All tabs share the same data - upload once in File History, use everywhere
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

