import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, TrendingUp, Map, Filter, TrendingDown, Minus, Navigation, CheckCircle, X } from 'lucide-react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { loadSharedProperties } from '../utils/sharedData';
import { getPropertyStatus as getPropertyStatusUtil } from '../utils/fileProcessor';
import gcsStorage from '../services/gcsStorage';

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

interface Property {
  [key: string]: any;
  id?: string | number;
  accountNumber?: string;
  owner?: string;
  address?: string;
  currentBalance?: number;
  totalOwed?: number;
  motivationScore?: number;
  balanceTrend?: 'increasing' | 'stable' | 'decreasing';
  balanceHistory?: Array<{ year: string; amount: number }>;
  currentStatus?: 'J' | 'A' | 'P' | null;
  previousStatus?: 'J' | 'A' | 'P' | null;
  statusChangeDate?: string;
  daysSinceStatusChange?: number;
  lat?: number;
  lng?: number;
}

export default function PropertyDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendFilter, setTrendFilter] = useState<'all' | 'increasing' | 'stable' | 'decreasing'>('all');
  const [statusFilter, setStatusFilter] = useState<Set<'J' | 'A' | 'P'>>(new Set(['J', 'A', 'P']));
  const [statusChangeFilter, setStatusChangeFilter] = useState<Set<'J' | 'A' | 'P'>>(new Set(['J', 'A', 'P']));
  const [transitionFilter, setTransitionFilter] = useState<string | null>(null); // 'blank-to-p', 'p-to-a', 'a-to-j', 'j-to-deleted'
  const [showStatusChanges, setShowStatusChanges] = useState(true);
  const [deadLeads, setDeadLeads] = useState<any[]>([]); // Properties that were J and got removed
  const [mapCenter, setMapCenter] = useState({ lat: 29.4241, lng: -98.4936 });
  const [mapZoom, setMapZoom] = useState(11);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geocodedProperties, setGeocodedProperties] = useState<Property[]>([]);
  
  // Use shared utility function
  const getPropertyStatus = (prop: Property): string | null => {
    return getPropertyStatusUtil(prop);
  };

  useEffect(() => {
    loadData();
    
    // Listen for property updates
    const handlePropertiesUpdated = (event: CustomEvent) => {
      loadData();
    };
    
    window.addEventListener('propertiesUpdated', handlePropertiesUpdated as EventListener);
    return () => {
      window.removeEventListener('propertiesUpdated', handlePropertiesUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    if (properties.length > 0) {
      geocodeProperties();
    }
  }, [properties]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { properties: sharedProps } = await loadSharedProperties();
      setProperties(sharedProps);
      console.log(`✅ Property Dashboard loaded ${sharedProps.length} properties`);
      
      // Load comparison report to get dead leads (J to deleted)
      try {
        const comparisonResult = await gcsStorage.loadComparisonReport();
        if (comparisonResult && comparisonResult.report && comparisonResult.report.foreclosedProperties) {
          setDeadLeads(comparisonResult.report.foreclosedProperties);
          console.log(`✅ Loaded ${comparisonResult.report.foreclosedProperties.length} dead leads from comparison report`);
        }
      } catch (error) {
        console.log('No comparison report available:', error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
      
      const address = prop.address || prop.Address || prop.ADDRSTRING;
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
    let filtered = geocodedProperties.length > 0 ? geocodedProperties : properties;
    
    // Filter by status (J, A, P)
    if (statusFilter.size < 3) {
      filtered = filtered.filter(p => {
        const status = p.currentStatus || getPropertyStatus(p);
        return status && statusFilter.has(status as 'J' | 'A' | 'P');
      });
    }
    
    // Filter by trend
    if (trendFilter !== 'all') {
      filtered = filtered.filter(p => p.balanceTrend === trendFilter);
    }
    
    return filtered;
  };

  const getStatusChanges = () => {
    return properties
      .filter(prop => {
        const currentStatus = prop.currentStatus || getPropertyStatus(prop);
        return (prop.previousStatus !== currentStatus) || 
               (prop.previousStatus === null && currentStatus !== null);
      })
      .map(prop => {
        const currentStatus = prop.currentStatus || getPropertyStatus(prop);
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
    
    // Filter by transition type (Blank→P, P→A, A→J, J→Deleted)
    if (transitionFilter) {
      allChanges = allChanges.filter(c => {
        const transition = `${c.oldStatus} → ${c.newStatus}`.toLowerCase();
        switch (transitionFilter) {
          case 'blank-to-p':
            return c.oldStatus === 'Blank' && c.newStatus === 'P';
          case 'p-to-a':
            return c.oldStatus === 'P' && c.newStatus === 'A';
          case 'a-to-j':
            return c.oldStatus === 'A' && c.newStatus === 'J';
          case 'j-to-deleted':
            // This will be handled separately with deadLeads
            return false;
          default:
            return true;
        }
      });
    }
    
    // Filter by new status (J, A, P) - only if transition filter is not active
    if (!transitionFilter && statusChangeFilter.size < 3) {
      allChanges = allChanges.filter(c => {
        if (!c.newStatus || c.newStatus === 'Blank') return false;
        return statusChangeFilter.has(c.newStatus as 'J' | 'A' | 'P');
      });
    }
    
    return allChanges;
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

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Optimize route using nearest neighbor algorithm (TSP approximation)
  const optimizeRoute = (properties: Property[]): Property[] => {
    if (properties.length <= 1) return properties;
    
    const optimized: Property[] = [];
    const remaining = [...properties];
    
    // Start with the first property (or could use center point)
    let current = remaining.shift()!;
    optimized.push(current);
    
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      
      // Find the nearest unvisited property
      for (let i = 0; i < remaining.length; i++) {
        const distance = calculateDistance(
          current.lat!,
          current.lng!,
          remaining[i].lat!,
          remaining[i].lng!
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
      
      current = remaining.splice(nearestIndex, 1)[0];
      optimized.push(current);
    }
    
    return optimized;
  };

  const createRoute = (statuses?: ('J' | 'A' | 'P')[]) => {
    let propertiesToRoute = getFilteredProperties();
    
    if (statuses && statuses.length > 0) {
      propertiesToRoute = propertiesToRoute.filter(p => {
        const status = p.currentStatus || getPropertyStatus(p);
        return status && statuses.includes(status as 'J' | 'A' | 'P');
      });
    }
    
    const propertiesWithCoords = propertiesToRoute.filter(p => p.lat && p.lng);
    
    if (propertiesWithCoords.length === 0) {
      alert('No properties with valid locations to route');
      return;
    }

    // Optimize the route order
    const optimizedProperties = optimizeRoute(propertiesWithCoords);
    
    // Google Maps has a limit of 25 waypoints (excluding start/end)
    const MAX_WAYPOINTS = 25;
    
    if (optimizedProperties.length <= MAX_WAYPOINTS) {
      // Single route for all properties
      const waypoints = optimizedProperties
        .map(p => `${p.lat},${p.lng}`)
        .join('/');
      const url = `https://www.google.com/maps/dir/${waypoints}`;
      window.open(url, '_blank');
    } else {
      // Split into multiple routes
      const routeCount = Math.ceil(optimizedProperties.length / MAX_WAYPOINTS);
      const message = `You have ${optimizedProperties.length} properties to route. Google Maps allows up to 25 waypoints per route.\n\nWould you like to create ${routeCount} optimized routes?`;
      
      if (confirm(message)) {
        // Create multiple routes
        for (let i = 0; i < routeCount; i++) {
          const start = i * MAX_WAYPOINTS;
          const end = Math.min(start + MAX_WAYPOINTS, optimizedProperties.length);
          const routeProperties = optimizedProperties.slice(start, end);
          
          const waypoints = routeProperties
            .map(p => `${p.lat},${p.lng}`)
            .join('/');
          const url = `https://www.google.com/maps/dir/${waypoints}`;
          
          // Open first route immediately, others after a short delay
          if (i === 0) {
            window.open(url, '_blank');
          } else {
            setTimeout(() => window.open(url, '_blank'), i * 500);
          }
        }
      }
    }
  };

  const toggleStatusFilter = (status: 'J' | 'A' | 'P') => {
    const newFilter = new Set(statusFilter);
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
    setStatusFilter(newFilter);
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
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Yet</h3>
            <p className="text-gray-600 mb-4">
              Upload property data in the File History tab to see your dashboard
            </p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="text-sm text-gray-600 mb-1">Total Properties</div>
                <div className="text-3xl font-bold text-gray-900">{properties.length}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                <div className="text-sm text-gray-600 mb-1">Judgment (J)</div>
                <div className="text-3xl font-bold text-red-600">
                  {properties.filter(p => getPropertyStatus(p) === 'J').length}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                <div className="text-sm text-gray-600 mb-1">Active (A)</div>
                <div className="text-3xl font-bold text-yellow-600">
                  {properties.filter(p => getPropertyStatus(p) === 'A').length}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="text-sm text-gray-600 mb-1">Pending (P)</div>
                <div className="text-3xl font-bold text-blue-600">
                  {properties.filter(p => getPropertyStatus(p) === 'P').length}
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
                        <span className="ml-2 text-sm font-normal text-gray-500">({getStatusChanges().length})</span>
                      </h2>
                      <p className="text-xs text-gray-600 mt-1">
                        These properties have received a new J, A, or P status since the last upload
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
                    {/* Status Filter */}
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
                          const count = properties.filter(p => {
                            const propStatus = p.currentStatus || getPropertyStatus(p);
                            return propStatus === status;
                          }).length;
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
                          {transitionFilter === 'j-to-deleted' ? (
                            // Show dead leads (J to deleted)
                            deadLeads.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                                  No dead leads found (no Judgment properties were removed).
                                </td>
                              </tr>
                            ) : (
                              deadLeads.map((lead, idx) => (
                                <tr key={idx} className="hover:bg-red-50">
                                  <td className="px-3 py-2 text-xs text-gray-900">{lead.identifier || lead.CAN || 'N/A'}</td>
                                  <td className="px-3 py-2">
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">Judgment (J)</span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">Deleted/New Owner</span>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600">
                                    <div className="space-y-1">
                                      <div><strong>Address:</strong> {lead.address || 'N/A'}</div>
                                      {lead.CAN && <div><strong>CAN:</strong> {lead.CAN}</div>}
                                      <div className="text-red-600 font-semibold">⚠️ Foreclosed or New Owner - Lead No Longer Valid</div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-500">N/A</td>
                                  <td className="px-3 py-2">
                                    <span className="text-xs text-gray-400">N/A</span>
                                  </td>
                                </tr>
                              ))
                            )
                          ) : getFilteredStatusChanges().length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                                No properties match the selected filters.
                              </td>
                            </tr>
                          ) : (
                            getFilteredStatusChanges().map((change, idx) => {
                            const prop = change.property;
                            const propertyId = prop.CAN || prop.propertyId || prop['Property ID'] || prop['Account Number'] || prop.accountNumber || 'N/A';
                            const pnumber = prop.Pnumber || prop['Pnumber'] || '';
                            const pstrname = prop.PSTRNAME || prop['PSTRNAME'] || '';
                            const legalstatus = prop.LEGALSTATUS || prop['LEGALSTATUS'] || '';
                            const tot_percan = prop.TOT_PERCAN || prop['TOT_PERCAN'] || '';
                            const addrstring = prop.ADDRSTRING || prop['ADDRSTRING'] || prop.address || prop.Address || '';
                            const zipCode = prop.ZIP_CODE || prop['ZIP_CODE'] || prop.zipCode || '';
                            
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
                                <td className="px-3 py-2 text-xs text-gray-700">
                                  <div className="space-y-1">
                                    {pnumber && <div><strong>Pnumber (Q):</strong> {pnumber}</div>}
                                    {pstrname && <div><strong>PSTRNAME (R):</strong> {pstrname}</div>}
                                    {legalstatus && <div><strong>LEGALSTATUS (AE):</strong> {legalstatus}</div>}
                                    {tot_percan && <div><strong>TOT_PERCAN (BE):</strong> {tot_percan}</div>}
                                    {addrstring && <div><strong>Address (H):</strong> {addrstring}</div>}
                                    {zipCode && <div><strong>ZIP (I):</strong> {zipCode}</div>}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-600">
                                  {change.daysSinceChange === 0 ? 'Today' : `${change.daysSinceChange} day${change.daysSinceChange !== 1 ? 's' : ''} ago`}
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => {
                                      setSelectedProperty(prop);
                                      if (prop.lat && prop.lng) {
                                        setMapCenter({ lat: prop.lat, lng: prop.lng });
                                        setMapZoom(15);
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                  >
                                    View Map
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

            {/* Map and Route Planning */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Map className="text-green-600" size={24} />
                  <h2 className="text-2xl font-bold text-gray-900">Property Map</h2>
                </div>
                <div className="flex gap-2">
                  {/* Status Filter for Map */}
                  <div className="flex gap-2 border-r border-gray-300 pr-2 mr-2">
                    {(['J', 'A', 'P'] as const).map((status) => {
                      const count = properties.filter(p => getPropertyStatus(p) === status).length;
                      const isSelected = statusFilter.has(status);
                      return (
                        <button
                          key={status}
                          onClick={() => toggleStatusFilter(status)}
                          className={`px-3 py-2 rounded-md text-xs font-semibold transition ${
                            isSelected
                              ? status === 'J'
                                ? 'bg-red-600 text-white'
                                : status === 'A'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-blue-600 text-white'
                              : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {status === 'J' ? 'Judgment' : status === 'A' ? 'Active' : 'Pending'} ({count})
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Route Creation Buttons */}
                  <button
                    onClick={() => createRoute(['J', 'A', 'P'])}
                    disabled={filteredProps.filter(p => p.lat && p.lng).length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                    title="Create optimized route for all filtered properties (minimizes travel distance)"
                  >
                    <Navigation className="w-4 h-4" />
                    Create Optimized Route ({filteredProps.filter(p => p.lat && p.lng).length})
                  </button>
                </div>
              </div>

              {/* Google Maps */}
              <div className="w-full h-[500px] bg-gray-100 rounded-lg border border-gray-300 overflow-hidden">
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
                      const status = prop.currentStatus || getPropertyStatus(prop);
                      let iconColor = 'red';
                      if (status === 'J') iconColor = 'red';
                      else if (status === 'A') iconColor = 'yellow';
                      else if (status === 'P') iconColor = 'green';
                      
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
                            url: `http://maps.google.com/mapfiles/ms/icons/${iconColor}-dot.png`,
                            scaledSize: new window.google.maps.Size(32, 32),
                          }}
                        >
                          {selectedProperty && (selectedProperty.accountNumber || selectedProperty['Account Number']) === (prop.accountNumber || prop['Account Number']) && (
                            <InfoWindow
                              onCloseClick={() => setSelectedProperty(null)}
                            >
                              <div className="p-2">
                                <p className="font-semibold text-sm">{prop.owner || prop.Owner || 'Unknown'}</p>
                                <p className="text-xs text-gray-600 mt-1">{prop.address || prop.Address || prop.ADDRSTRING || 'No address'}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Status: <span className="font-bold">{status || 'N/A'}</span>
                                </p>
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

            {/* Trend Graph */}
            {trendData.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Balance Trends Analysis</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTrendFilter('all')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Filter size={16} />
                      All Trends
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
                      Increasing
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
                      Stable
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
                      Decreasing
                    </button>
                  </div>
                </div>
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
              </div>
            )}
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
                      Account: {selectedProperty.accountNumber || selectedProperty['Account Number'] || selectedProperty.CAN || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Owner</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {selectedProperty.owner || selectedProperty.Owner || selectedProperty.PSTRNAME || 'Unknown'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Address</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {selectedProperty.address || selectedProperty.Address || selectedProperty.ADDRSTRING || 'No address'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Status</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {selectedProperty.currentStatus || getPropertyStatus(selectedProperty) || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Balance</div>
                    <div className="text-sm font-semibold text-gray-900">
                      ${parseFloat(String(selectedProperty.currentBalance || selectedProperty.totalOwed || 0)).toLocaleString()}
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
                  {selectedProperty.lat && selectedProperty.lng && (
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedProperty.lat},${selectedProperty.lng}`, '_blank')}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      Navigate
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

