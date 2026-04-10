import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Plus } from 'lucide-react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book } from '../../shared/types';
import Shelves from './Shelves';
import Book3D from './Book3D';

interface Bookshelf3DProps {
  onSelectBook: (book: Book) => void;
  onCreateBook: () => void;
}

function calculateBookPosition(bookIndex: number, totalBooks: number): [number, number, number] {
  const booksPerShelf = 6;
  const shelfIndex = Math.floor(bookIndex / booksPerShelf);
  const positionOnShelf = bookIndex % booksPerShelf;

  const y = shelfIndex * 10 + 5;

  const shelfWidth = 36;
  const startX = -shelfWidth / 2 + 2;
  const spacing = shelfWidth / booksPerShelf;
  const x = startX + positionOnShelf * spacing;

  const z = -2;

  return [x, y, z];
}

export default function Bookshelf3D({ onSelectBook, onCreateBook }: Bookshelf3DProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const allBooks = await db.getAllBooks();
      setBooks(allBooks.filter(b => !b.archived));
      setLoading(false);
    } catch (err) {
      console.error('Error loading books:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-burn-cream to-burn-pink-light flex items-center justify-center">
        <div className="glass-pink p-6 rounded-2xl">
          <p className="font-handwritten text-2xl text-burn-pink-darker">
            Loading Bookshelf...
          </p>
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-burn-cream to-burn-pink-light">
        <div className="glass-pink p-8 rounded-2xl text-center">
          <h2 className="font-handwritten text-3xl mb-4">Empty Bookshelf</h2>
          <p className="text-burn-gray mb-6 font-serif">Create your first burn book to see it here</p>
          <button onClick={onCreateBook} className="btn-primary">
            Create Book
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-burn-cream to-burn-pink-light">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 15, 25]} fov={50} />

        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
        <pointLight position={[0, 15, -5]} color="#ff69b4" intensity={0.5} />

        <Shelves />

        {books.map((book, index) => (
          <Book3D
            key={book.id}
            book={book}
            position={calculateBookPosition(index, books.length)}
            onClick={() => onSelectBook(book)}
          />
        ))}

        <OrbitControls
          enablePan={false}
          minDistance={15}
          maxDistance={40}
          autoRotate
          autoRotateSpeed={0.2}
        />
      </Canvas>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 right-4 pointer-events-auto">
          <button
            onClick={onCreateBook}
            className="glass-pink px-4 py-2 rounded-full flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus size={20} />
            Create Book
          </button>
        </div>

        <div className="absolute bottom-4 left-4 glass-dark text-white px-4 py-2 rounded-full">
          {books.length} {books.length === 1 ? 'Book' : 'Books'}
        </div>
      </div>
    </div>
  );
}
