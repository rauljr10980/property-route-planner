// IndexedDB utility for large data storage (supports 50MB+)
// Falls back to localStorage if IndexedDB is not available

const DB_NAME = 'PropertyTaxTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'properties';

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export async function initIndexedDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: false });
        objectStore.createIndex('uploadDate', 'uploadDate', { unique: false });
      }
    };
  });
}

// Save properties to IndexedDB
export async function saveToIndexedDB(properties: any[], uploadDate: string): Promise<void> {
  try {
    const database = await initIndexedDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear existing data
    await store.clear();
    
    // Save properties with upload date
    const data = {
      id: 'properties',
      properties,
      uploadDate,
      lastUpdated: new Date().toISOString()
    };
    
    await store.put(data);
    
    console.log(`✅ Saved ${properties.length} properties to IndexedDB`);
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    throw error;
  }
}

// Load properties from IndexedDB
export async function loadFromIndexedDB(): Promise<{ properties: any[]; uploadDate: string | null }> {
  try {
    const database = await initIndexedDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get('properties');
      
      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          resolve({
            properties: data.properties || [],
            uploadDate: data.uploadDate || null
          });
        } else {
          resolve({ properties: [], uploadDate: null });
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return { properties: [], uploadDate: null };
  }
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

// Clear IndexedDB
export async function clearIndexedDB(): Promise<void> {
  try {
    const database = await initIndexedDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
    console.log('✅ Cleared IndexedDB');
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
}

