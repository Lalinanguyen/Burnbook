import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../shared/storage/LocalDB';
import { passwordManager, secureStorage } from '../shared/utils/encryption';
import { STORAGE_KEYS } from '../shared/constants';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

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

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    const validation = passwordManager.validatePasswordStrength(password);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      // Generate salt and hash password
      const salt = passwordManager.generateSalt();
      const hash = passwordManager.hashPassword(password, salt);

      // Create user settings
      const settings = {
        userId: 'local',
        passwordHash: hash,
        passwordSalt: salt,
        cloudSyncEnabled: false,
        autoSyncInterval: 15,
        notificationsEnabled: true,
        reminderNotifications: true,
        importantDateNotifications: true,
        theme: 'light' as const,
        defaultView: 'dashboard' as const,
        offenseCategories: [],
        relationshipTypes: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.createUserSettings(settings);

      // Initialize secure storage
      await secureStorage.initialize(password, salt);

      // Mark as unlocked
      setIsSetup(true);
      setIsLocked(false);
      setPassword('');
      setConfirmPassword('');

      // Notify background script
      chrome.runtime.sendMessage({ type: 'UNLOCK' });
    } catch (err) {
      console.error('Error setting up password:', err);
      setError('Failed to set up password');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Get stored settings
      const settings = await db.getUserSettings();
      if (!settings) {
        setError('No settings found. Please set up the extension.');
        return;
      }

      // Verify password
      const isValid = passwordManager.verifyPassword(
        password,
        settings.passwordHash,
        settings.passwordSalt
      );

      if (!isValid) {
        setError('Invalid password');
        return;
      }

      // Initialize secure storage
      await secureStorage.initialize(password, settings.passwordSalt);

      // Mark as unlocked
      setIsLocked(false);
      setPassword('');

      // Notify background script
      chrome.runtime.sendMessage({ type: 'UNLOCK' });
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Failed to log in');
    }
  };

  const openFullView = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('fullpage.html')
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isSetup) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Welcome to Burn Book</h1>
          <p className="text-sm text-gray-600 mt-1">
            Set up your master password to get started
          </p>
        </div>

        <form onSubmit={handleSetupPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Master Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="Confirm password"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full">
            Set Up Password
          </button>

          <div className="text-xs text-gray-500 mt-2">
            Password must be at least 8 characters with uppercase, lowercase, and numbers
          </div>
        </form>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Burn Book</h1>
          <p className="text-sm text-gray-600 mt-1">Enter your password to unlock</p>
        </div>

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
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Burn Book</h1>
        <p className="text-xs text-gray-600 mt-1">Quick access dashboard</p>
      </div>

      <div className="space-y-3">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2">Quick Stats</h3>
          <div className="text-sm text-gray-600">
            <div className="flex justify-between py-1">
              <span>Total Offenses:</span>
              <span className="font-semibold">-</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Relationships:</span>
              <span className="font-semibold">-</span>
            </div>
          </div>
        </div>

        <button
          onClick={openFullView}
          className="btn-primary w-full"
        >
          Open Full View
        </button>

        <div className="text-center">
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
    </div>
  );
}

export default App;
