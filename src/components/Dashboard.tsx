import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, TrendingUp, Map, Filter, TrendingDown, Minus, DollarSign, Users } from 'lucide-react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

interface Property {
  [key: string]: any;
  accountNumber?: string;
  owner?: string;
  address?: string;
  currentBalance?: number;
  totalOwed?: number;
  motivationScore?: number;
  balanceTrend?: 'increasing' | 'stable' | 'decreasing';
  balanceHistory?: Array<{ year: string; amount: number }>;
  lat?: number;
  lng?: number;
}

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendFilter, setTrendFilter] = useState<'all' | 'increasing' | 'stable' | 'decreasing'>('all');
  const [mapCenter, setMapCenter] = useState({ lat: 29.4241, lng: -98.4936 });
  const [mapZoom, setMapZoom] = useState(11);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geocodedProperties, setGeocodedProperties] = useState<Property[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (properties.length > 0) {
      geocodeProperties();
    }
  }, [properties]);

  const loadData = () => {
    try {
      const savedProperties = localStorage.getItem('property-tax-properties');
      if (savedProperties) {
        const parsedProps = JSON.parse(savedProperties);
        setProperties(parsedProps);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!window.google || !window.google.maps) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              'User-Agent': 'PropertyDashboard/1.0'
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

  const getMotivationLabel = (score: number) => {
    if (score >= 80) return { label: 'Very High', color: 'bg-red-100 text-red-800 border-red-300' };
    if (score >= 60) return { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    if (score >= 40) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    if (score >= 20) return { label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    return { label: 'Very Low', color: 'bg-gray-100 text-gray-800 border-gray-300' };
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
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
    </div>
  );
}

