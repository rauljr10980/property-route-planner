import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, TrendingUp, Map, Filter, TrendingDown, Minus, CheckCircle, ChevronDown, Navigation } from 'lucide-react';
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
  const [comparisonReport, setComparisonReport] = useState<any>({
    summary: {
      newPropertiesCount: 0, removedPropertiesCount: 0, statusChangesCount: 0,
      totPercanChangesCount: 0, legalStatusChangesCount: 0, foreclosedPropertiesCount: 0,
      totalPropertiesInNewFile: 0, totalPropertiesInPreviousFile: 0
    },
    newProperties: [], removedProperties: [], foreclosedProperties: [],
    statusChanges: [], totPercanChanges: [], legalStatusChanges: []
  });
  const [showComparisonReport, setShowComparisonReport] = useState(true);
  const [changeFilter, setChangeFilter] = useState<'all' | 'status' | 'totpercan' | 'legalstatus'>('all');
  const [previousStatusFilter, setPreviousStatusFilter] = useState<'all' | 'J' | 'A' | 'P' | 'new'>('all');
  const [selectedBreakdownTransition, setSelectedBreakdownTransition] = useState<string | null>(null); // For filtering by clicked transition
  const [statusChangesPage, setStatusChangesPage] = useState(1); // Pagination for status changes table
  const statusChangesPerPage = 250; // Items per page (constant)
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
      
      // Load comparison report to get dead leads and full report
      try {
        const comparisonResult = await gcsStorage.loadComparisonReport();
        if (comparisonResult && comparisonResult.report) {
          setComparisonReport(comparisonResult.report);
          if (comparisonResult.report.foreclosedProperties) {
            setDeadLeads(comparisonResult.report.foreclosedProperties);
          }
        } else {
          // Initialize with empty report structure if none exists
          setComparisonReport({
            summary: {
              newPropertiesCount: 0, removedPropertiesCount: 0, statusChangesCount: 0,
              totPercanChangesCount: 0, legalStatusChangesCount: 0, foreclosedPropertiesCount: 0,
              totalPropertiesInNewFile: 0, totalPropertiesInPreviousFile: 0
            },
            newProperties: [], removedProperties: [], foreclosedProperties: [],
            statusChanges: [], totPercanChanges: [], legalStatusChanges: []
          });
        }
      } catch (error) {
        console.log('No comparison report available:', error);
        // Initialize with empty report on error
        setComparisonReport({
          summary: {
            newPropertiesCount: 0, removedPropertiesCount: 0, statusChangesCount: 0,
            totPercanChangesCount: 0, legalStatusChangesCount: 0, foreclosedPropertiesCount: 0,
            totalPropertiesInNewFile: 0, totalPropertiesInPreviousFile: 0
          },
          newProperties: [], removedProperties: [], foreclosedProperties: [],
          statusChanges: [], totPercanChanges: [], legalStatusChanges: []
        });
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
    // If a breakdown transition is selected, use comparison report data directly
    if (selectedBreakdownTransition && comparisonReport && comparisonReport.statusChanges) {
      const normalizedSelected = selectedBreakdownTransition.replace(/\s+/g, '');
      
      // Filter comparison report statusChanges by the selected transition
      const filtered = comparisonReport.statusChanges.filter((sc: any) => {
        const changeType = sc.changeType || `${sc.oldStatus || 'Blank'}→${sc.newStatus || 'Blank'}`;
        const normalizedChangeType = changeType.replace(/\s+/g, '');
        
        // Handle "NEW" without target status - match all new properties
        // "NEW" means oldStatus is null/undefined/Blank and there's a newStatus
        // Also match "NEW→P", "NEW→A", "NEW→J" etc. when filtering by just "NEW"
        if (normalizedSelected === 'NEW') {
          // Match items with changeType exactly "NEW" or starting with "NEW→"
          if (normalizedChangeType === 'NEW' || normalizedChangeType.startsWith('NEW→')) {
            return true;
          }
          // Also match items where oldStatus is null/undefined/Blank
          const isNew = (sc.oldStatus === null || sc.oldStatus === undefined || sc.oldStatus === 'Blank' || sc.oldStatus === '') && 
                        sc.newStatus && sc.newStatus !== 'Blank' && sc.newStatus !== null && sc.newStatus !== undefined;
          return isNew;
        }
        
        return normalizedChangeType === normalizedSelected;
      });
      
      // Convert comparison report format to getStatusChanges format
      return filtered.map((sc: any) => {
        // Use the property from statusChange if available, otherwise find it from properties array
        let prop = sc.property;
        
        // If property is not in statusChange, try to find it from properties array
        if (!prop || Object.keys(prop).length === 0) {
          prop = properties.find(p => {
            const can = p.CAN || p['CAN'] || p.propertyId || p['Property ID'] || p.id;
            const scCan = sc.CAN || sc.identifier || sc.property?.CAN || sc.property?.id;
            return can && scCan && String(can).trim() === String(scCan).trim();
          });
        }
        
        // If still not found, create a minimal property object from statusChange data
        if (!prop || Object.keys(prop).length === 0) {
          prop = {
            CAN: sc.CAN || sc.identifier,
            ADDRSTRING: sc.address,
            id: sc.identifier || sc.CAN,
            currentStatus: sc.newStatus,
            previousStatus: sc.oldStatus
          };
        }
        
        const currentStatus = prop.currentStatus || getPropertyStatus(prop) || sc.newStatus;
        const oldStatus = sc.oldStatus === null || sc.oldStatus === undefined ? 'Blank' : sc.oldStatus;
        const newStatus = currentStatus === null ? 'Blank' : currentStatus;
        
        return {
          property: prop,
          oldStatus,
          newStatus,
          isNew: oldStatus === 'Blank' && newStatus !== 'Blank',
          transition: `${oldStatus} → ${newStatus}`,
          daysSinceChange: sc.daysSinceChange || prop.daysSinceStatusChange || 0
        };
      });
    }
    
    let allChanges = getStatusChanges();
    
    // Filter by breakdown transition (from comparison report changeType format like "P→A")
    if (selectedBreakdownTransition) {
      allChanges = allChanges.filter(c => {
        // Normalize: remove spaces from selected transition
        const normalizedSelected = selectedBreakdownTransition.replace(/\s+/g, '');
        
        // Handle case where changeType is just "NEW" (without target status)
        // This means all new properties (oldStatus is Blank/null)
        if (normalizedSelected === 'NEW' && (c.oldStatus === 'Blank' || c.oldStatus === null)) {
          return true;
        }
        
        // Convert our transition format "P → A" to changeType format "P→A"
        const changeType = `${c.oldStatus}→${c.newStatus}`;
        // Handle special cases: Blank/null becomes "NEW" or "REMOVED_STATUS"
        const normalizedChangeType = c.oldStatus === 'Blank' || c.oldStatus === null ? 
          (c.newStatus ? `NEW→${c.newStatus}` : 'REMOVED_STATUS') :
          (c.newStatus === 'Blank' || c.newStatus === null ? 'REMOVED_STATUS' : changeType);
        
        const normalizedChangeTypeNoSpaces = normalizedChangeType.replace(/\s+/g, '');
        const changeTypeNoSpaces = changeType.replace(/\s+/g, '');
        
        // Match: "NEW→P" or "Blank→P" from comparison report should match "Blank→P" from getStatusChanges
        // Also handle case where comparison report might use "Blank→P" instead of "NEW→P"
        if (normalizedSelected.startsWith('NEW→') && (c.oldStatus === 'Blank' || c.oldStatus === null)) {
          // Match "NEW→P" with "Blank→P"
          return normalizedSelected.replace('NEW→', '') === c.newStatus;
        }
        if (normalizedSelected.startsWith('Blank→') && (c.oldStatus === 'Blank' || c.oldStatus === null)) {
          // Match "Blank→P" with "Blank→P"
          return normalizedSelected === changeTypeNoSpaces;
        }
        
        return normalizedChangeTypeNoSpaces === normalizedSelected || changeTypeNoSpaces === normalizedSelected;
      });
    }
    
    // Filter by transition type (Blank→P, P→A, A→J, J→Deleted)
    if (transitionFilter && !selectedBreakdownTransition) {
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
    if (!transitionFilter && !selectedBreakdownTransition && statusChangeFilter.size < 3) {
      allChanges = allChanges.filter(c => {
        if (!c.newStatus || c.newStatus === 'Blank') return false;
        return statusChangeFilter.has(c.newStatus as 'J' | 'A' | 'P');
      });
    }
    
    return allChanges;
  };

  // Pagination for status changes table - works per filter/list
  const getPaginatedStatusChanges = () => {
    // Get the filtered list first (this applies all active filters)
    const filteredList = getFilteredStatusChanges();
    
    // Apply pagination to the filtered list (250 items per page for THIS specific filter)
    const startIndex = (statusChangesPage - 1) * statusChangesPerPage;
    const endIndex = startIndex + statusChangesPerPage;
    const paginatedItems = filteredList.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems, // Max 250 items from the current filtered list
      total: filteredList.length, // Total items in the current filtered list
      totalPages: Math.ceil(filteredList.length / statusChangesPerPage),
      currentPage: statusChangesPage
    };
  };

  // Reset to page 1 when filters change (so each filter starts at page 1)
  useEffect(() => {
    setStatusChangesPage(1);
  }, [transitionFilter, selectedBreakdownTransition, statusChangeFilter]);

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
        {/* Comparison Report Section - Always visible at the top */}
        {comparisonReport && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-6 mb-6">
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
                        {comparisonReport.summary?.legalStatusChangesCount !== undefined && (
                          <> • <strong>{comparisonReport.summary.legalStatusChangesCount || 0}</strong> properties with LEGALSTATUS field changes</>
                        )}
                        {comparisonReport.summary?.foreclosedPropertiesCount > 0 && (
                          <> • <strong className="text-red-700">{comparisonReport.summary.foreclosedPropertiesCount}</strong> <span className="text-red-700 font-semibold">DEAD LEADS</span> (were Judgment, now foreclosed/new owner)</>
                        )}
                        {(!comparisonReport.summary || 
                          (comparisonReport.summary.statusChangesCount === 0 && 
                           (comparisonReport.summary.legalStatusChangesCount || 0) === 0)) && (
                          <span className="text-gray-500 italic"> (No changes detected in this upload)</span>
                        )}
                      </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-white p-4 rounded-lg border-2 border-green-300">
                        <div className="text-green-600 font-semibold text-sm">New Properties</div>
                        <div className="text-2xl font-bold text-green-900">
                          {comparisonReport.summary?.newPropertiesCount || 0}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border-2 border-red-300">
                        <div className="text-red-600 font-semibold text-sm">Removed</div>
                        <div className="text-2xl font-bold text-red-900">
                          {comparisonReport.summary?.removedPropertiesCount || 0}
                        </div>
                        {comparisonReport.summary?.foreclosedPropertiesCount > 0 && (
                          <div className="text-xs text-red-700 mt-1 font-semibold">
                            {comparisonReport.summary.foreclosedPropertiesCount} Dead Leads (Were Judgment)
                          </div>
                        )}
                      </div>
                      <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
                        <div className="text-blue-600 font-semibold text-sm">Status Changes</div>
                        <div className="text-2xl font-bold text-blue-900">
                          {comparisonReport.summary?.statusChangesCount || 0}
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
                          {comparisonReport.summary?.totalPropertiesInNewFile?.toLocaleString() || 0}
                        </div>
                      </div>
                    </div>

                    {/* Dead Leads Section */}
                    {comparisonReport.foreclosedProperties && comparisonReport.foreclosedProperties.length > 0 && (
                      <div className="bg-red-100 rounded-lg border-2 border-red-500 p-4">
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

                    {/* Filter by Change Type */}
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
                          All Changes ({comparisonReport.summary.statusChangesCount + (comparisonReport.summary.legalStatusChangesCount || 0)})
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
                        <h4 className="font-bold text-gray-800 mb-3">Status Change Breakdown (Click to filter)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {(() => {
                            // Get all unique changeTypes from actual data
                            const changeTypeCounts: { [key: string]: number } = {};
                            comparisonReport.statusChanges.forEach((sc: any) => {
                              const changeType = sc.changeType || `${sc.oldStatus || 'Blank'}→${sc.newStatus || 'Blank'}`;
                              changeTypeCounts[changeType] = (changeTypeCounts[changeType] || 0) + 1;
                            });
                            
                            // Sort by count (descending) then by type
                            const sortedTypes = Object.entries(changeTypeCounts)
                              .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
                            
                            return sortedTypes.map(([changeType, count]) => (
                              <button
                                key={changeType}
                                onClick={() => {
                                  if (selectedBreakdownTransition === changeType) {
                                    setSelectedBreakdownTransition(null);
                                    setTransitionFilter(null);
                                  } else {
                                    setSelectedBreakdownTransition(changeType);
                                    // Clear transition filter when using breakdown filter
                                    setTransitionFilter(null);
                                  }
                                }}
                                className={`flex justify-between items-center p-2 rounded transition-all ${
                                  selectedBreakdownTransition === changeType
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                <span className={`font-semibold ${selectedBreakdownTransition === changeType ? 'text-white' : 'text-gray-700'}`}>
                                  {changeType}:
                                </span>
                                <span className={`font-bold ${selectedBreakdownTransition === changeType ? 'text-white' : 'text-gray-900'}`}>
                                  {count}
                                </span>
                              </button>
                            ));
                          })()}
                        </div>
                        {selectedBreakdownTransition && (
                          <div className="mt-3 text-xs text-gray-600">
                            Showing properties with transition: <strong>{selectedBreakdownTransition}</strong>
                            <button
                              onClick={() => {
                                setSelectedBreakdownTransition(null);
                                setTransitionFilter(null);
                              }}
                              className="ml-2 text-purple-600 hover:text-purple-800 underline"
                            >
                              Clear filter
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Changes Table - Filtered by Change Type */}
                    {((changeFilter === 'all' || changeFilter === 'status') && comparisonReport.statusChanges) ||
                     (changeFilter === 'legalstatus' && comparisonReport.legalStatusChanges) ? (
                      <div className="bg-white rounded-lg border border-blue-300 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-blue-800">
                            {changeFilter === 'status' && `Status Changes (${comparisonReport.statusChanges.length})`}
                            {changeFilter === 'legalstatus' && `LEGALSTATUS Changes (${comparisonReport.legalStatusChanges.length})`}
                            {changeFilter === 'all' && `All Changes (${comparisonReport.statusChanges.length + (comparisonReport.legalStatusChanges?.length || 0)})`}
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
                                  {changeFilter === 'status' || changeFilter === 'all' ? (
                                    <>
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
                                    </>
                                  ) : null}
                                  <td className="px-3 py-2 text-xs text-gray-600 italic">
                                    {changeFilter === 'status' || changeFilter === 'all' 
                                      ? `Status changed from ${sc.oldStatus || 'NEW'} to ${sc.newStatus}`
                                      : ''}
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
                               (changeFilter === 'legalstatus' && (!comparisonReport.legalStatusChanges || comparisonReport.legalStatusChanges.length === 0)) ? (
                                <tr>
                                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500 italic">
                                    No {changeFilter === 'status' ? 'status' : changeFilter === 'legalstatus' ? 'LEGALSTATUS' : ''} changes detected in this upload.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
              </div>
            )}
          </div>
        )}

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
                        <span className="ml-2 text-xs font-semibold text-indigo-600">(250 per page)</span>
                      </h2>
                      <p className="text-xs text-gray-600 mt-1">
                        These properties have received a new J, A, or P status since the last upload
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-nowrap">
                    {/* Pagination Controls - Always visible next to Hide button */}
                    {(() => {
                      const paginated = getPaginatedStatusChanges();
                      
                      // Always show pagination controls - make them very prominent
                      const startItem = (paginated.currentPage - 1) * statusChangesPerPage + 1;
                      const endItem = Math.min(paginated.currentPage * statusChangesPerPage, paginated.total);

                      return (
                        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2.5 rounded-lg border-2 border-indigo-300 shadow-sm">
                          <span className="text-sm text-indigo-900 font-bold whitespace-nowrap">
                            Showing {startItem}-{endItem} of {paginated.total}
                          </span>
                          <span className="text-indigo-400 font-bold">|</span>
                          <button
                            onClick={() => setStatusChangesPage(p => Math.max(1, p - 1))}
                            disabled={paginated.currentPage === 1}
                            className={`px-3 py-1.5 rounded-md text-sm font-bold transition whitespace-nowrap ${
                              paginated.currentPage === 1
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-white border-2 border-indigo-500 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-600'
                            }`}
                          >
                            ← Prev
                          </button>
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(10, paginated.totalPages) }, (_, i) => {
                              let pageNum;
                              if (paginated.totalPages <= 10) {
                                pageNum = i + 1;
                              } else if (paginated.currentPage <= 5) {
                                pageNum = i + 1;
                              } else if (paginated.currentPage >= paginated.totalPages - 4) {
                                pageNum = paginated.totalPages - 9 + i;
                              } else {
                                pageNum = paginated.currentPage - 4 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setStatusChangesPage(pageNum)}
                                  className={`px-3 py-1.5 rounded-md text-sm font-bold transition min-w-[40px] ${
                                    paginated.currentPage === pageNum
                                      ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                      : 'bg-white border-2 border-indigo-400 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-500'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setStatusChangesPage(p => Math.min(paginated.totalPages, p + 1))}
                            disabled={paginated.currentPage === paginated.totalPages}
                            className={`px-3 py-1.5 rounded-md text-sm font-bold transition whitespace-nowrap ${
                              paginated.currentPage === paginated.totalPages
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-white border-2 border-indigo-500 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-600'
                            }`}
                          >
                            Next →
                          </button>
                          <span className="text-sm text-indigo-900 font-bold whitespace-nowrap ml-2">
                            Page {paginated.currentPage}/{paginated.totalPages}
                          </span>
                        </div>
                      );
                    })()}
                    <button
                      onClick={() => setShowStatusChanges(!showStatusChanges)}
                      className="text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-md hover:bg-gray-100 text-sm font-bold transition-colors whitespace-nowrap border-2 border-gray-400 bg-white"
                    >
                      {showStatusChanges ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {showStatusChanges && (
                  <div className="space-y-4">
                    {/* Transition Filter */}
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300 mb-4">
                      <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Filter by Status Transition</h4>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const allChanges = getStatusChanges();
                          const totalCount = allChanges.length;
                          const showingCount = Math.min(statusChangesPerPage, totalCount);
                          
                          return (
                            <>
                              <button
                                onClick={() => setTransitionFilter(null)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                  transitionFilter === null
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                                title={totalCount > statusChangesPerPage ? `Showing ${showingCount} of ${totalCount} on this page` : undefined}
                              >
                                All Transitions ({totalCount > statusChangesPerPage ? `${statusChangesPerPage} of ${totalCount}` : totalCount})
                              </button>
                              {[
                                { key: 'blank-to-p', label: 'Blank → P', count: allChanges.filter(c => c.oldStatus === 'Blank' && c.newStatus === 'P').length },
                                { key: 'p-to-a', label: 'P → A', count: allChanges.filter(c => c.oldStatus === 'P' && c.newStatus === 'A').length },
                                { key: 'a-to-j', label: 'A → J', count: allChanges.filter(c => c.oldStatus === 'A' && c.newStatus === 'J').length },
                                { key: 'j-to-deleted', label: 'J → Deleted/New Owner', count: deadLeads.length }
                              ].map((transition) => {
                                const showPagination = transition.count > statusChangesPerPage;
                                
                                return (
                                  <button
                                    key={transition.key}
                                    onClick={() => setTransitionFilter(transitionFilter === transition.key ? null : transition.key)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                      transitionFilter === transition.key
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                                    }`}
                                    title={showPagination ? `Showing ${statusChangesPerPage} of ${transition.count} on this page` : undefined}
                                  >
                                    {transition.label} ({showPagination ? `${statusChangesPerPage} of ${transition.count}` : transition.count})
                                  </button>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
                      <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Filter by New Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const allChanges = getStatusChanges();
                          const totalCount = allChanges.length;
                          
                          return (
                            <>
                              <button
                                onClick={() => {
                                  if (statusChangeFilter.size === 3) {
                                    setStatusChangeFilter(new Set());
                                  } else {
                                    setStatusChangeFilter(new Set(['J', 'A', 'P']));
                                  }
                                  setTransitionFilter(null); // Clear transition filter when using status filter
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                  statusChangeFilter.size === 3 && transitionFilter === null
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                                title={totalCount > statusChangesPerPage ? `Showing ${statusChangesPerPage} of ${totalCount} on this page` : undefined}
                              >
                                All Properties with New Status ({totalCount > statusChangesPerPage ? `${statusChangesPerPage} of ${totalCount}` : totalCount})
                              </button>
                              {(['J', 'A', 'P'] as const).map((status) => {
                                const allStatusChanges = allChanges.filter(c => c.newStatus === status);
                                const count = allStatusChanges.length;
                                const showPagination = count > statusChangesPerPage;
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
                                      setTransitionFilter(null); // Clear transition filter when using status filter
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                      isSelected && transitionFilter === null
                                        ? status === 'J'
                                          ? 'bg-red-600 text-white shadow-sm'
                                          : status === 'A'
                                          ? 'bg-yellow-600 text-white shadow-sm'
                                          : 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                                    }`}
                                    title={showPagination ? `Showing ${statusChangesPerPage} of ${count} on this page` : undefined}
                                  >
                                    {status === 'J' ? 'Judgment' : status === 'A' ? 'Active' : 'Pending'} ({showPagination ? `${statusChangesPerPage} of ${count}` : count})
                                  </button>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Status Changes Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ tableLayout: 'fixed', maxWidth: '100%' }}>
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '10%' }}>Property ID</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '12%' }}>Previous Status</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '12%' }}>New Status</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '35%' }}>Additional Details</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '8%' }}>Days</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '10%' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {transitionFilter === 'j-to-deleted' ? (
                            // Show dead leads (J to deleted) - with pagination
                            (() => {
                              const paginatedDeadLeads = (() => {
                                const startIndex = (statusChangesPage - 1) * statusChangesPerPage;
                                const endIndex = startIndex + statusChangesPerPage;
                                return deadLeads.slice(startIndex, endIndex);
                              })();
                              
                              if (deadLeads.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                                      No dead leads found (no Judgment properties were removed).
                                    </td>
                                  </tr>
                                );
                              }
                              
                              return paginatedDeadLeads.map((lead, idx) => (
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
                              ));
                            })()
                          ) : (() => {
                            const paginated = getPaginatedStatusChanges();
                            if (paginated.total === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                                    No properties match the selected filters.
                                  </td>
                                </tr>
                              );
                            }
                            
                            // Use paginated items - already limited to 250 per page for THIS filter
                            // Each filter (Judgment, Active, Pending, transitions) has its own pagination
                            let itemsToRender = paginated.items;

                            // HARD SAFETY LIMIT: Never render more than 250 items
                            if (itemsToRender.length > 250) {
                              console.warn(`⚠️ SAFETY LIMIT TRIGGERED: Attempting to render ${itemsToRender.length} items, limiting to 250`);
                              itemsToRender = itemsToRender.slice(0, 250);
                            }

                            // Debug logging
                            console.log(`📊 Table rendering: ${itemsToRender.length} items (Total in filter: ${paginated.total}, Page: ${paginated.currentPage}/${paginated.totalPages})`);

                            if (itemsToRender.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                                    No properties on this page.
                                  </td>
                                </tr>
                              );
                            }
                            
                            // Render only the paginated items (max 250 per page for current filter)
                            return itemsToRender.map((change, idx) => {
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
                            });
                          })()}
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
                  <h2 className="text-xl font-bold text-gray-800">Property Map</h2>
                </div>
              </div>
              {/* Pagination info at bottom of table */}
              {(() => {
                const paginated = getPaginatedStatusChanges();
                
                // Always show pagination info if there are items
                if (paginated.total > 0) {
                  return (
                    <div className="mt-4 flex items-center justify-between border-t-2 border-gray-200 pt-4 bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                        <span className="bg-white px-3 py-1.5 rounded-md border border-gray-300">
                          Showing <strong className="text-indigo-700">{(paginated.currentPage - 1) * statusChangesPerPage + 1}</strong> to{' '}
                          <strong className="text-indigo-700">{Math.min(paginated.currentPage * statusChangesPerPage, paginated.total)}</strong> of{' '}
                          <strong className="text-indigo-700">{paginated.total.toLocaleString()}</strong> properties
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="bg-white px-3 py-1.5 rounded-md border border-gray-300">
                          <strong className="text-indigo-700">{statusChangesPerPage}</strong> per page
                        </span>
                      </div>
                      {paginated.totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStatusChangesPage(p => Math.max(1, p - 1))}
                            disabled={paginated.currentPage === 1}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                              paginated.currentPage === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Previous
                          </button>
                          <div className="flex gap-1 flex-wrap">
                            {Array.from({ length: Math.min(10, paginated.totalPages) }, (_, i) => {
                              let pageNum;
                              if (paginated.totalPages <= 10) {
                                pageNum = i + 1;
                              } else if (paginated.currentPage <= 5) {
                                pageNum = i + 1;
                              } else if (paginated.currentPage >= paginated.totalPages - 4) {
                                pageNum = paginated.totalPages - 9 + i;
                              } else {
                                pageNum = paginated.currentPage - 4 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setStatusChangesPage(pageNum)}
                                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition min-w-[36px] ${
                                    paginated.currentPage === pageNum
                                      ? 'bg-indigo-600 text-white shadow-md'
                                      : 'bg-white border border-indigo-300 text-gray-700 hover:bg-indigo-50 hover:border-indigo-400'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setStatusChangesPage(p => Math.min(paginated.totalPages, p + 1))}
                            disabled={paginated.currentPage === paginated.totalPages}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                              paginated.currentPage === paginated.totalPages
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Next
                          </button>
                          <span className="text-sm text-gray-600 font-medium">
                            Page {paginated.currentPage} of {paginated.totalPages}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
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

