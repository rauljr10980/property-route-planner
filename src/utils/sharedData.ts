import { Property } from './fileProcessor';
import gcsStorage from '../services/gcsStorage';
import { saveToIndexedDB, loadFromIndexedDB, isIndexedDBAvailable, clearIndexedDB } from './indexedDB';

const PROPERTIES_KEY = 'property-tax-shared-properties';
const LAST_UPLOAD_KEY = 'property-tax-last-upload';

export interface SharedDataState {
  properties: Property[];
  lastUploadDate: string | null;
}

// Save shared property data (to GCS, IndexedDB, and localStorage)
export async function saveSharedProperties(properties: Property[], uploadDate: string): Promise<void> {
  try {
    // Priority 1: Save to GCS (primary persistent storage)
    try {
      await gcsStorage.saveProperties(properties, uploadDate);
    } catch (gcsError) {
      console.warn('Failed to save to GCS:', gcsError);
    }
    
    // Priority 2: Save to IndexedDB (supports 50MB+, better than localStorage)
    if (isIndexedDBAvailable()) {
      try {
        await saveToIndexedDB(properties, uploadDate);
      } catch (indexedDBError) {
        console.warn('Failed to save to IndexedDB:', indexedDBError);
      }
    }
    
    // Priority 3: Save to localStorage (fallback, limited to 5-10MB)
    try {
      localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
      localStorage.setItem(LAST_UPLOAD_KEY, uploadDate);
    } catch (localError) {
      if (localError instanceof DOMException && localError.name === 'QuotaExceededError') {
        console.warn('localStorage is full, skipping localStorage save.');
      } else {
        throw localError;
      }
    }
    
    // Trigger custom event to notify all tabs
    window.dispatchEvent(new CustomEvent('propertiesUpdated', {
      detail: { properties, uploadDate }
    }));
  } catch (error) {
    console.error('Error saving shared properties:', error);
    throw error;
  }
}

// Load shared property data (from GCS first, then IndexedDB, then localStorage)
export async function loadSharedProperties(): Promise<SharedDataState> {
  try {
    // Priority 1: Try to load from GCS (primary persistent storage)
    try {
      const gcsData = await gcsStorage.loadProperties();
      if (gcsData.properties.length > 0) {
        console.log(`✅ Loaded ${gcsData.properties.length} properties from GCS`);
        // Always update cache with GCS data (GCS is source of truth)
        if (isIndexedDBAvailable()) {
          try {
            await saveToIndexedDB(gcsData.properties, gcsData.uploadDate || '');
          } catch (e) {
            console.warn('Failed to update IndexedDB:', e);
          }
        }
        try {
          localStorage.setItem(PROPERTIES_KEY, JSON.stringify(gcsData.properties));
          if (gcsData.uploadDate) {
            localStorage.setItem(LAST_UPLOAD_KEY, gcsData.uploadDate);
          }
        } catch (e) {
          console.warn('Failed to update localStorage:', e);
        }
        return {
          properties: gcsData.properties,
          lastUploadDate: gcsData.uploadDate
        };
      } else {
        // GCS is empty - clear cache to avoid showing old data
        console.log('⚠️ GCS is empty, clearing cache to avoid showing old data');
        if (isIndexedDBAvailable()) {
          try {
            await clearIndexedDB();
          } catch (e) {
            console.warn('Failed to clear IndexedDB:', e);
          }
        }
        try {
          localStorage.removeItem(PROPERTIES_KEY);
          localStorage.removeItem(LAST_UPLOAD_KEY);
        } catch (e) {
          console.warn('Failed to clear localStorage:', e);
        }
      }
    } catch (gcsError) {
      console.log('GCS not available, trying IndexedDB:', gcsError);
    }

    // Priority 2: Try to load from IndexedDB (supports large data)
    if (isIndexedDBAvailable()) {
      try {
        const indexedDBData = await loadFromIndexedDB();
        if (indexedDBData.properties.length > 0) {
          return {
            properties: indexedDBData.properties,
            lastUploadDate: indexedDBData.uploadDate
          };
        }
      } catch (indexedDBError) {
        console.log('IndexedDB not available, using localStorage:', indexedDBError);
      }
    }

    // Priority 3: Fallback to localStorage
    const propertiesJson = localStorage.getItem(PROPERTIES_KEY);
    const lastUpload = localStorage.getItem(LAST_UPLOAD_KEY);
    
    return {
      properties: propertiesJson ? JSON.parse(propertiesJson) : [],
      lastUploadDate: lastUpload
    };
  } catch (error) {
    console.error('Error loading shared properties:', error);
    return {
      properties: [],
      lastUploadDate: null
    };
  }
}

// Synchronous version for components that need immediate data (uses localStorage)
export function loadSharedPropertiesSync(): SharedDataState {
  try {
    const propertiesJson = localStorage.getItem(PROPERTIES_KEY);
    const lastUpload = localStorage.getItem(LAST_UPLOAD_KEY);
    
    return {
      properties: propertiesJson ? JSON.parse(propertiesJson) : [],
      lastUploadDate: lastUpload
    };
  } catch (error) {
    console.error('Error loading shared properties:', error);
    return {
      properties: [],
      lastUploadDate: null
    };
  }
}

// Clear shared property data
export async function clearSharedProperties(): Promise<void> {
  try {
    // Clear GCS (cloud storage)
    try {
      // Save empty array to GCS to overwrite any existing data
      await gcsStorage.saveProperties([], '');
    } catch (gcsError) {
      console.warn('Failed to clear GCS:', gcsError);
    }
    
    // Clear localStorage
    localStorage.removeItem(PROPERTIES_KEY);
    localStorage.removeItem(LAST_UPLOAD_KEY);
    
    // Clear IndexedDB
    if (isIndexedDBAvailable()) {
      try {
        await clearIndexedDB();
      } catch (e) {
        console.warn('Failed to clear IndexedDB:', e);
      }
    }
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('propertiesUpdated', {
      detail: { properties: [], uploadDate: null }
    }));
  } catch (error) {
    console.error('Error clearing shared properties:', error);
  }
}

