import React, { useState, useEffect } from 'react';
import { Menu, Home, History } from 'lucide-react';
import { LoadScript } from '@react-google-maps/api';
import PropertyDashboard from './components/PropertyDashboard';
import FileHistory from './components/FileHistory';
import { ErrorBoundary } from './components/ErrorBoundary';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

// Check if API key is configured
if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
  console.warn('⚠️ Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file');
}

type Tab = 'dashboard' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('history'); // Default to File History tab
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);



  // Monitor Google Maps loading status (consolidated useEffect)
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return;
    }

    // Listen for Google Maps script errors
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (source && source.includes('maps.googleapis.com')) {
        setMapsError(`Google Maps API Error: ${message}. Please check your API key configuration in Google Cloud Console.`);
        console.error('❌ Google Maps API Error:', { message, source });
      }
      if (originalError) {
        originalError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Check if Maps loaded after timeout
    const checkTimeout = setTimeout(() => {
      if (!mapsLoaded && !window.google?.maps) {
        setMapsError('Google Maps failed to load. Common issues: 1) API key invalid/restricted 2) Maps JavaScript API not enabled 3) Billing not set up 4) API key restrictions blocking domain');
        console.error('❌ Google Maps not loaded after 5 seconds');
        console.log('Debug info:', {
          apiKeySet: !!GOOGLE_MAPS_API_KEY,
          apiKeyPreview: GOOGLE_MAPS_API_KEY?.substring(0, 15) + '...',
          googleAvailable: !!window.google,
          mapsAvailable: !!window.google?.maps
        });
      }
    }, 5000);

    // Check periodically if Maps loaded
    const checkInterval = setInterval(() => {
      if (window.google?.maps && !mapsLoaded) {
        setMapsLoaded(true);
        setMapsError(null);
        clearInterval(checkInterval);
        clearTimeout(checkTimeout);
      }
    }, 500);

    return () => {
      window.onerror = originalError;
      clearTimeout(checkTimeout);
      clearInterval(checkInterval);
    };
  }, [mapsLoaded, GOOGLE_MAPS_API_KEY]);

  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Google Maps API Key Required</h1>
          <div className="space-y-4 text-gray-700">
            <p>Please configure your Google Maps API key:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Create a <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file in the project root</li>
              <li>Add: <code className="bg-gray-100 px-2 py-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</code></li>
              <li>Restart the development server</li>
            </ol>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mt-4">
              <p className="text-sm"><strong>Note:</strong> Make sure you've enabled the following APIs in Google Cloud Console:</p>
              <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>Maps JavaScript API</li>
                <li>Geocoding API</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places', 'geometry']}
      loadingElement={<div className="w-full h-screen bg-gray-200 flex items-center justify-center"><p>Loading Google Maps...</p></div>}
      onLoad={() => {
        console.log('✅ Google Maps loaded successfully');
        setMapsLoaded(true);
        setMapsError(null);
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header with Tabs */}
        <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Menu className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-gray-900">Property Management Suite</h1>
              </div>
              
              {/* Tab Navigation */}
              <nav className="flex gap-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'history'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <History className="w-5 h-5" />
                  <span className="font-medium">File History</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Maps Error Banner */}
        {mapsError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-red-800">⚠️ Google Maps API Error</p>
                <p className="text-sm text-red-700 mt-1">{mapsError}</p>
                <div className="mt-2 text-xs text-red-600 space-y-1">
                  <p><strong>Troubleshooting steps:</strong></p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Open browser console (F12) and check for error messages</li>
                    <li>Verify API key is correct in <code className="bg-red-100 px-1 py-0.5 rounded">.env</code> file</li>
                    <li>Check Google Cloud Console - enable "Maps JavaScript API" and "Geocoding API"</li>
                    <li>Verify API key restrictions allow <code className="bg-red-100 px-1 py-0.5 rounded">http://localhost:*</code> for development</li>
                    <li>Ensure billing is set up in Google Cloud Console</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'dashboard' && (
            <ErrorBoundary>
              <PropertyDashboard />
            </ErrorBoundary>
          )}
          {activeTab === 'history' && (
            <ErrorBoundary>
              <FileHistory />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </LoadScript>
  );
}
