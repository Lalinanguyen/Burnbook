import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from 'lucide-react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Rant, RantMood, RANT_MOODS } from '../../shared/types';
import InlineEditField from './InlineEditField';

interface YapViewProps {
  bookId: string;
}

const MOOD_COLORS: Record<RantMood, string> = {
  furious: '#FF4500',
  hurt: '#6495ED',
  done: '#9B59B6',
  betrayed: '#E74C3C',
  numb: '#95A5A6',
  unbothered: '#FF69B4',
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface RantEntryProps {
  rant: Rant;
  onUpdate: (updates: Partial<Rant>) => void;
  onDelete: () => void;
}

function RantEntry({ rant, onUpdate, onDelete }: RantEntryProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const mood = RANT_MOODS.find(m => m.value === rant.mood);

  return (
    <div
      className="relative mb-6 rounded-lg overflow-hidden shadow-md"
      style={{
        backgroundColor: '#FFF8DC',
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(212,165,116,0.25) 27px, rgba(212,165,116,0.25) 28px)',
        borderLeft: `4px solid ${rant.mood ? MOOD_COLORS[rant.mood] : '#FF69B4'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-2 border-b border-[#D2B48C]/30">
        <div className="flex-1">
          <InlineEditField
            value={rant.title}
            onSave={v => onUpdate({ title: v || formatDate(rant.createdAt) })}
            className="font-handwritten text-xl font-bold text-[#1a1a1a]"
            placeholder="Give this rant a title..."
          />
          <p className="font-handwritten text-xs text-[#999] mt-1">{formatDate(rant.createdAt)}</p>
        </div>

        <div className="flex items-center gap-2 ml-3">
          {/* Mood badge */}
          {mood && (
            <span
              className="text-lg"
              title={mood.label}
            >
              {mood.emoji}
            </span>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[#FF69B4]/40 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Mood selector */}
      <div className="px-5 pt-2 pb-1 flex flex-wrap gap-2">
        {RANT_MOODS.map(m => (
          <button
            key={m.value}
            onClick={() => onUpdate({ mood: rant.mood === m.value ? null : m.value })}
            className={`text-sm px-2 py-0.5 rounded-full border transition-all font-handwritten ${
              rant.mood === m.value
                ? 'border-transparent text-white shadow-sm'
                : 'border-transparent bg-transparent text-[#888] hover:bg-[#FFE4F0]'
            }`}
            style={rant.mood === m.value ? { backgroundColor: MOOD_COLORS[m.value] } : {}}
            title={m.label}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-5 py-3">
        <InlineEditField
          value={rant.content}
          onSave={v => onUpdate({ content: v })}
          multiline
          rows={6}
          placeholder="Let it all out... no one's judging you here 💅"
          className="font-handwritten text-base text-[#1a1a1a] w-full leading-7"
        />
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-3 z-10">
          <p className="font-handwritten text-lg text-[#1a1a1a] font-bold">Delete this rant?</p>
          <p className="font-handwritten text-sm text-[#888]">It's gone forever.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-1.5 border border-[#D2B48C] rounded font-handwritten text-sm text-[#888] hover:bg-[#FFF0F6] transition-colors">
              Keep it
            </button>
            <button onClick={onDelete} className="px-4 py-1.5 bg-red-500 text-white rounded font-handwritten text-sm hover:bg-red-600 transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function YapView({ bookId }: YapViewProps) {
  const [rants, setRants] = useState<Rant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRants();
  }, [bookId]);

  const loadRants = async () => {
    const loaded = await db.getRantsByBook(bookId);
    setRants(loaded);
    setLoading(false);
  };

  const handleNewRant = async () => {
    const now = new Date();
    const newRant: Rant = {
      id: uuidv4(),
      bookId,
      title: formatDate(now),
      content: '',
      mood: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.createRant(newRant);
    setRants(prev => [newRant, ...prev]);
  };

  const handleUpdateRant = async (id: string, updates: Partial<Rant>) => {
    await db.updateRant(id, updates);
    setRants(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleDeleteRant = async (id: string) => {
    await db.deleteRant(id);
    setRants(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-handwritten text-[#999] text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#FFF0F6] border-b border-[#FF69B4]/20">
        <div>
          <h2 className="font-handwritten text-2xl font-bold text-[#FF1493]">The Yap Zone 💬</h2>
          <p className="font-handwritten text-xs text-[#999]">Your private space to vent. No filter needed.</p>
        </div>
        <button
          onClick={handleNewRant}
          className="flex items-center gap-2 bg-[#FF1493] hover:bg-[#FF69B4] text-white px-4 py-2 rounded-lg transition-colors font-handwritten text-sm shadow-sm"
        >
          <Plus size={16} />
          New Rant
        </button>
      </div>

      {/* Rant list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {rants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="font-handwritten text-5xl mb-4">😤</p>
            <p className="font-handwritten text-xl text-[#888] mb-2">Nothing here yet.</p>
            <p className="font-handwritten text-sm text-[#bbb]">When you have something to say, say it.</p>
            <button
              onClick={handleNewRant}
              className="mt-6 flex items-center gap-2 bg-[#FF1493] hover:bg-[#FF69B4] text-white px-5 py-2.5 rounded-lg transition-colors font-handwritten shadow-sm"
            >
              <Plus size={16} />
              Start Yapping
            </button>
          </div>
        ) : (
          <>
            {rants.map(rant => (
              <RantEntry
                key={rant.id}
                rant={rant}
                onUpdate={updates => handleUpdateRant(rant.id, updates)}
                onDelete={() => handleDeleteRant(rant.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
