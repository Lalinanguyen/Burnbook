import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../shared/storage/LocalDB';
import { passwordManager, secureStorage } from '../shared/utils/encryption';

type View = 'dashboard' | 'offenses' | 'relationships' | 'calendar' | 'settings';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const settingsExist = await db.settingsExist();
      setIsSetup(settingsExist);
      setIsLoading(false);
    } catch (err) {
      console.error('Error checking setup status:', err);
      setError('Failed to check setup status');
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const settings = await db.getUserSettings();
      if (!settings) {
        setError('No settings found. Please set up via the popup first.');
        return;
      }

      const isValid = passwordManager.verifyPassword(
        password,
        settings.passwordHash,
        settings.passwordSalt
      );

      if (!isValid) {
        setError('Invalid password');
        return;
      }

      await secureStorage.initialize(password, settings.passwordSalt);
      setIsLocked(false);
      setPassword('');
      chrome.runtime.sendMessage({ type: 'UNLOCK' });
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Failed to log in');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isSetup) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="card max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Setup Required</h1>
          <p className="text-gray-600 mb-4">
            Please click the extension icon in your toolbar to set up Burn Book with a master password.
          </p>
          <button
            onClick={() => window.close()}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="card max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Burn Book</h1>
          <p className="text-sm text-gray-600 mb-6">Enter your password to unlock</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full">
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">Burn Book</h1>
          <p className="text-xs text-gray-500 mt-1">Track & Appreciate</p>
        </div>

        <nav className="mt-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`w-full text-left px-6 py-3 ${
              currentView === 'dashboard'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('offenses')}
            className={`w-full text-left px-6 py-3 ${
              currentView === 'offenses'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Offenses
          </button>
          <button
            onClick={() => setCurrentView('relationships')}
            className={`w-full text-left px-6 py-3 ${
              currentView === 'relationships'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Relationships
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            className={`w-full text-left px-6 py-3 ${
              currentView === 'calendar'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full text-left px-6 py-3 ${
              currentView === 'settings'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Settings
          </button>
        </nav>

        <div className="absolute bottom-0 w-64 p-6 border-t">
          <button
            onClick={() => {
              secureStorage.lock();
              setIsLocked(true);
              chrome.runtime.sendMessage({ type: 'LOCK' });
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Lock Extension
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {currentView === 'dashboard' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Offenses</h3>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500 mt-2">Track grievances & accountability</p>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Relationships</h3>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500 mt-2">Nurture connections</p>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Positive Moments</h3>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500 mt-2">Cherished memories</p>
                </div>
              </div>

              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  Welcome to Burn Book! Start by adding your first offense or relationship.
                </p>
                <div className="space-x-4">
                  <button
                    onClick={() => setCurrentView('offenses')}
                    className="btn-primary"
                  >
                    Add Offense
                  </button>
                  <button
                    onClick={() => setCurrentView('relationships')}
                    className="btn-secondary"
                  >
                    Add Relationship
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'offenses' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Offenses</h2>
              <div className="text-center py-12 text-gray-500">
                Offense tracking coming soon...
              </div>
            </div>
          )}

          {currentView === 'relationships' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Relationships</h2>
              <div className="text-center py-12 text-gray-500">
                Relationship tracking coming soon...
              </div>
            </div>
          )}

          {currentView === 'calendar' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Calendar</h2>
              <div className="text-center py-12 text-gray-500">
                Important dates calendar coming soon...
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Settings</h2>
              <div className="text-center py-12 text-gray-500">
                Settings coming soon...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
