import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, TrendingUp, Download, Search, ExternalLink, Calendar, DollarSign, Users, FileText, RefreshCw, Loader, Home, Database, Map, Filter, TrendingDown, Minus, X, CheckCircle } from 'lucide-react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { loadSharedProperties, loadSharedPropertiesSync, Property as SharedProperty } from '../utils/sharedData';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

interface Property {
  [key: string]: any;
  propertyId?: string;
  newStatus?: string;
  previousStatus?: string;
  accountNumber?: string;
  owner?: string;
  address?: string;
  currentBalance?: number;
  totalOwed?: number;
  motivationScore?: number;
  balanceTrend?: 'increasing' | 'stable' | 'decreasing';
  balanceHistory?: Array<{ year: string; amount: number }>;
  monthsSinceLastPayment?: number;
  lastPaymentBy?: string;
  lastPaymentDate?: string;
  paymentHistory?: Array<{ date: string; amount: number; paidBy: string }>;
  paymentPattern?: string;
  paymentPlanActive?: boolean;
  paymentBehavior?: string;
  insight?: string;
  lat?: number;
  lng?: number;
}

interface Upload {
  id: string;
  date: string;
  properties?: Property[];
  count?: number;
}

export default function TaxTracker() {
  const [currentPage, setCurrentPage] = useState<'home' | 'data'>('home');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Pagination state
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0 });
  const [trendFilter, setTrendFilter] = useState<'all' | 'increasing' | 'stable' | 'decreasing'>('all');
  const [mapCenter, setMapCenter] = useState({ lat: 29.4241, lng: -98.4936 });
  const [mapZoom, setMapZoom] = useState(11);
  const [hoveredProperty, setHoveredProperty] = useState<Property | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geocodedProperties, setGeocodedProperties] = useState<Property[]>([]);
  const [statusChangeFilter, setStatusChangeFilter] = useState<Set<'J' | 'A' | 'P'>>(new Set(['J', 'A', 'P']));
  const [showStatusChanges, setShowStatusChanges] = useState(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentPage === 'home' && properties.length > 0) {
      geocodeProperties();
    }
  }, [currentPage, properties]);

  const loadPropertiesFromShared = async () => {
    try {
      setLoading(true);
      // Load from GCS first (persistent), fallback to localStorage
      const { properties: sharedProps, lastUploadDate } = await loadSharedProperties();
      setProperties(sharedProps);
      
      // Update uploads count based on shared data
      if (sharedProps.length > 0) {
        const uploadCount = Math.ceil(sharedProps.length / 100); // Estimate based on typical file sizes
        setUploads([{
          id: lastUploadDate || new Date().toISOString(),
          date: lastUploadDate ? new Date(lastUploadDate).toLocaleDateString() : new Date().toLocaleDateString(),
          count: sharedProps.length
        }]);
      }
    } catch (error) {
      console.error('Error loading shared properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!window.google || !window.google.maps) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              'User-Agent': 'PropertyTaxTracker/1.0'
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
        console.error('Geocoding error:', e);
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
          resolve(null);
        }
      });
    });
  };

  const geocodeProperties = async () => {
    const propsWithCoords: Property[] = [];
    
    for (const prop of properties) {
      if (prop.lat && prop.lng) {
        propsWithCoords.push(prop);
        continue;
      }
      
      const address = prop.address || prop.Address;
      if (address) {
        const coords = await geocodeAddress(address);
        if (coords) {
          propsWithCoords.push({ ...prop, lat: coords.lat, lng: coords.lng });
        } else {
          propsWithCoords.push(prop);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        propsWithCoords.push(prop);
      }
    }
    
    setGeocodedProperties(propsWithCoords);
  };

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const getMarkerColor = (score: number): string => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    if (score >= 20) return '#3b82f6';
    return '#9ca3af';
  };

  const getFilteredProperties = (): Property[] => {
    if (trendFilter === 'all') return geocodedProperties.length > 0 ? geocodedProperties : properties;
    return (geocodedProperties.length > 0 ? geocodedProperties : properties).filter(p => p.balanceTrend === trendFilter);
  };

  const getAggregatedTrendData = () => {
    const filtered = getFilteredProperties();
    if (filtered.length === 0) return [];

    const yearlyTotals: { [key: string]: { year: string; total: number; count: number } } = {};
    
    filtered.forEach(property => {
      if (property.balanceHistory && property.balanceHistory.length > 0) {
        property.balanceHistory.forEach(entry => {
          if (!yearlyTotals[entry.year]) {
            yearlyTotals[entry.year] = { year: entry.year, total: 0, count: 0 };
          }
          yearlyTotals[entry.year].total += entry.amount;
          yearlyTotals[entry.year].count += 1;
        });
      }
    });

    return Object.values(yearlyTotals)
      .map(entry => ({
        year: entry.year,
        average: Math.round(entry.total / entry.count),
        total: Math.round(entry.total)
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  };

  const calculateMotivationScore = (property: Property): number => {
    let score = 0;
    const monthsSince = property.monthsSinceLastPayment || 0;
    const balance = parseFloat(String(property.currentBalance || property.totalOwed || 0));
    
    if (monthsSince >= 24) score += 35;
    else if (monthsSince >= 12) score += 28;
    else if (monthsSince >= 6) score += 17.5;
    else score += 7;

    if (balance >= 10000) score += 25;
    else if (balance >= 5000) score += 17.5;
    else if (balance >= 3000) score += 10;
    else score += 5;

    if (property.balanceTrend === 'increasing') score += 20;
    else if (property.balanceTrend === 'stable') score += 10;
    else if (property.balanceTrend === 'decreasing') score += 4;

    return Math.round(score);
  };

  const getMotivationLabel = (score: number) => {
    if (score >= 80) return { label: 'Very High', color: 'bg-red-100 text-red-800 border-red-300' };
    if (score >= 60) return { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    if (score >= 40) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    if (score >= 20) return { label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    return { label: 'Very Low', color: 'bg-gray-100 text-gray-800 border-gray-300' };
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
    return null;
  };

  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'J': return 'bg-red-100 text-red-800';
      case 'A': return 'bg-yellow-100 text-yellow-800';
      case 'P': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch(status) {
      case 'J': return 'Judgment';
      case 'A': return 'Active';
      case 'P': return 'Pending';
      default: return status;
    }
  };

  const getStatusChanges = () => {
    return properties
      .filter(prop => {
        // Include properties with status changes or new properties
        const currentStatus = prop.currentStatus || getStatus(prop);
        return (prop.previousStatus !== currentStatus) || 
               (prop.previousStatus === null && currentStatus !== null);
      })
      .map(prop => {
        const currentStatus = prop.currentStatus || getStatus(prop);
        const oldStatus = prop.previousStatus === null ? 'Blank' : prop.previousStatus;
        const newStatus = currentStatus === null ? 'Blank' : currentStatus;
        const isNew = prop.previousStatus === null && currentStatus !== null;
        
        return {
          property: prop,
          oldStatus,
          newStatus,
          isNew,
          transition: `${oldStatus} → ${newStatus}`,
          daysSinceChange: prop.daysSinceStatusChange || 0
        };
      });
  };

  const getFilteredStatusChanges = () => {
    let allChanges = getStatusChanges();
    
    // Filter by new status (J, A, P)
    if (statusChangeFilter.size < 3) {
      allChanges = allChanges.filter(c => {
        if (!c.newStatus || c.newStatus === 'Blank') return false;
        return statusChangeFilter.has(c.newStatus as 'J' | 'A' | 'P');
      });
    }
    
    return allChanges;
  };

  // Removed upload functionality - all files are uploaded in File History tab

  const exportProperties = () => {
    if (properties.length === 0) {
      alert('No properties to export');
      return;
    }

    const exportData = properties.map(prop => ({
      'Account Number': prop.accountNumber || prop['Account Number'] || '',
      'Motivation Score': prop.motivationScore || 0,
      'Owner': prop.owner || prop.Owner || '',
      'Address': prop.address || prop.Address || '',
      'Current Balance': prop.currentBalance || prop.totalOwed || 0,
      'Months Since Payment': prop.monthsSinceLastPayment || '',
      'Balance Trend': prop.balanceTrend || '',
      'Status': getStatus(prop) || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Properties');
    XLSX.writeFile(wb, `properties_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        localStorage.removeItem('property-tax-uploads');
        localStorage.removeItem('property-tax-properties');
        setUploads([]);
        setProperties([]);
        setGeocodedProperties([]);
        setSelectedProperty(null);
        alert('All data cleared successfully');
      } catch (error) {
        console.error('Error clearing data:', error);
      }
    }
  };

  if (loading && properties.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  const filteredProps = getFilteredProperties();
  const trendData = getAggregatedTrendData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={32} />
              <h1 className="text-2xl font-bold text-gray-900">Property Tax Intel</h1>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentPage('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'home' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Home size={20} />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('data')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'data' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Database size={20} />
                Manage Data
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Home Page / Dashboard */}
      {currentPage === 'home' && (
        <div className="max-w-7xl mx-auto p-6">
          {properties.length === 0 ? (
            <>
              {/* Stats Overview - Empty State */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <div className="text-sm text-gray-600 mb-1">Total Properties</div>
                  <div className="text-3xl font-bold text-gray-900">0</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <div className="text-sm text-gray-600 mb-1">High Priority (70+)</div>
                  <div className="text-3xl font-bold text-red-600">0</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <div className="text-sm text-gray-600 mb-1">Total Balance Owed</div>
                  <div className="text-2xl font-bold text-gray-900">$0</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <div className="text-sm text-gray-600 mb-1">Avg Motivation Score</div>
                  <div className="text-3xl font-bold text-purple-600">0</div>
                </div>
              </div>

              {/* Trend Filter and Graph - Empty State */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <h2 className="text-2xl font-bold text-gray-900">Balance Trends Analysis</h2>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setTrendFilter('all')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Filter size={16} />
                      All Properties
                    </button>
                    <button
                      onClick={() => setTrendFilter('increasing')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <TrendingUp size={16} />
                      Increasing (0)
                    </button>
                    <button
                      onClick={() => setTrendFilter('stable')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <Minus size={16} />
                      Stable (0)
                    </button>
                    <button
                      onClick={() => setTrendFilter('decreasing')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <TrendingDown size={16} />
                      Decreasing (0)
                    </button>
                  </div>
                </div>
                <div className="text-center py-12 text-gray-500">
                  Upload data to see balance trends
                </div>
              </div>

              {/* Map Section - Empty State */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Map className="text-green-600" size={24} />
                    <h2 className="text-2xl font-bold text-gray-900">Property Map</h2>
                  </div>
                </div>
                <div className="w-full h-96 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="mx-auto mb-2 text-gray-400" size={48} />
                    <p className="text-gray-600">Upload data to see properties on the map</p>
                  </div>
                </div>
              </div>

              {/* Empty State Message */}
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Yet</h3>
                <p className="text-gray-600 mb-4">
                  Upload property data to see your dashboard with maps and analytics
                </p>
                <button
                  onClick={() => setCurrentPage('data')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Go to Manage Data
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <div className="text-sm text-gray-600 mb-1">Total Properties</div>
                  <div className="text-3xl font-bold text-gray-900">{properties.length}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <div className="text-sm text-gray-600 mb-1">High Priority (70+)</div>
                  <div className="text-3xl font-bold text-red-600">
                    {properties.filter(p => (p.motivationScore || 0) >= 70).length}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <div className="text-sm text-gray-600 mb-1">Total Balance Owed</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${properties.reduce((sum, p) => sum + (parseFloat(String(p.currentBalance || p.totalOwed || 0))), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <div className="text-sm text-gray-600 mb-1">Avg Motivation Score</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(properties.reduce((sum, p) => sum + (p.motivationScore || 0), 0) / properties.length)}
                  </div>
                </div>
              </div>

              {/* Trend Filter and Graph */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <h2 className="text-2xl font-bold text-gray-900">Balance Trends Analysis</h2>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setTrendFilter('all')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Filter size={16} />
                      All Properties
                    </button>
                    <button
                      onClick={() => setTrendFilter('increasing')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'increasing'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <TrendingUp size={16} />
                      Increasing ({properties.filter(p => p.balanceTrend === 'increasing').length})
                    </button>
                    <button
                      onClick={() => setTrendFilter('stable')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'stable'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Minus size={16} />
                      Stable ({properties.filter(p => p.balanceTrend === 'stable').length})
                    </button>
                    <button
                      onClick={() => setTrendFilter('decreasing')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'decreasing'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <TrendingDown size={16} />
                      Decreasing ({properties.filter(p => p.balanceTrend === 'decreasing').length})
                    </button>
                  </div>
                </div>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => `$${value.toLocaleString()}`}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="average" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Average Balance"
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No trend data available for this filter
                  </div>
                )}
              </div>

              {/* Map Section */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Map className="text-green-600" size={24} />
                    <h2 className="text-2xl font-bold text-gray-900">Property Map</h2>
                  </div>
                  <div className="text-sm text-gray-600">
                    Click markers to view property details
                  </div>
                </div>

                {/* Map Legend */}
                <div className="mb-4 flex gap-4 items-center text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Very High (80+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span>High (60-79)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Medium (40-59)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Low (20-39)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span>Very Low (0-19)</span>
                  </div>
                </div>

                {/* Google Maps */}
                <div className="w-full h-96 bg-gray-100 rounded-lg border border-gray-300 overflow-hidden">
                  {mapLoaded ? (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={mapZoom}
                      onLoad={onMapLoad}
                      options={{
                        streetViewControl: true,
                        mapTypeControl: true,
                        fullscreenControl: true,
                      }}
                    >
                      {filteredProps.filter(p => p.lat && p.lng).map((prop, idx) => {
                        const score = prop.motivationScore || 0;
                        return (
                          <Marker
                            key={idx}
                            position={{ lat: prop.lat!, lng: prop.lng! }}
                            onClick={() => {
                              setSelectedProperty(prop);
                              setMapCenter({ lat: prop.lat!, lng: prop.lng! });
                              setMapZoom(15);
                            }}
                            icon={{
                              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                              scaledSize: new window.google.maps.Size(32, 32),
                            }}
                          >
                            {selectedProperty && (selectedProperty.accountNumber || selectedProperty['Account Number']) === (prop.accountNumber || prop['Account Number']) && (
                              <InfoWindow
                                onCloseClick={() => setSelectedProperty(null)}
                              >
                                <div className="p-2">
                                  <p className="font-semibold text-sm">{prop.owner || prop.Owner || 'Unknown'}</p>
                                  <p className="text-xs text-gray-600 mt-1">{prop.address || prop.Address || 'No address'}</p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Score: <span className="font-bold">{score}</span> | Balance: ${parseFloat(String(prop.currentBalance || prop.totalOwed || 0)).toLocaleString()}
                                  </p>
                                  <button
                                    onClick={() => setSelectedProperty(prop)}
                                    className="mt-2 text-xs text-blue-600 hover:underline"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </InfoWindow>
                            )}
                          </Marker>
                        );
                      })}
                    </GoogleMap>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Map className="mx-auto mb-2 text-gray-400" size={48} />
                        <p className="text-gray-600">Loading map...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hovered Property Info */}
                {hoveredProperty && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {hoveredProperty.owner || hoveredProperty.Owner || 'Unknown Owner'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {hoveredProperty.address || hoveredProperty.Address || 'No address'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-lg font-bold ${
                          getMotivationLabel(hoveredProperty.motivationScore || 0).color
                        }`}>
                          Score: {hoveredProperty.motivationScore || 0}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          ${parseFloat(String(hoveredProperty.currentBalance || hoveredProperty.totalOwed || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Properties List */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Top 10 Priority Leads</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Owner</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Trend</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {properties.slice(0, 10).map((prop, idx) => {
                        const scoreData = getMotivationLabel(prop.motivationScore || 0);
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-900">#{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className={`px-3 py-1 text-sm font-bold rounded-lg border-2 inline-block ${scoreData.color}`}>
                                {prop.motivationScore || 0}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {prop.owner || prop.Owner || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {prop.address || prop.Address || 'No address'}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              ${parseFloat(String(prop.currentBalance || prop.totalOwed || 0)).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              {prop.balanceTrend === 'increasing' && (
                                <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                                  <TrendingUp size={14} /> Increasing
                                </span>
                              )}
                              {prop.balanceTrend === 'stable' && (
                                <span className="flex items-center gap-1 text-yellow-600 text-xs font-semibold">
                                  <Minus size={14} /> Stable
                                </span>
                              )}
                              {prop.balanceTrend === 'decreasing' && (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                                  <TrendingDown size={14} /> Decreasing
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedProperty(prop)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Data Management Page */}
      {currentPage === 'data' && (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Management</h2>
            
            <div className="flex gap-4 items-center flex-wrap mb-6">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
                <FileText size={20} />
                <span>Properties loaded from File History</span>
                <span className="text-xs">Upload files in the File History tab</span>
              </label>
              {properties.length > 0 && (
                <>
                  <button
                    onClick={exportProperties}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Download size={20} />
                    Export All Data
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-blue-600 font-semibold text-sm">Total Uploads</div>
                <div className="text-3xl font-bold text-blue-900">{uploads.length}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-green-600 font-semibold text-sm">Total Properties</div>
                <div className="text-3xl font-bold text-green-900">{properties.length}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-red-600 font-semibold text-sm">High Motivation (70+)</div>
                <div className="text-3xl font-bold text-red-900">
                  {properties.filter(p => (p.motivationScore || 0) >= 70).length}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-purple-600 font-semibold text-sm">Last Upload</div>
                <div className="text-lg font-bold text-purple-900">
                  {uploads.length > 0 ? uploads[uploads.length - 1].date : 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Status Changes Panel */}
          {properties.length > 0 && (
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Properties with New Status
                      <span className="ml-2 text-sm font-normal text-gray-500">({getStatusChanges().length || properties.filter(p => getStatus(p)).length})</span>
                    </h2>
                    <p className="text-xs text-gray-600 mt-1">
                      {getStatusChanges().length > 0 
                        ? 'These properties have received a new J, A, or P status since the last upload'
                        : 'Properties with J, A, or P status'}
                    </p>
                  </div>
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
                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
                    <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Filter by New Status</h4>
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
                              if (isSelected) {
                                newFilter.delete(status);
                              } else {
                                newFilter.add(status);
                              }
                              setStatusChangeFilter(newFilter);
                            }}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                              isSelected
                                ? status === 'J'
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : status === 'A'
                                  ? 'bg-yellow-600 text-white shadow-sm'
                                  : 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            {status === 'J' ? 'Judgment' : status === 'A' ? 'Active' : 'Pending'} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Changes Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ tableLayout: 'fixed', maxWidth: '100%' }}>
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '15%' }}>Property ID</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '12%' }}>Previous Status</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '12%' }}>New Status</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '40%' }}>Additional Details</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '10%' }}>Days</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '11%' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getFilteredStatusChanges().length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                              No properties match the selected filters. Try selecting different status filters.
                            </td>
                          </tr>
                        ) : (
                          getFilteredStatusChanges().map((change, idx) => {
                          const prop = change.property;
                          const propertyId = prop.propertyId || prop['Property ID'] || prop['Account Number'] || prop.accountNumber || 'N/A';
                          const requestSeq = prop['Request Seq.'] || prop['Request Seq'] || '';
                          const empty1 = prop['__EMPTY'] || '';
                          const empty2 = prop['__EMPTY_1'] || '';
                          const county = prop['BEXAR COUNTY'] || prop['County'] || 'BEXAR COUNTY';
                          const address = prop.address || prop.Address || '';
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-900 font-mono">{propertyId}</td>
                              <td className="px-3 py-2">
                                {change.oldStatus === 'Blank' ? (
                                  <span className="text-xs text-gray-400">None</span>
                                ) : (
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(change.oldStatus)}`}>
                                    {getStatusLabel(change.oldStatus)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {change.newStatus === 'Blank' ? (
                                  <span className="text-xs text-gray-400">None</span>
                                ) : (
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    change.newStatus === 'J' ? 'bg-red-100 text-red-800' :
                                    change.newStatus === 'A' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {change.newStatus === 'J' ? 'Judgment (J)' :
                                     change.newStatus === 'A' ? 'Active (A)' :
                                     'Pending Judgment (P)'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-600">
                                <div className="space-y-0.5">
                                  {requestSeq && <div>Request Seq.: {requestSeq}</div>}
                                  {empty1 && <div>__EMPTY: {empty1}</div>}
                                  {empty2 && <div>__EMPTY_1: {empty2}</div>}
                                  {county && <div>{county}</div>}
                                  {address && <div>{address}</div>}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-600">
                                {change.daysSinceChange === 0 ? 'Today' : `${change.daysSinceChange} day${change.daysSinceChange !== 1 ? 's' : ''} ago`}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => setSelectedProperty(prop)}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {properties.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">All Properties</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Account #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Owner/Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Previous Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Current Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Days Since Change</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      // Pagination logic
                      const filteredProperties = getFilteredStatusChanges();
                      const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
                      const startIndex = (currentPageNum - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedProperties = filteredProperties.slice(startIndex, endIndex);
                      
                      return paginatedProperties.map((prop, idx) => {
                      const accountNum = prop.accountNumber || prop['Account Number'];
                      const owner = prop.owner || prop.Owner || 'Unknown';
                      const address = prop.address || prop.Address || '';
                      const balance = prop.currentBalance || prop.totalOwed || prop['Total Owed'] || prop.Balance || 0;
                      const currentStatus = prop.currentStatus || getStatus(prop);
                      const previousStatus = prop.previousStatus;
                      const daysSinceChange = prop.daysSinceStatusChange ?? null;
                      const scoreData = getMotivationLabel(prop.motivationScore || 0);
                      const hasStatusChange = previousStatus !== null && previousStatus !== currentStatus;
                      return (
                        <tr key={idx} className={`hover:bg-gray-50 ${hasStatusChange ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className={`px-3 py-1 text-sm font-bold rounded-lg border-2 inline-block ${scoreData.color}`}>
                              {prop.motivationScore || 0}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                            {accountNum || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="font-semibold">{owner}</div>
                            <div className="text-xs text-gray-600">{address}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            ${parseFloat(String(balance)).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {previousStatus ? (
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(previousStatus)}`}>
                                {getStatusLabel(previousStatus)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {currentStatus ? (
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(currentStatus)}`}>
                                {getStatusLabel(currentStatus)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {daysSinceChange !== null ? (
                              <span className={`text-xs font-medium ${hasStatusChange ? 'text-orange-600' : 'text-gray-600'}`}>
                                {daysSinceChange === 0 ? 'Today' : `${daysSinceChange} day${daysSinceChange !== 1 ? 's' : ''} ago`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedProperty(prop)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                </table>
                
                {/* Pagination Controls for All Properties */}
                {(() => {
                  const totalPages = Math.ceil(properties.length / itemsPerPage);
                  const startIndex = (currentPageNum - 1) * itemsPerPage;
                  const endIndex = Math.min(startIndex + itemsPerPage, properties.length);
                  
                  if (totalPages <= 1) return null;
                  
                  return (
                    <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-700">
                          Showing {startIndex + 1} to {endIndex} of {properties.length} properties
                        </span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPageNum(1);
                          }}
                          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                          <option value={200}>200 per page</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPageNum(1)}
                          disabled={currentPageNum === 1}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          First
                        </button>
                        <button
                          onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
                          disabled={currentPageNum === 1}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-1.5 text-sm text-gray-700">
                          Page {currentPageNum} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))}
                          disabled={currentPageNum === totalPages}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => setCurrentPageNum(totalPages)}
                          disabled={currentPageNum === totalPages}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Start</h3>
              <p className="text-gray-600 mb-4">
                Upload an Excel file in the <strong>File History</strong> tab to get started
              </p>
              <p className="text-sm text-gray-500">
                All tabs share the same data - upload once in File History, use everywhere
              </p>
            </div>
          )}
        </div>
      )}

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Property Details</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Account: {selectedProperty.accountNumber || selectedProperty['Account Number'] || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Motivation Score</div>
                      <div className="text-4xl font-bold text-gray-900">{selectedProperty.motivationScore || 0}/100</div>
                      <div className="text-sm font-semibold text-blue-600 mt-1">
                        {getMotivationLabel(selectedProperty.motivationScore || 0).label} Priority
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={18} className="text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">Current Balance</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${parseFloat(String(selectedProperty.currentBalance || selectedProperty.totalOwed || 0)).toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={18} className="text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Owner</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedProperty.owner || selectedProperty.Owner || 'Unknown'}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Map size={18} className="text-orange-600" />
                    <span className="text-sm font-semibold text-gray-700">Address</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedProperty.address || selectedProperty.Address || 'No address'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedProperty(null)}
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
  );
}
