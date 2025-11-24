import { Property } from './fileProcessor';
import gcsStorage from '../services/gcsStorage';

const PROPERTIES_KEY = 'property-tax-shared-properties';
const LAST_UPLOAD_KEY = 'property-tax-last-upload';

export interface SharedDataState {
  properties: Property[];
  lastUploadDate: string | null;
}

// Save shared property data (to both GCS and localStorage)
export async function saveSharedProperties(properties: Property[], uploadDate: string): Promise<void> {
  try {
    // Try to save to localStorage first (fast, for immediate use)
    // If localStorage is full, skip it and only use GCS
    try {
      localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
      localStorage.setItem(LAST_UPLOAD_KEY, uploadDate);
    } catch (localError) {
      if (localError instanceof DOMException && localError.name === 'QuotaExceededError') {
        console.warn('localStorage is full, skipping localStorage save. Using GCS only.');
        // Continue - we'll save to GCS which is the persistent storage anyway
      } else {
        throw localError;
      }
    }
    
    // Always save to GCS for persistence (this is the primary storage)
    try {
      await gcsStorage.saveProperties(properties, uploadDate);
    } catch (gcsError) {
      console.warn('Failed to save to GCS:', gcsError);
      // If GCS fails and localStorage also failed, throw error
      if (localStorage.getItem(PROPERTIES_KEY) === null) {
        throw new Error('Failed to save to both localStorage and GCS. Please check your connection and try again.');
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

// Load shared property data (from GCS first, fallback to localStorage)
export async function loadSharedProperties(): Promise<SharedDataState> {
  try {
    // Try to load from GCS first (persistent storage)
    try {
      const gcsData = await gcsStorage.loadProperties();
      if (gcsData.properties.length > 0) {
        // Update localStorage with GCS data
        localStorage.setItem(PROPERTIES_KEY, JSON.stringify(gcsData.properties));
        if (gcsData.uploadDate) {
          localStorage.setItem(LAST_UPLOAD_KEY, gcsData.uploadDate);
        }
        return {
          properties: gcsData.properties,
          lastUploadDate: gcsData.uploadDate
        };
      }
    } catch (gcsError) {
      console.log('GCS not available, using localStorage:', gcsError);
    }

    // Fallback to localStorage
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
export function clearSharedProperties(): void {
  try {
    localStorage.removeItem(PROPERTIES_KEY);
    localStorage.removeItem(LAST_UPLOAD_KEY);
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('propertiesUpdated', {
      detail: { properties: [], uploadDate: null }
    }));
  } catch (error) {
    console.error('Error clearing shared properties:', error);
  }
}

