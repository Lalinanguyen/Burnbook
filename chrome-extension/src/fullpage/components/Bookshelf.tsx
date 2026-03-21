import React, { useState, useEffect } from 'react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book } from '../../shared/types';
import { Plus, BookOpen } from 'lucide-react';

interface BookshelfProps {
  onSelectBook: (book: Book) => void;
  onCreateBook: () => void;
}

export default function Bookshelf({ onSelectBook, onCreateBook }: BookshelfProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const allBooks = await db.getAllBooks();
    setBooks(allBooks);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-8">
      {/* Bookshelf Header */}
      <div className="text-center mb-12">
        <h1 className="font-handwritten text-6xl font-bold text-[#F5DEB3] mb-3 drop-shadow-lg">
          My Burn Book Collection
        </h1>
        <p className="text-[#DEB887] text-lg font-serif italic">
          "One book per person. Because some people deserve their own chapter."
        </p>
      </div>

      {/* Shelves */}
      <div className="max-w-7xl mx-auto space-y-12">
        {books.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="mx-auto text-[#DEB887] mb-4" size={64} />
            <p className="text-[#F5DEB3] text-2xl font-handwritten mb-6">
              Your shelf is empty...
            </p>
            <button
              onClick={onCreateBook}
              className="inline-flex items-center gap-2 bg-[#FF1493] hover:bg-[#FF69B4] text-white px-8 py-4 rounded-lg font-handwritten text-xl transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={24} />
              Create Your First Burn Book
            </button>
          </div>
        ) : (
          <>
            {/* Render shelves with books */}
            {Array.from({ length: Math.ceil(books.length / 5) }).map((_, shelfIndex) => {
              const shelfBooks = books.slice(shelfIndex * 5, (shelfIndex + 1) * 5);
              return (
                <div key={shelfIndex} className="relative">
                  {/* Shelf backdrop */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-[#654321] to-[#4a2f1a] rounded-sm shadow-2xl"></div>

                  {/* Books on shelf */}
                  <div className="flex items-end gap-4 pb-4 px-4 justify-center">
                    {shelfBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => onSelectBook(book)}
                        onMouseEnter={() => setHoveredBook(book.id)}
                        onMouseLeave={() => setHoveredBook(null)}
                        className="relative group transition-transform duration-300 hover:-translate-y-3"
                        style={{
                          transform: hoveredBook === book.id ? 'translateY(-12px) rotate(-2deg)' : 'rotate(0deg)',
                        }}
                      >
                        <BookSpine book={book} isHovered={hoveredBook === book.id} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Add new book button */}
            <div className="text-center pt-8">
              <button
                onClick={onCreateBook}
                className="inline-flex items-center gap-2 bg-[#FF1493] hover:bg-[#FF69B4] text-white px-6 py-3 rounded-lg font-handwritten text-lg transition-all shadow-lg hover:shadow-xl"
              >
                <Plus size={20} />
                Add Another Book
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface BookSpineProps {
  book: Book;
  isHovered: boolean;
}

function BookSpine({ book, isHovered }: BookSpineProps) {
  return (
    <div
      className="relative w-16 h-80 rounded-sm shadow-xl transition-all duration-300"
      style={{
        backgroundColor: book.coverColor || '#FF69B4',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {/* Book spine details */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-white/10 rounded-sm"></div>

      {/* Title on spine */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="transform -rotate-90 whitespace-nowrap text-white font-handwritten text-sm font-bold drop-shadow-lg"
          style={{ width: '280px' }}
        >
          {book.title || book.personName}
        </div>
      </div>

      {/* Decorative lines */}
      <div className="absolute top-2 left-0 right-0 h-px bg-white/30"></div>
      <div className="absolute bottom-2 left-0 right-0 h-px bg-white/30"></div>

      {/* Hover glow */}
      {isHovered && (
        <div className="absolute inset-0 bg-white/20 rounded-sm animate-pulse"></div>
      )}
    </div>
  );
}
