import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../shared/storage/LocalDB';
import { passwordManager, secureStorage } from '../shared/utils/encryption';
import { LayoutDashboard, Flame, Users, CalendarDays, Settings, Lock, Heart, Plus } from 'lucide-react';
import OffenseForm from './components/OffenseForm';

type View = 'dashboard' | 'offenses' | 'relationships' | 'calendar' | 'settings';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showOffenseForm, setShowOffenseForm] = useState(false);
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
      loadStats();
      chrome.runtime.sendMessage({ type: 'UNLOCK' });
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Failed to log in');
    }
  };

  const handleOffenseSaved = () => {
    setShowOffenseForm(false);
    loadStats();
  };

  const navItems: { view: View; icon: React.ReactNode; label: string }[] = [
    { view: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'The Burn Board' },
    { view: 'offenses', icon: <Flame size={18} />, label: 'Offenses' },
    { view: 'relationships', icon: <Users size={18} />, label: 'The List' },
    { view: 'calendar', icon: <CalendarDays size={18} />, label: 'Calendar' },
    { view: 'settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-burn-cream">
        <div className="text-burn-gray font-serif">Loading...</div>
      </div>
    );
  }

  if (!isSetup) {
    return (
      <div className="flex items-center justify-center h-screen bg-burn-cream">
        <div className="card max-w-md text-center">
          <Lock className="mx-auto text-burn-gold mb-4" size={48} />
          <h1 className="heading-page text-burn-pink-dark mb-4">Setup Required</h1>
          <p className="text-burn-gray font-serif mb-4">
            Click the extension icon in your toolbar to set up your Burn Book with a secret password.
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
      <div className="flex items-center justify-center h-screen bg-burn-cream">
        <div className="max-w-md w-full px-4">
          <div className="diary-cover text-center mb-6">
            <Lock className="mx-auto mb-3 relative z-10 text-burn-gold" size={48} />
            <h1 className="font-handwritten text-4xl font-bold relative z-10">This Burn Book Is Private</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-center"
              placeholder="Whisper the password..."
              required
              autoFocus
            />

            {error && (
              <div className="text-red-600 text-sm font-serif text-center">{error}</div>
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
    <div className="flex h-screen bg-burn-cream">
      {/* Sidebar */}
      <div className="w-64 bg-burn-cream-dark shadow-lg relative flex flex-col">
        <div className="p-6">
          <h1 className="font-handwritten text-2xl font-bold text-burn-pink-dark">Burn Book</h1>
          <p className="subtext-sassy mt-1">It's like a diary, but meaner.</p>
        </div>

        <nav className="mt-2 flex-1">
          {navItems.map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={currentView === view ? 'nav-item-active' : 'nav-item'}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-burn-gold/20">
          <button
            onClick={() => {
              secureStorage.lock();
              setIsLocked(true);
              chrome.runtime.sendMessage({ type: 'LOCK' });
            }}
            className="text-sm text-burn-gray hover:text-burn-pink-dark transition-colors font-serif flex items-center gap-2"
          >
            <Lock size={14} />
            Lock It Up
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {currentView === 'dashboard' && (
            <div>
              <h2 className="heading-page text-burn-black mb-6">The Burn Board</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="text-burn-pink" size={20} />
                    <h3 className="text-sm font-semibold text-burn-gray font-serif">Grudges on File</h3>
                  </div>
                  <p className="text-4xl font-handwritten font-bold text-burn-pink">{offenseCount}</p>
                  <p className="subtext-sassy mt-1">Every receipt, documented.</p>
                </div>

                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="text-burn-pink" size={20} />
                    <h3 className="text-sm font-semibold text-burn-gray font-serif">People in the Book</h3>
                  </div>
                  <p className="text-4xl font-handwritten font-bold text-burn-pink">{relationshipCount}</p>
                  <p className="subtext-sassy mt-1">Friends, foes, and frenemies.</p>
                </div>

                <div className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="text-burn-pink" size={20} />
                    <h3 className="text-sm font-semibold text-burn-gray font-serif">Positive Moments</h3>
                  </div>
                  <p className="text-4xl font-handwritten font-bold text-burn-pink">0</p>
                  <p className="subtext-sassy mt-1">Because you're not a monster.</p>
                </div>
              </div>

              <div className="text-center py-8">
                <div className="space-x-4">
                  <button
                    onClick={() => setShowOffenseForm(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    File a Grudge
                  </button>
                  <button
                    onClick={() => setCurrentView('relationships')}
                    className="btn-secondary"
                  >
                    Add Someone
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'offenses' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-page text-burn-black flex items-center gap-2">
                  <Flame className="text-burn-pink" size={28} />
                  Offenses
                </h2>
                <button
                  onClick={() => setShowOffenseForm(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  File a Grudge
                </button>
              </div>
              <div className="card-notebook text-center py-12">
                <p className="subtext-sassy text-lg">No grudges filed yet...</p>
                <p className="text-burn-gray-light text-sm mt-1 font-serif">Must be nice.</p>
              </div>
            </div>
          )}

          {currentView === 'relationships' && (
            <div>
              <h2 className="heading-page text-burn-black flex items-center gap-2 mb-6">
                <Users className="text-burn-pink" size={28} />
                The List
              </h2>
              <div className="card-notebook text-center py-12">
                <p className="subtext-sassy text-lg">Nobody's on the list... yet.</p>
                <p className="text-burn-gray-light text-sm mt-1 font-serif">Add someone to keep tabs on.</p>
              </div>
            </div>
          )}

          {currentView === 'calendar' && (
            <div>
              <h2 className="heading-page text-burn-black flex items-center gap-2 mb-6">
                <CalendarDays className="text-burn-pink" size={28} />
                Calendar
              </h2>
              <div className="card-notebook text-center py-12">
                <p className="subtext-sassy text-lg">Important dates go here.</p>
                <p className="text-burn-gray-light text-sm mt-1 font-serif">Birthdays, anniversaries, betrayal dates...</p>
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div>
              <h2 className="heading-page text-burn-black flex items-center gap-2 mb-6">
                <Settings className="text-burn-pink" size={28} />
                Settings
              </h2>
              <div className="card-notebook text-center py-12">
                <p className="subtext-sassy text-lg">Settings coming soon...</p>
                <p className="text-burn-gray-light text-sm mt-1 font-serif">Patience is a virtue you clearly have.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showOffenseForm && (
        <OffenseForm
          onClose={() => setShowOffenseForm(false)}
          onSave={handleOffenseSaved}
        />
      )}
    </div>
  );
}

export default App;
