import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../shared/storage/LocalDB';
import { passwordManager, secureStorage } from '../shared/utils/encryption';
import { STORAGE_KEYS } from '../shared/constants';
import { Lock, BookOpen, Heart } from 'lucide-react';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [offenseCount, setOffenseCount] = useState(0);
  const [relationshipCount, setRelationshipCount] = useState(0);

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

  const loadStats = async () => {
    try {
      const offenses = await db.getAllOffenses();
      const relationships = await db.getAllRelationships();
      setOffenseCount(offenses.length);
      setRelationshipCount(relationships.length);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const salt = passwordManager.generateSalt();
      const hash = passwordManager.hashPassword(password, salt);

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
      await secureStorage.initialize(password, salt);

      setIsSetup(true);
      setIsLocked(false);
      setPassword('');
      setConfirmPassword('');
      loadStats();

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
      const settings = await db.getUserSettings();
      if (!settings) {
        setError('No settings found. Please set up the extension.');
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
      loadStats();

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
      <div className="flex items-center justify-center h-full bg-burn-cream">
        <div className="text-burn-gray font-serif">Loading...</div>
      </div>
    );
  }

  // Setup state
  if (!isSetup) {
    return (
      <div className="p-4 bg-burn-cream h-full">
        <div className="text-center mb-3">
          <Lock className="mx-auto text-burn-pink mb-2" size={28} />
          <h1 className="heading-dramatic text-burn-pink-dark">This Is My Burn Book</h1>
          <p className="subtext-sassy mt-1">No one sees this but you. Set your password, babe.</p>
        </div>

        <form onSubmit={handleSetupPassword} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-1 font-serif">
              Create Your Secret Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Something sneaky..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-burn-black mb-1 font-serif">
              Type It Again (just to be safe)
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="One more time..."
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm font-serif">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full">
            Seal It Shut
          </button>

          <p className="text-xs text-burn-gray-light text-center italic font-serif">
            At least 8 characters. Make it hard to guess, like your personality.
          </p>
        </form>
      </div>
    );
  }

  // Locked state
  if (isLocked) {
    return (
      <div className="p-4 bg-burn-cream h-full flex flex-col">
        <div className="diary-cover text-center mb-4">
          <Lock className="mx-auto mb-2 relative z-10" size={32} />
          <h1 className="font-handwritten text-3xl font-bold relative z-10">Burn Book</h1>
        </div>
        <p className="subtext-sassy text-center mb-3">This diary is locked, obviously.</p>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="Whisper the password..."
            required
            autoFocus
          />

          {error && (
            <div className="text-red-600 text-sm font-serif">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  // Unlocked state
  return (
    <div className="p-4 bg-burn-cream h-full">
      <div className="mb-3">
        <h1 className="font-handwritten text-2xl font-bold text-burn-pink-dark">Burn Book</h1>
        <p className="subtext-sassy">What's the tea?</p>
      </div>

      <div className="space-y-3">
        <div className="card-notebook">
          <div className="flex justify-between items-center py-1">
            <span className="text-sm font-serif text-burn-gray">Grudges Filed:</span>
            <span className="font-handwritten text-xl text-burn-pink font-bold">{offenseCount}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm font-serif text-burn-gray">People Tracked:</span>
            <span className="font-handwritten text-xl text-burn-pink font-bold">{relationshipCount}</span>
          </div>
        </div>

        <button
          onClick={openFullView}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <BookOpen size={16} />
          Open the Full Burn Book
        </button>

        <div className="text-center">
          <button
            onClick={() => {
              secureStorage.lock();
              setIsLocked(true);
              chrome.runtime.sendMessage({ type: 'LOCK' });
            }}
            className="text-sm text-burn-gray hover:text-burn-pink-dark transition-colors font-serif inline-flex items-center gap-1"
          >
            <Lock size={12} />
            Lock It Up
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
