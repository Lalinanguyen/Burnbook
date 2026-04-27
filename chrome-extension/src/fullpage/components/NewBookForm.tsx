import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface NewBookFormProps {
  onClose: () => void;
  onSave: () => void;
}

const COVER_COLORS = [
  { name: 'Mean Girls Pink', value: '#FF69B4' },
  { name: 'Hot Pink',        value: '#FF1493' },
  { name: 'Lavender',        value: '#E6E6FA' },
  { name: 'Baby Blue',       value: '#89CFF0' },
  { name: 'Mint',            value: '#98FF98' },
  { name: 'Peach',           value: '#FFE5B4' },
  { name: 'Coral',           value: '#FF6B6B' },
  { name: 'Purple',          value: '#B19CD9' },
  { name: 'Gold',            value: '#FFD700' },
  { name: 'Red',             value: '#DC143C' },
  { name: 'Teal',            value: '#20B2AA' },
  { name: 'Black',           value: '#2d2d2d' },
];

function drawSpinePreview(canvas: HTMLCanvasElement, label: string, color: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  // Spine shading
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.28)');
  grad.addColorStop(0.1, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Top/bottom bands
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(0, 0, w, Math.round(h * 0.05));
  ctx.fillRect(0, h - Math.round(h * 0.05), w, Math.round(h * 0.05));

  // Rotated label
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `bold ${Math.round(w * 0.22)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(label.toUpperCase() || '?', 0, 0, h * 0.85);
  ctx.restore();
}

export default function NewBookForm({ onClose, onSave }: NewBookFormProps) {
  const [personName, setPersonName] = useState('');
  const [title, setTitle] = useState('');
  const [coverColor, setCoverColor] = useState('#FF69B4');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw spine preview whenever label or color changes
  useEffect(() => {
    if (!canvasRef.current) return;
    drawSpinePreview(canvasRef.current, title || personName, coverColor);
  }, [title, personName, coverColor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!personName.trim()) {
      setError("Enter the person's name");
      return;
    }

    setSaving(true);
    try {
      const newBook: Book = {
        id: uuidv4(),
        userId: 'user-1',
        personName: personName.trim(),
        title: title.trim() || undefined,
        coverColor,
        coverStyle: 'classic',
        createdAt: new Date(),
        updatedAt: new Date(),
        archived: false,
        localModified: true,
      };
      await db.createBook(newBook);
      onSave();
    } catch (err) {
      console.error('Error creating book:', err);
      setError('Failed to create book');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="diary-cover max-w-lg w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-burn-gray hover:text-burn-pink transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="heading-page text-burn-pink-dark mb-6">New Burn Book</h2>

        <div className="flex gap-6">
          {/* Spine preview */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <canvas
              ref={canvasRef}
              width={52}
              height={200}
              className="rounded shadow-xl"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="text-[10px] text-burn-gray font-serif opacity-60 uppercase tracking-widest">
              preview
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-burn-gray mb-1.5 font-serif uppercase tracking-wide">
                Person's Name *
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
              <label className="block text-xs font-semibold text-burn-gray mb-1.5 font-serif uppercase tracking-wide">
                Spine Label
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Defaults to person's name"
              />
              <p className="text-[11px] text-burn-gray-light mt-1 font-serif italic">
                This is what appears on the spine in the shelf.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-burn-gray mb-2 font-serif uppercase tracking-wide">
                Cover Color
              </label>
              <div className="grid grid-cols-6 gap-2">
                {COVER_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setCoverColor(color.value)}
                    className={`relative h-9 rounded transition-all ${
                      coverColor === color.value
                        ? 'ring-2 ring-burn-pink ring-offset-1 scale-110 shadow-md'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {coverColor === color.value && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-sm drop-shadow-lg">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-serif text-center">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Adding...' : 'Add to Shelf'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
