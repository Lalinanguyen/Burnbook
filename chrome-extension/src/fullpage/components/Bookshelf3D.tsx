import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book, Offense } from '../../shared/types';
import Shelves from './Shelves';
import Book3D from './Book3D';

interface Bookshelf3DProps {
  onSelectBook: (book: Book) => void;
  onCreateBook: () => void;
}

const SHELF_Y = [0, 10, 20, 30];
const BOOKS_PER_SHELF = 6;
const SHELF_THICKNESS = 1;

function hashId(id: string, salt: string): number {
  const s = id + salt;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return (h >>> 0) / 4294967296;
}

function bookHeight(bookId: string): number {
  return 8 + hashId(bookId, '2') * 3;
}

function calculateBookPosition(bookIndex: number, bookId: string): [number, number, number] {
  const shelfIndex = Math.floor(bookIndex / BOOKS_PER_SHELF);
  const positionOnShelf = bookIndex % BOOKS_PER_SHELF;

  const shelfSurface = SHELF_Y[shelfIndex] + SHELF_THICKNESS / 2;
  const h = bookHeight(bookId);
  const y = shelfSurface + h / 2 + 0.05;

  const shelfWidth = 36;
  const startX = -shelfWidth / 2 + 2;
  const spacing = shelfWidth / BOOKS_PER_SHELF;
  const x = startX + positionOnShelf * spacing;

  return [x, y, -2];
}

interface QuickStats {
  totalOffenses: number;
  avgSeverity: number;
  mostRecent: Date | null;
}

export default function Bookshelf3D({ onSelectBook, onCreateBook }: Bookshelf3DProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allBooks = await db.getAllBooks();
      setBooks(allBooks.filter(b => !b.archived));
    } catch (err) {
      console.error('Error loading books:', err);
    }
    try {
      const allOffenses = await db.getAllOffenses();
      setOffenses(allOffenses);
    } catch (err) {
      console.error('Error loading offenses:', err);
    }
    setLoading(false);
  };

  const offenseCountByBook = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of offenses) {
      counts[o.bookId] = (counts[o.bookId] || 0) + 1;
    }
    return counts;
  }, [offenses]);

  const stats: QuickStats = useMemo(() => {
    if (offenses.length === 0) return { totalOffenses: 0, avgSeverity: 0, mostRecent: null };
    const avgSev = offenses.reduce((sum, o) => sum + o.severity, 0) / offenses.length;
    const dates = offenses.map(o => new Date(o.occurrenceDate).getTime()).filter(t => !isNaN(t));
    const mostRecent = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    return { totalOffenses: offenses.length, avgSeverity: avgSev, mostRecent };
  }, [offenses]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-burn-cream to-burn-pink-light flex items-center justify-center">
        <div className="glass-pink p-6 rounded-2xl">
          <p className="font-handwritten text-2xl text-burn-pink-darker">Loading Bookshelf...</p>
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
          <button onClick={onCreateBook} className="btn-primary">Create Book</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-burn-cream to-burn-pink-light">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 15, 25]} fov={50} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
        <directionalLight position={[-8, 10, 5]} intensity={0.3} />

        {/* Room environment */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[120, 80]} />
          <meshStandardMaterial color="#5C3A1E" roughness={0.95} />
        </mesh>
        <mesh position={[0, 25, -20]} receiveShadow>
          <planeGeometry args={[120, 60]} />
          <meshStandardMaterial color="#F5E6D3" roughness={0.9} />
        </mesh>

        <Shelves />

        {books.map((book, index) => (
          <Book3D
            key={book.id}
            book={book}
            position={calculateBookPosition(index, book.id)}
            offenseCount={offenseCountByBook[book.id] || 0}
            onClick={() => onSelectBook(book)}
          />
        ))}

        <OrbitControls
          enablePan={false}
          minDistance={15}
          maxDistance={80}
          autoRotate
          autoRotateSpeed={0.2}
        />
      </Canvas>

      {/* Quick stats overlay */}
      <div className="absolute bottom-4 left-4 glass-pink px-4 py-3 rounded-xl text-xs font-serif pointer-events-none">
        <div className="font-handwritten text-sm text-burn-pink-darker mb-1">{books.length} book{books.length !== 1 ? 's' : ''}</div>
        {stats.totalOffenses > 0 && (
          <>
            <div className="text-burn-gray">{stats.totalOffenses} offense{stats.totalOffenses !== 1 ? 's' : ''} logged</div>
            <div className="text-burn-gray">Avg severity: {stats.avgSeverity.toFixed(1)}/5</div>
            {stats.mostRecent && (
              <div className="text-burn-gray">Latest: {stats.mostRecent.toLocaleDateString()}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
