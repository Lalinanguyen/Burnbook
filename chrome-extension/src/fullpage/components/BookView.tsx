import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book, Offense, Relationship } from '../../shared/types';
import { ChevronLeft, ChevronRight, X, BookmarkPlus, Home, Plus, Trash2 } from 'lucide-react';
import OffenseForm from './OffenseForm';

interface BookViewProps {
  book: Book;
  onClose: () => void;
}

export default function BookView({ book, onClose }: BookViewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showOffenseForm, setShowOffenseForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        className="absolute top-4 right-4 text-white hover:text-[#FF69B4] transition-colors z-50"
      >
        <Home size={32} />
      </button>

      {/* Add offense button */}
      <button
        onClick={() => setShowOffenseForm(true)}
        className="absolute top-4 left-4 bg-[#FF1493] hover:bg-[#FF69B4] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors z-50"
      >
        <Plus size={20} />
        Add Entry
      </button>

      {/* Delete button */}
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="absolute top-4 left-32 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors z-50"
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
            className="absolute -left-16 z-20 bg-white/20 hover:bg-white/30 text-white rounded-full p-4 transition-all disabled:opacity-50"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {currentPage < totalPages - 2 && (
          <button
            onClick={nextPage}
            disabled={isFlipping}
            className="absolute -right-16 z-20 bg-white/20 hover:bg-white/30 text-white rounded-full p-4 transition-all disabled:opacity-50"
          >
            <ChevronRight size={32} />
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
                book={book}
                offenses={offenses}
                relationship={relationship}
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
                book={book}
                offenses={offenses}
                relationship={relationship}
              />
            </div>
          </div>
        </div>

        {/* Page counter */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white font-serif text-sm bg-black/50 px-4 py-2 rounded-full">
          Pages {currentPage + 1}-{currentPage + 2} of {totalPages}
        </div>
      </div>

      {showOffenseForm && (
        <OffenseForm
          bookId={book.id}
          personName={book.personName}
          onClose={() => setShowOffenseForm(false)}
          onSave={handleOffenseSaved}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm shadow-2xl">
            <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Burn Book?</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the burn book for <strong>{book.personName}</strong>? This action cannot be undone and all entries will be permanently deleted.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
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
}

function PageContent({ pageNumber, book, offenses, relationship }: PageContentProps) {
  if (pageNumber === 0) {
    return <CoverPage book={book} />;
  }

  if (pageNumber === 1) {
    return <AboutPage book={book} relationship={relationship} />;
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

function AboutPage({ book, relationship }: { book: Book; relationship: Relationship | null }) {
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

        {relationship?.notes && (
          <div>
            <p className="font-bold mb-2">Notes:</p>
            <p className="ml-4 italic">{relationship.notes}</p>
          </div>
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
