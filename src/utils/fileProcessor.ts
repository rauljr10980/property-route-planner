import * as XLSX from 'xlsx';

export interface PropertyStatus {
  status: 'J' | 'A' | 'P' | null;
  statusDate: string; // ISO string when status was detected
  previousStatus: 'J' | 'A' | 'P' | null;
  daysSinceStatusChange: number;
}

export interface Property {
  id: string; // Unique identifier (Account Number, Parcel Number, etc.)
  [key: string]: any; // All other property data
  statusHistory?: PropertyStatus[];
  currentStatus?: 'J' | 'A' | 'P' | null;
  previousStatus?: 'J' | 'A' | 'P' | null;
  statusChangeDate?: string;
  daysSinceStatusChange?: number;
}

// Extract unique identifier from property (Account Number, Parcel Number, etc.)
export function getPropertyIdentifier(property: any): string | null {
  const identifierKeys = [
    'Account Number',
    'accountNumber',
    'Account',
    'account',
    'Parcel Number',
    'parcelNumber',
    'Parcel',
    'parcel',
    'Property ID',
    'propertyId',
    'ID',
    'id'
  ];
  
  for (const key of identifierKeys) {
    if (property[key]) {
      return String(property[key]).trim();
    }
  }
  
  return null;
}

// Extract status (J, A, P) from property
export function getPropertyStatus(property: any): 'J' | 'A' | 'P' | null {
  // First check LEGALSTATUS column (Column AE) - this is the primary status column
  if (property.LEGALSTATUS) {
    const value = String(property.LEGALSTATUS).trim().toUpperCase();
    // Check if it contains J, A, or P
    if (value.includes('J') || value === 'JUDGMENT') return 'J';
    if (value.includes('A') || value === 'ACTIVE') return 'A';
    if (value.includes('P') || value === 'PENDING') return 'P';
    // Return first letter if it's J, A, or P
    if (value === 'J' || value === 'A' || value === 'P') return value as 'J' | 'A' | 'P';
  }
  
  // Fallback to other status columns
  const statusKeys = ['Status', 'Judgment Status', 'Tax Status', 'Foreclosure Status', 'currentStatus', 'status'];
  for (const key of statusKeys) {
    if (property[key]) {
      const value = String(property[key]).trim().toUpperCase();
      if (value === 'J' || value === 'A' || value === 'P') {
        return value as 'J' | 'A' | 'P';
      }
    }
  }
  
  return null;
}

// Process and merge files, tracking status changes
export function processAndMergeFiles(
  newFileData: any[],
  existingProperties: Property[],
  uploadDate: string
): {
  properties: Property[];
  newStatusChanges: Array<{
    property: Property;
    oldStatus: 'J' | 'A' | 'P' | null;
    newStatus: 'J' | 'A' | 'P' | null;
    daysSinceChange: number;
  }>;
} {
  const newStatusChanges: Array<{
    property: Property;
    oldStatus: 'J' | 'A' | 'P' | null;
    newStatus: 'J' | 'A' | 'P' | null;
    daysSinceChange: number;
  }> = [];
  
  // Create a map of existing properties by identifier
  const existingMap = new Map<string, Property>();
  existingProperties.forEach(prop => {
    const id = prop.id;
    if (id) {
      existingMap.set(id, prop);
    }
  });
  
  // Process new file data
  const mergedProperties: Property[] = [];
  const processedIds = new Set<string>();
  
  newFileData.forEach((propData) => {
    const identifier = getPropertyIdentifier(propData);
    if (!identifier) {
      // Skip properties without identifiers
      return;
    }
    
    const newStatus = getPropertyStatus(propData);
    const existingProperty = existingMap.get(identifier);
    
    let property: Property;
    let statusChanged = false;
    let oldStatus: 'J' | 'A' | 'P' | null = null;
    
    if (existingProperty) {
      // Property exists - merge with existing data
      oldStatus = existingProperty.currentStatus || null;
      const previousStatusHistory = existingProperty.statusHistory || [];
      
      // Check if status changed
      if (oldStatus !== newStatus) {
        statusChanged = true;
        
        // Calculate days since status change (from when status changed, not from last upload)
        const statusChangeDate = new Date(uploadDate);
        const now = new Date();
        const daysSinceChange = Math.max(0, Math.floor((now.getTime() - statusChangeDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Add to status history
        const statusHistory: PropertyStatus[] = [
          ...previousStatusHistory,
          {
            status: newStatus,
            statusDate: uploadDate,
            previousStatus: oldStatus,
            daysSinceStatusChange: daysSinceChange
          }
        ];
        
        property = {
          ...existingProperty,
          ...propData,
          id: identifier,
          currentStatus: newStatus,
          previousStatus: oldStatus,
          statusChangeDate: uploadDate,
          daysSinceStatusChange: daysSinceChange,
          statusHistory
        };
        
        newStatusChanges.push({
          property,
          oldStatus,
          newStatus,
          daysSinceChange
        });
      } else {
        // Status didn't change, but update property data
        // Calculate days since last status change
        const lastStatusDate = existingProperty.statusChangeDate 
          ? new Date(existingProperty.statusChangeDate)
          : new Date();
        const now = new Date();
        const daysSinceChange = Math.max(0, Math.floor((now.getTime() - lastStatusDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        property = {
          ...existingProperty,
          ...propData,
          id: identifier,
          currentStatus: newStatus,
          previousStatus: existingProperty.previousStatus,
          statusChangeDate: existingProperty.statusChangeDate || uploadDate,
          daysSinceStatusChange: daysSinceChange,
          statusHistory: previousStatusHistory
        };
      }
    } else {
      // New property
      property = {
        ...propData,
        id: identifier,
        currentStatus: newStatus,
        previousStatus: null,
        statusChangeDate: uploadDate,
        daysSinceStatusChange: 0,
        statusHistory: newStatus ? [{
          status: newStatus,
          statusDate: uploadDate,
          previousStatus: null,
          daysSinceStatusChange: 0
        }] : []
      };
      
      if (newStatus) {
        newStatusChanges.push({
          property,
          oldStatus: null,
          newStatus,
          daysSinceChange: 0
        });
      }
    }
    
    mergedProperties.push(property);
    processedIds.add(identifier);
  });
  
  // Keep existing properties that weren't in the new file (optional - comment out if you want to remove them)
  // existingProperties.forEach(prop => {
  //   if (!processedIds.has(prop.id)) {
  //     mergedProperties.push(prop);
  //   }
  // });
  
  return {
    properties: mergedProperties,
    newStatusChanges
  };
}

