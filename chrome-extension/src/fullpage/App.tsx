import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../shared/storage/LocalDB';
import { passwordManager, secureStorage } from '../shared/utils/encryption';
import { Book } from '../shared/types';
import { Lock, Home, Plus, LockKeyhole, Globe } from 'lucide-react';
import Bookshelf3D from './components/Bookshelf3D';
import BookView from './components/BookView';
import NewBookForm from './components/NewBookForm';
import MacOSDock from './components/MacOSDock';
import RelationshipMap3D from './components/RelationshipMap3D';

type AppView = 'bookshelf' | 'book' | 'new-book' | '3d-map';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<AppView>('bookshelf');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

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

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('book');
  };

  const handleCloseBook = () => {
    setSelectedBook(null);
    setCurrentView('bookshelf');
  };

  const handleCreateBook = () => {
    setCurrentView('new-book');
  };

  const handleBookCreated = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('book');
  };

  const handleCloseNewBook = () => {
    setCurrentView('bookshelf');
  };

  const handleLock = () => {
    setIsLocked(true);
    chrome.runtime.sendMessage({ type: 'LOCK' });
  };

  const dockItems = [
    {
      id: 'home',
      icon: Home,
      label: 'Bookshelf',
      onClick: () => {
        setSelectedBook(null);
        setCurrentView('bookshelf');
      }
    },
    {
      id: 'add',
      icon: Plus,
      label: 'New Book',
      onClick: handleCreateBook
    },
    {
      id: '3d-map',
      icon: Globe,
      label: 'Relationship Galaxy',
      onClick: () => setCurrentView('3d-map')
    },
    {
      id: 'lock',
      icon: LockKeyhole,
      label: 'Lock',
      onClick: handleLock
    },
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
    <>
      {currentView === 'bookshelf' && (
        <Bookshelf3D
          onSelectBook={handleSelectBook}
          onCreateBook={handleCreateBook}
        />
      )}

      {currentView === 'book' && selectedBook && (
        <BookView
          book={selectedBook}
          onClose={handleCloseBook}
          onBookUpdated={(updated) => setSelectedBook(updated)}
        />
      )}

      {currentView === 'new-book' && (
        <NewBookForm
          onClose={handleCloseNewBook}
          onSave={handleBookCreated}
        />
      )}

      {currentView === '3d-map' && (
        <RelationshipMap3D
          onSelectRelationship={(book) => {
            setSelectedBook(book);
            setCurrentView('book');
          }}
          onClose={() => setCurrentView('bookshelf')}
        />
      )}

      <MacOSDock
        items={dockItems}
        activeId={currentView === 'bookshelf' ? 'home' : currentView === 'new-book' ? 'add' : currentView === '3d-map' ? '3d-map' : undefined}
      />
    </>
  );
}

export default App;
