import React, { useState } from 'react';
import { X } from 'lucide-react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface NewBookFormProps {
  onClose: () => void;
  onSave: (book: Book) => void;
}

const COVER_COLORS = [
  { name: 'Mean Girls Pink', value: '#FF69B4' },
  { name: 'Hot Pink', value: '#FF1493' },
  { name: 'Lavender', value: '#E6E6FA' },
  { name: 'Baby Blue', value: '#89CFF0' },
  { name: 'Mint Green', value: '#98FF98' },
  { name: 'Peach', value: '#FFE5B4' },
  { name: 'Coral', value: '#FF6B6B' },
  { name: 'Purple', value: '#B19CD9' },
];

export default function NewBookForm({ onClose, onSave }: NewBookFormProps) {
  const [personName, setPersonName] = useState('');
  const [title, setTitle] = useState('');
  const [coverColor, setCoverColor] = useState('#FF69B4');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!personName.trim()) {
      setError('Please enter a person\'s name');
      return;
    }

    try {
      const newBook: Book = {
        id: uuidv4(),
        userId: 'user-1',
        personName: personName.trim(),
        title: title.trim() || undefined,
        coverColor,
        coverStyle: 'collage',
        createdAt: new Date(),
        updatedAt: new Date(),
        archived: false,
        localModified: true,
      };

      await db.createBook(newBook);
      onSave(newBook);
    } catch (err) {
      console.error('Error creating book:', err);
      setError('Failed to create book');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="diary-cover max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-burn-gray hover:text-burn-pink transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="heading-page text-burn-pink-dark mb-6">Create a New Burn Book</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-burn-gray mb-2 font-serif">
              Who is this book about? *
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="input-field"
              placeholder="Regina George"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-burn-gray mb-2 font-serif">
              Custom Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Leave blank for classic 'Burn Book' title"
            />
            <p className="text-xs text-burn-gray-light mt-1 font-serif italic">
              The person's name will always appear on the cover
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-burn-gray mb-3 font-serif">
              Cover Color
            </label>
            <div className="grid grid-cols-4 gap-3">
              {COVER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setCoverColor(color.value)}
                  className={`relative h-16 rounded-lg border-4 transition-all ${
                    coverColor === color.value
                      ? 'border-burn-pink scale-110 shadow-lg'
                      : 'border-transparent hover:border-burn-gray-light'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {coverColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-2xl drop-shadow-lg">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm font-serif text-center">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Create Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
