import React, { useState } from 'react';
import { MapPin, TrendingUp, Menu, Home } from 'lucide-react';
import { LoadScript } from '@react-google-maps/api';
import RoutePlanner from './components/RoutePlanner';
import TaxTracker from './components/TaxTracker';
import Dashboard from './components/Dashboard';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

type Tab = 'dashboard' | 'route' | 'tracker';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places', 'geometry']}
      loadingElement={<div className="w-full h-screen bg-gray-200 flex items-center justify-center"><p>Loading...</p></div>}
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
                  onClick={() => setActiveTab('route')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'route'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">Route Planner</span>
                </button>
                <button
                  onClick={() => setActiveTab('tracker')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'tracker'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Status Tracker</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'route' && <RoutePlanner />}
          {activeTab === 'tracker' && <TaxTracker />}
        </div>
      </div>
    </LoadScript>
  );
}
