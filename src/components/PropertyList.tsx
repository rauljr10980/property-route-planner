import React, { useState, useEffect } from 'react';
import { CheckCircle, Navigation, RefreshCw, Search } from 'lucide-react';
import { loadSharedProperties } from '../utils/sharedData';
import { getPropertyStatus as getPropertyStatusUtil } from '../utils/fileProcessor';
import gcsStorage from '../services/gcsStorage';

interface Property {
  [key: string]: any;
  id?: string | number;
  accountNumber?: string;
  owner?: string;
  address?: string;
  currentStatus?: 'J' | 'A' | 'P' | null;
  previousStatus?: 'J' | 'A' | 'P' | null;
}

export default function PropertyList() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusChangeFilter, setStatusChangeFilter] = useState<Set<'J' | 'A' | 'P'>>(new Set(['J', 'A', 'P']));
  const [transitionFilter, setTransitionFilter] = useState<string | null>(null);
  const [selectedBreakdownTransition, setSelectedBreakdownTransition] = useState<string | null>(null);
  const [showStatusChanges, setShowStatusChanges] = useState(true);
  const [statusChangesPage, setStatusChangesPage] = useState(1);
  const statusChangesPerPage = 250;
  const [comparisonReport, setComparisonReport] = useState<any>({
    summary: { statusChangesCount: 0 },
    statusChanges: []
  });
  const [deadLeads, setDeadLeads] = useState<any[]>([]);
  const [fetchingCAD, setFetchingCAD] = useState<Set<string>>(new Set());
  const [cadData, setCadData] = useState<Map<string, { cad: string | null; propertyInfo?: any }>>(new Map());
  const [fetchingAllCAD, setFetchingAllCAD] = useState(false);

  const getPropertyStatus = (prop: Property): string | null => {
    return getPropertyStatusUtil(prop);
  };

  const fetchCADForProperty = async (can: string, prop: any) => {
    if (!can || fetchingCAD.has(can)) return;
    
    setFetchingCAD(prev => new Set(prev).add(can));
    
    try {
      const result = await gcsStorage.fetchCAD(can);
      setCadData(prev => {
        const newMap = new Map(prev);
        newMap.set(can, {
          cad: result.cad,
          propertyInfo: result.propertyInfo
        });
        return newMap;
      });
      
      // Update the property in the list with CAD data
      if (result.success && result.cad) {
        prop.CAD = result.cad;
        prop.cadPropertyId = result.cad;
        if (result.propertyInfo) {
          prop.cadPropertyInfo = result.propertyInfo;
        }
      }
    } catch (error: any) {
      console.error(`Error fetching CAD for CAN ${can}:`, error);
      setCadData(prev => {
        const newMap = new Map(prev);
        newMap.set(can, {
          cad: null,
          propertyInfo: { error: error.message }
        });
        return newMap;
      });
    } finally {
      setFetchingCAD(prev => {
        const newSet = new Set(prev);
        newSet.delete(can);
        return newSet;
      });
    }
  };

  const fetchCADForAllVisible = async () => {
    const paginated = getPaginatedStatusChanges();
    
    // Extract CAN values from properties - try multiple field names
    const propertiesToFetch = paginated.items
      .map(change => {
        const prop = change.property || change;
        // Try multiple ways to get CAN - same logic as used in table rendering
        let can = prop.CAN || prop.can || prop['CAN'] || 
                  prop.propertyId || prop['Property ID'] || 
                  prop['Account Number'] || prop.accountNumber ||
                  prop.id || prop.identifier;
        
        // Convert to string and clean
        if (can) {
          can = String(can).replace(/[\s-]/g, '').trim();
          // Pad with leading zeros if it's a number and less than 12 digits
          if (/^\d+$/.test(can) && can.length < 12) {
            can = can.padStart(12, '0');
          }
        }
        
        return { can, prop, originalCan: prop.CAN || prop.can || prop['CAN'] };
      })
      .filter(({ can }) => {
        // Check if CAN is valid (12 digits)
        if (!can) return false;
        const cleaned = String(can).replace(/[\s-]/g, '').trim();
        return /^\d{12}$/.test(cleaned);
      });

    console.log('Properties to fetch CAD for:', propertiesToFetch.length);
    console.log('Sample CANs:', propertiesToFetch.slice(0, 3).map(p => ({ can: p.can, original: p.originalCan })));

    if (propertiesToFetch.length === 0) {
      // Debug: log what we found
      console.log('No valid CANs found. Sample properties:', paginated.items.slice(0, 3).map(c => ({
        property: c.property,
        hasCAN: !!c.property?.CAN,
        canValue: c.property?.CAN,
        allKeys: Object.keys(c.property || {})
      })));
      alert(`No properties with valid CAN values found in current view.\n\nFound ${paginated.items.length} properties, but none have valid 12-digit CAN values.\n\nCheck console for details.`);
      return;
    }

    setFetchingAllCAD(true);
    let successCount = 0;
    let failCount = 0;

    // Fetch in batches with delays
    const batchSize = 5;
    for (let i = 0; i < propertiesToFetch.length; i += batchSize) {
      const batch = propertiesToFetch.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ can, prop }) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between requests
          await fetchCADForProperty(can, prop);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to fetch CAD for ${can}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // Delay between batches
      if (i + batchSize < propertiesToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
      }
    }

    setFetchingAllCAD(false);
    alert(`CAD fetching complete: ${successCount} successful, ${failCount} failed`);
  };

  useEffect(() => {
    loadData();
    
    const handlePropertiesUpdated = (event: CustomEvent) => {
      loadData();
    };
    
    window.addEventListener('propertiesUpdated', handlePropertiesUpdated as EventListener);
    return () => {
      window.removeEventListener('propertiesUpdated', handlePropertiesUpdated as EventListener);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { properties: sharedProps } = await loadSharedProperties();
      setProperties(sharedProps);
      
      try {
        const comparisonResult = await gcsStorage.loadComparisonReport();
        if (comparisonResult && comparisonResult.report) {
          setComparisonReport(comparisonResult.report);
          if (comparisonResult.report.foreclosedProperties) {
            setDeadLeads(comparisonResult.report.foreclosedProperties);
          }
        }
      } catch (error) {
        console.error('Error loading comparison report:', error);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChanges = () => {
    return properties
      .filter(prop => {
        const currentStatus = prop.currentStatus || getPropertyStatus(prop);
        const previousStatus = prop.previousStatus;
        return currentStatus && (currentStatus === 'J' || currentStatus === 'A' || currentStatus === 'P') && 
               (previousStatus !== currentStatus || !previousStatus);
      })
      .map(prop => {
        const currentStatus = prop.currentStatus || getPropertyStatus(prop);
        const previousStatus = prop.previousStatus || 'Blank';
        return {
          property: prop,
          oldStatus: previousStatus,
          newStatus: currentStatus,
          isNew: previousStatus === 'Blank' && currentStatus !== 'Blank',
          transition: `${previousStatus} → ${currentStatus}`,
          daysSinceChange: prop.daysSinceStatusChange || 0
        };
      });
  };

  const getFilteredStatusChanges = () => {
    if (selectedBreakdownTransition && comparisonReport && comparisonReport.statusChanges) {
      const normalizedSelected = selectedBreakdownTransition.replace(/\s+/g, '');
      const filtered = comparisonReport.statusChanges.filter((sc: any) => {
        const changeType = sc.changeType || `${sc.oldStatus || 'Blank'}→${sc.newStatus || 'Blank'}`;
        const normalizedChangeType = changeType.replace(/\s+/g, '');
        if (normalizedSelected === 'NEW') {
          if (normalizedChangeType === 'NEW' || normalizedChangeType.startsWith('NEW→')) {
            return true;
          }
          const isNew = (sc.oldStatus === null || sc.oldStatus === undefined || sc.oldStatus === 'Blank' || sc.oldStatus === '') && 
                        sc.newStatus && sc.newStatus !== 'Blank' && sc.newStatus !== null && sc.newStatus !== undefined;
          return isNew;
        }
        return normalizedChangeType === normalizedSelected;
      });
      
      return filtered.map((sc: any) => {
        let prop = sc.property;
        if (!prop || Object.keys(prop).length === 0) {
          prop = properties.find(p => {
            const can = p.CAN || p['CAN'] || p.propertyId || p['Property ID'] || p.id;
            const scCan = sc.CAN || sc.identifier || sc.property?.CAN || sc.property?.id;
            return can && scCan && String(can).trim() === String(scCan).trim();
          });
        }
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
    
    if (selectedBreakdownTransition) {
      allChanges = allChanges.filter(c => {
        const normalizedSelected = selectedBreakdownTransition.replace(/\s+/g, '');
        if (normalizedSelected === 'NEW' && (c.oldStatus === 'Blank' || c.oldStatus === null)) {
          return true;
        }
        const changeType = `${c.oldStatus}→${c.newStatus}`;
        const normalizedChangeType = c.oldStatus === 'Blank' || c.oldStatus === null ? 
          (c.newStatus ? `NEW→${c.newStatus}` : 'REMOVED_STATUS') :
          (c.newStatus === 'Blank' || c.newStatus === null ? 'REMOVED_STATUS' : changeType);
        const normalizedChangeTypeNoSpaces = normalizedChangeType.replace(/\s+/g, '');
        const changeTypeNoSpaces = changeType.replace(/\s+/g, '');
        if (normalizedSelected.startsWith('NEW→') && (c.oldStatus === 'Blank' || c.oldStatus === null)) {
          return normalizedSelected.replace('NEW→', '') === c.newStatus;
        }
        if (normalizedSelected.startsWith('Blank→') && (c.oldStatus === 'Blank' || c.oldStatus === null)) {
          return normalizedSelected === changeTypeNoSpaces;
        }
        return normalizedChangeTypeNoSpaces === normalizedSelected || changeTypeNoSpaces === normalizedSelected;
      });
    }
    
    if (transitionFilter && !selectedBreakdownTransition) {
      allChanges = allChanges.filter(c => {
        switch (transitionFilter) {
          case 'blank-to-p':
            return c.oldStatus === 'Blank' && c.newStatus === 'P';
          case 'p-to-a':
            return c.oldStatus === 'P' && c.newStatus === 'A';
          case 'a-to-j':
            return c.oldStatus === 'A' && c.newStatus === 'J';
          case 'j-to-deleted':
            return false;
          default:
            return true;
        }
      });
    }
    
    if (!transitionFilter && !selectedBreakdownTransition && statusChangeFilter.size < 3) {
      allChanges = allChanges.filter(c => {
        if (!c.newStatus || c.newStatus === 'Blank') return false;
        return statusChangeFilter.has(c.newStatus as 'J' | 'A' | 'P');
      });
    }
    
    return allChanges;
  };

  const getPaginatedStatusChanges = () => {
    const filteredList = getFilteredStatusChanges();
    const startIndex = (statusChangesPage - 1) * statusChangesPerPage;
    const endIndex = startIndex + statusChangesPerPage;
    const paginatedItems = filteredList.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      total: filteredList.length,
      totalPages: Math.ceil(filteredList.length / statusChangesPerPage),
      currentPage: statusChangesPage
    };
  };

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
      case 'J': return 'Judgment (J)';
      case 'A': return 'Active (A)';
      case 'P': return 'Pending (P)';
      default: return status || 'None';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  const allStatusChanges = getStatusChanges();
  const paginated = getPaginatedStatusChanges();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Properties with New Status
                <span className="ml-2 text-sm font-normal text-gray-500">({allStatusChanges.length})</span>
                <span className="ml-2 text-xs font-semibold text-indigo-600">(250 per page)</span>
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                These properties have received a new J, A, or P status since the last upload
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-nowrap">
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2.5 rounded-lg border-2 border-indigo-300 shadow-sm">
              <span className="text-sm text-indigo-900 font-bold whitespace-nowrap">250/page</span>
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
            <button
              onClick={fetchCADForAllVisible}
              disabled={fetchingAllCAD || paginated.items.length === 0}
              className={`px-4 py-2.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
                fetchingAllCAD || paginated.items.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm border-2 border-purple-700'
              }`}
            >
              {fetchingAllCAD ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Fetching CAD...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Fetch CAD for All ({paginated.items.length})
                </>
              )}
            </button>
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
                  
                  return (
                    <>
                      <button
                        onClick={() => setTransitionFilter(null)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          transitionFilter === null
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        All Transitions ({totalCount > statusChangesPerPage ? `250 of ${totalCount}` : totalCount})
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
                          >
                            {transition.label} ({showPagination ? `250 of ${transition.count}` : transition.count})
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
                          setTransitionFilter(null);
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          statusChangeFilter.size === 3 && transitionFilter === null
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        All Properties with New Status ({totalCount > statusChangesPerPage ? `250 of ${totalCount}` : totalCount})
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
                              setTransitionFilter(null);
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
                          >
                            {status === 'J' ? 'Judgment' : status === 'A' ? 'Active' : 'Pending'} ({showPagination ? `250 of ${count}` : count})
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
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '15%' }}>Property ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '12%' }}>Previous Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '12%' }}>New Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '40%' }}>Additional Details</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '8%' }}>CAD</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '8%' }}>Days</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700" style={{ width: '11%' }}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transitionFilter === 'j-to-deleted' ? (
                    deadLeads.slice((statusChangesPage - 1) * statusChangesPerPage, statusChangesPage * statusChangesPerPage).map((lead, idx) => (
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
                  ) : (
                    paginated.items.map((change, idx) => {
                      const prop = change.property;
                      const propertyId = prop.CAN || prop.propertyId || prop['Property ID'] || prop['Account Number'] || prop.accountNumber || 'N/A';
                      const pnumber = prop.Pnumber || prop['Pnumber'] || '';
                      const pstrname = prop.PSTRNAME || prop['PSTRNAME'] || '';
                      const legalstatus = prop.LEGALSTATUS || prop['LEGALSTATUS'] || '';
                      const tot_percan = prop.TOT_PERCAN || prop['TOT_PERCAN'] || '';
                      const addrstring = prop.ADDRSTRING || prop['ADDRSTRING'] || prop.address || prop.Address || '';
                      const zipCode = prop.ZIP_CODE || prop['ZIP_CODE'] || prop.zipCode || '';
                      const cad = prop.CAD || prop.cadPropertyId || cadData.get(propertyId)?.cad || null;
                      const isFetchingCAD = fetchingCAD.has(propertyId);
                      const cadInfo = cadData.get(propertyId);
                      
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
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(change.newStatus)}`}>
                                {getStatusLabel(change.newStatus)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            <div className="space-y-1">
                              {pnumber && <div><strong>Pnumber (Q):</strong> {pnumber}</div>}
                              {pstrname && <div><strong>PSTRNAME (R):</strong> {pstrname}</div>}
                              {legalstatus && <div><strong>LEGALSTATUS (AE):</strong> {legalstatus}</div>}
                              {tot_percan && <div><strong>TOT_PERCAN (BE):</strong> {tot_percan}</div>}
                              {addrstring && <div><strong>Address (H):</strong> {addrstring}</div>}
                              {zipCode && <div><strong>ZIP (I):</strong> {zipCode}</div>}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {cad ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-mono font-semibold text-green-700">{cad}</span>
                                {cadInfo?.propertyInfo && (
                                  <button
                                    onClick={() => window.open(`https://bexar.acttax.com/act_webdev/bexar/index.jsp`, '_blank')}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                  >
                                    <Search className="w-3 h-3" />
                                    View
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => fetchCADForProperty(propertyId, prop)}
                                disabled={isFetchingCAD}
                                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                  isFetchingCAD
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                }`}
                              >
                                {isFetchingCAD ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Fetching...
                                  </>
                                ) : (
                                  <>
                                    <Search className="w-3 h-3" />
                                    Fetch CAD
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {change.daysSinceChange > 0 ? `${change.daysSinceChange} days` : 'Today'}
                          </td>
                          <td className="px-3 py-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrstring || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3" />
                              View Map
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Info */}
            {paginated.total > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
                Showing <strong className="text-indigo-700">{(paginated.currentPage - 1) * statusChangesPerPage + 1}</strong> to{' '}
                <strong className="text-indigo-700">{Math.min(paginated.currentPage * statusChangesPerPage, paginated.total)}</strong> of{' '}
                <strong className="text-indigo-700">{paginated.total}</strong> properties
                <span className="ml-2 text-gray-500">•</span>
                <strong className="text-indigo-700 ml-2">{statusChangesPerPage}</strong> per page
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

