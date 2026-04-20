import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book, Offense, Relationship } from '../../shared/types';
import { ChevronLeft, ChevronRight, X, BookmarkPlus, Home, Plus, Trash2, Pencil, Phone } from 'lucide-react';
import OffenseForm from './OffenseForm';
import { COVER_COLORS } from './NewBookForm';
import { RelationshipModel } from '../../shared/models/Relationship';

interface BookViewProps {
  book: Book;
  onClose: () => void;
  onBookUpdated?: (book: Book) => void;
}

export default function BookView({ book, onClose, onBookUpdated }: BookViewProps) {
  const [currentBook, setCurrentBook] = useState<Book>(book);
  const [currentPage, setCurrentPage] = useState(0);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showOffenseForm, setShowOffenseForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(book.personName);
  const [editColor, setEditColor] = useState(book.coverColor);

  useEffect(() => {
    loadBookData();
  }, [book.id]);

  const loadBookData = async () => {
    const bookOffenses = await db.getOffensesByBook(book.id);
    const bookRelationships = await db.getRelationshipsByBook(book.id);
    setOffenses(bookOffenses);
    setRelationship(bookRelationships[0] || null);
  };

  const handleOffenseSaved = () => {
    setShowOffenseForm(false);
    loadBookData();
  };

  const handleDeleteBook = async () => {
    await db.deleteBook(book.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    await db.updateBook(currentBook.id, { personName: editName.trim(), coverColor: editColor });
    const updated = { ...currentBook, personName: editName.trim(), coverColor: editColor, updatedAt: new Date() };
    setCurrentBook(updated);
    onBookUpdated?.(updated);
    if (relationship) {
      await db.updateRelationship(relationship.id, { personName: editName.trim() });
      setRelationship({ ...relationship, personName: editName.trim() });
    }
    setShowEditModal(false);
  };

  const handleRecordContact = async () => {
    if (!relationship) return;
    const model = new RelationshipModel(relationship);
    model.recordContact();
    const updated = model.toObject();
    await db.updateRelationship(relationship.id, {
      lastContactDate: updated.lastContactDate,
      strengthScore: updated.strengthScore,
      nextReminderDate: updated.nextReminderDate,
    });
    setRelationship(updated);
  };

  const totalPages = Math.max(4, Math.ceil(offenses.length / 2) + 2);

  const nextPage = () => {
    if (currentPage < totalPages - 2) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(currentPage + 2);
        setIsFlipping(false);
      }, 600);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(currentPage - 2);
        setIsFlipping(false);
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 glass-panel hover:glass-pink text-white rounded-full p-3 transition-all z-50"
      >
        <Home size={20} />
      </button>

      {/* Add offense button */}
      <button
        onClick={() => setShowOffenseForm(true)}
        className="absolute top-4 left-4 glass-pink hover:bg-burn-pink/40 text-burn-black px-4 py-2 rounded-full flex items-center gap-2 transition-all z-50"
      >
        <Plus size={20} />
        Add Entry
      </button>

      {/* Edit button */}
      <button
        onClick={() => { setEditName(currentBook.personName); setEditColor(currentBook.coverColor); setShowEditModal(true); }}
        className="absolute top-4 left-36 glass-panel hover:glass-pink text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all z-50"
      >
        <Pencil size={20} />
        Edit
      </button>

      {/* Delete button */}
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="absolute top-4 left-[232px] glass-panel hover:bg-red-600/40 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all z-50"
      >
        <Trash2 size={20} />
        Delete
      </button>

      {/* Book */}
      <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center overflow-visible px-20">
        {/* Navigation arrows */}
        {currentPage > 0 && (
          <button
            onClick={prevPage}
            disabled={isFlipping}
            className="absolute -left-16 z-20 glass-panel hover:glass-pink text-white rounded-full p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {currentPage < totalPages - 2 && (
          <button
            onClick={nextPage}
            disabled={isFlipping}
            className="absolute -right-16 z-20 glass-panel hover:glass-pink text-white rounded-full p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Open book */}
        <div className="relative w-full h-full flex items-center justify-center perspective-1000">
          <div
            className={`relative w-full h-full flex shadow-2xl transition-all duration-600 ${
              isFlipping ? 'scale-95' : 'scale-100'
            }`}
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Left page */}
            <div
              className="w-1/2 h-full bg-[#FFF8DC] border-r-2 border-[#D2691E] relative overflow-hidden"
              style={{
                boxShadow: 'inset -10px 0 20px rgba(0,0,0,0.1)',
              }}
            >
              <PageContent
                pageNumber={currentPage}
                book={currentBook}
                offenses={offenses}
                relationship={relationship}
                onRecordContact={handleRecordContact}
              />
            </div>

            {/* Right page */}
            <div
              className="w-1/2 h-full bg-[#FFF8DC] border-l-2 border-[#D2691E] relative overflow-hidden"
              style={{
                boxShadow: 'inset 10px 0 20px rgba(0,0,0,0.1)',
              }}
            >
              <PageContent
                pageNumber={currentPage + 1}
                book={currentBook}
                offenses={offenses}
                relationship={relationship}
                onRecordContact={handleRecordContact}
              />
            </div>
          </div>
        </div>

        {/* Page counter */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 glass-dark text-white font-serif text-sm px-6 py-3 rounded-full">
          Page {currentPage + 1} of {totalPages}
        </div>
      </div>

      {showOffenseForm && (
        <OffenseForm
          bookId={currentBook.id}
          personName={currentBook.personName}
          onClose={() => setShowOffenseForm(false)}
          onSave={handleOffenseSaved}
        />
      )}

      {showEditModal && (
        <div className="fixed inset-0 glass-dark flex items-center justify-center z-[60] p-4">
          <div className="glass-pink max-w-md w-full p-8 rounded-2xl animate-fade-in">
            <h3 className="text-2xl font-bold text-burn-pink-darker mb-6 font-handwritten">Edit Book</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-burn-black mb-2 font-serif">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-burn-black mb-3 font-serif">Cover Color</label>
                <div className="grid grid-cols-4 gap-3">
                  {COVER_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setEditColor(color.value)}
                      className={`relative h-14 rounded-lg border-4 transition-all ${
                        editColor === color.value
                          ? 'border-burn-pink scale-110 shadow-lg'
                          : 'border-transparent hover:border-burn-gray-light'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {editColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-xl drop-shadow-lg">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleEditSave} className="btn-primary flex-1">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 glass-dark flex items-center justify-center z-50">
          <div className="glass-pink max-w-sm p-6 rounded-2xl animate-fade-in">
            <h3 className="text-2xl font-bold text-red-600 mb-4 font-handwritten">Delete Burn Book?</h3>
            <p className="text-burn-black mb-6 font-serif">
              Are you sure you want to delete the burn book for <strong>{currentBook.personName}</strong>? This action cannot be undone and all entries will be permanently deleted.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
                className="btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PageContentProps {
  pageNumber: number;
  book: Book;
  offenses: Offense[];
  relationship: Relationship | null;
  onRecordContact: () => void;
}

function PageContent({ pageNumber, book, offenses, relationship, onRecordContact }: PageContentProps) {
  if (pageNumber === 0) {
    return <CoverPage book={book} />;
  }

  if (pageNumber === 1) {
    return <AboutPage book={book} relationship={relationship} onRecordContact={onRecordContact} />;
  }

  const offenseIndex = pageNumber - 2;
  const offense = offenses[offenseIndex];

  if (offense) {
    return <OffensePage offense={offense} />;
  }

  return <BlankPage />;
}

function CoverPage({ book }: { book: Book }) {
  return (
    <div
      className="w-full h-full p-12 flex flex-col items-center justify-center relative"
      style={{ backgroundColor: book.coverColor || '#FF69B4' }}
    >
      {/* Top doodles - scattered stars and symbols */}
      <div className="absolute top-8 left-12 font-handwritten text-lg text-black/60 -rotate-12">
        ☆ FILL IN ☆ BLANK ★
      </div>
      <div className="absolute top-12 right-16 font-handwritten text-lg text-black/60 rotate-12">
        ♡ OFF STAR ♡
      </div>

      {/* Hourglass doodle */}
      <div className="absolute top-24 left-8 text-4xl -rotate-45">⏳</div>

      {/* Title with collage-style letters - ransom note effect */}
      <div className="mb-8 text-center relative">
        <div className="flex items-center justify-center gap-1 mb-2">
          {['B', 'U', 'R', 'N'].map((letter, i) => (
            <span
              key={i}
              className="inline-block px-4 py-2 text-5xl font-bold bg-gradient-to-br from-white to-gray-200 shadow-lg border-2 border-black/80"
              style={{
                transform: `rotate(${[3, -2, 1, -3][i]}deg)`,
                fontFamily: i % 2 === 0 ? 'serif' : 'sans-serif',
              }}
            >
              {letter}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1">
          {['B', 'O', 'O', 'K'].map((letter, i) => (
            <span
              key={i}
              className="inline-block px-4 py-2 text-5xl font-bold bg-gradient-to-br from-white to-gray-200 shadow-lg border-2 border-black/80"
              style={{
                transform: `rotate(${[-2, 2, -1, 3][i]}deg)`,
                fontFamily: i % 2 === 0 ? 'sans-serif' : 'serif',
              }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      {/* Kiss mark */}
      <div className="text-8xl mb-8 drop-shadow-lg">💋</div>

      {/* Person name */}
      <div className="text-center mb-6">
        <p className="font-handwritten text-4xl text-black font-bold drop-shadow-md">
          {book.personName}
        </p>
      </div>

      {/* Zigzag line */}
      <svg className="absolute left-8 top-1/2 w-16 h-24 -rotate-45" viewBox="0 0 40 80">
        <path d="M 5 5 L 20 20 L 5 35 L 20 50 L 5 65" stroke="black" strokeWidth="3" fill="none" opacity="0.4"/>
      </svg>

      {/* Bottom doodles */}
      <div className="absolute bottom-12 left-8 right-8">
        <div className="font-handwritten text-base text-black/60 -rotate-3">
          <div className="mb-1">⚡ I CAN&apos;T SEE ⚡</div>
          <div className="ml-4">★ MEAN OR SCARY ★</div>
          <div className="ml-8">♡ STAB ♡ EAT ME ♡</div>
        </div>
      </div>

      {/* Corner sticker effect */}
      <div className="absolute bottom-8 right-8 text-4xl rotate-12">😈</div>
    </div>
  );
}

function AboutPage({ book, relationship, onRecordContact }: { book: Book; relationship: Relationship | null; onRecordContact: () => void }) {
  return (
    <div className="w-full h-full p-12 overflow-y-auto">
      <h2 className="font-handwritten text-4xl font-bold text-[#1a1a1a] mb-6 underline">
        About {book.personName}
      </h2>

      <div className="space-y-6 font-handwritten text-lg text-[#1a1a1a]">
        <div>
          <p className="font-bold mb-2">Status:</p>
          <p className="ml-4">
            {relationship ? `${relationship.relationship} — Strength Score: ${relationship.strengthScore}` : 'Keeping tabs on them...'}
          </p>
        </div>

        {relationship?.lastContactDate && (
          <div>
            <p className="font-bold mb-2">Last Contact:</p>
            <p className="ml-4">
              {new Date(relationship.lastContactDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}

        {relationship?.notes && (
          <div>
            <p className="font-bold mb-2">Notes:</p>
            <p className="ml-4 italic">{relationship.notes}</p>
          </div>
        )}

        {relationship && (
          <button
            onClick={onRecordContact}
            className="flex items-center gap-2 px-4 py-2 bg-[#98FF98]/40 hover:bg-[#98FF98]/60 border-2 border-[#2d8a2d]/30 rounded-lg transition-colors"
          >
            <Phone size={18} className="text-[#2d8a2d]" />
            <span className="font-bold text-[#2d8a2d]">Record Contact</span>
          </button>
        )}

        <div className="pt-6 border-t-2 border-dashed border-[#1a1a1a]/20">
          <p className="text-sm italic text-[#1a1a1a]/60">
            This book documents everything they've done. Every. Single. Thing.
          </p>
        </div>
      </div>
    </div>
  );
}

function OffensePage({ offense }: { offense: Offense }) {
  return (
    <div className="w-full h-full p-12 overflow-y-auto">
      {/* Date header */}
      <div className="text-right mb-4">
        <p className="font-handwritten text-sm text-[#1a1a1a]/60">
          {new Date(offense.occurrenceDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Title */}
      <h3 className="font-handwritten text-3xl font-bold text-[#1a1a1a] mb-4 underline">
        {offense.title}
      </h3>

      {/* Severity indicator */}
      <div className="mb-4 flex items-center gap-2">
        <span className="font-handwritten text-lg font-bold">Offense Level:</span>
        <div className="flex gap-1">
          {Array.from({ length: offense.severity }).map((_, i) => (
            <span key={i} className="text-[#FF1493] text-2xl">🔥</span>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3 font-handwritten text-lg text-[#1a1a1a] leading-relaxed">
        <p>{offense.description}</p>

        {offense.evidence.notes && (
          <div className="mt-6 p-4 bg-[#FFE4E1] border-l-4 border-[#FF1493] rounded">
            <p className="font-bold mb-2">Evidence:</p>
            <p className="italic">{offense.evidence.notes}</p>
          </div>
        )}

        {offense.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {offense.categories.map((cat, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-[#FF69B4]/20 rounded-full text-sm font-bold"
              >
                #{cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlankPage() {
  return (
    <div className="w-full h-full p-12">
      {/* Lined paper effect */}
      <div className="w-full h-full relative">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px bg-[#87CEEB]/20"
            style={{ top: `${(i + 1) * 5}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}
