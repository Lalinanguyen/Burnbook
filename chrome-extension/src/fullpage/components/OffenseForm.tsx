import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CreateOffenseData, SeverityLevel } from '../../shared/types';
import { OffenseModel } from '../../shared/models';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { DEFAULT_OFFENSE_CATEGORIES, SEVERITY_LEVELS } from '../../shared/constants';

interface OffenseFormProps {
  onClose: () => void;
  onSave: () => void;
}

export default function OffenseForm({ onClose, onSave }: OffenseFormProps) {
  const [personName, setPersonName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [occurrenceDate, setOccurrenceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [severity, setSeverity] = useState<SeverityLevel | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [error, setError] = useState('');

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!severity) {
      setError('Pick a severity level — how bad was it?');
      return;
    }

    try {
      const data: CreateOffenseData = {
        personName,
        title,
        description,
        occurrenceDate: new Date(occurrenceDate),
        severity,
        categories: selectedCategories,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        evidence: { notes: evidenceNotes }
      };

      const offense = OffenseModel.create(data);
      await db.createOffense(offense.toObject());
      onSave();
    } catch (err) {
      console.error('Error saving offense:', err);
      setError('Failed to save. Try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-burn-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-notebook max-w-xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-burn-gray hover:text-burn-pink-dark transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="heading-page text-burn-pink-dark mb-1">File a Grudge</h2>
        <p className="subtext-sassy mb-6">Let it all out. This is a safe space (for you).</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Person */}
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-1 font-serif">
              Who wronged you?
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="input-field font-handwritten text-xl"
              placeholder="Name the offender..."
              required
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-1 font-serif">
              What did they do?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Give it a name..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-1 font-serif">
              The full story
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field bg-lined-paper min-h-[100px] resize-y"
              placeholder="Spill the tea..."
              rows={4}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-1 font-serif">
              When did this happen?
            </label>
            <input
              type="date"
              value={occurrenceDate}
              onChange={(e) => setOccurrenceDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-2 font-serif">
              How bad was it?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as SeverityLevel[]).map((level) => {
                const config = SEVERITY_LEVELS[level];
                const isSelected = severity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`p-2 rounded-lg border-2 text-center transition-all ${
                      isSelected
                        ? 'scale-105 shadow-md'
                        : 'border-burn-gold/20 hover:border-burn-gold/40'
                    }`}
                    style={{
                      borderColor: isSelected ? config.color : undefined,
                      boxShadow: isSelected ? `0 0 8px ${config.color}40` : undefined
                    }}
                  >
                    <div className="text-lg">{config.icon}</div>
                    <div className="text-xs font-serif font-semibold mt-1" style={{ color: config.color }}>
                      {config.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-2 font-serif">
              What kind of offense?
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_OFFENSE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm font-serif transition-colors ${
                      isSelected
                        ? 'bg-burn-pink text-white'
                        : 'bg-burn-cream-dark text-burn-gray border border-burn-gold/20 hover:border-burn-gold/40'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-1 font-serif">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input-field"
              placeholder="Comma-separated tags..."
            />
          </div>

          {/* Evidence */}
          <div>
            <label className="block text-sm font-semibold text-burn-black mb-1 font-serif">
              Evidence & notes
            </label>
            <textarea
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              placeholder="Screenshots? Receipts? Write it all down."
              rows={3}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm font-serif">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Burn It In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
