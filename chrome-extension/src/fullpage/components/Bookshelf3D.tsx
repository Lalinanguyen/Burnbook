import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book, Offense } from '../../shared/types';
import Shelves from './Shelves';
import Book3D, { BookAnimState, BookAnimMode } from './Book3D';
import BookContextMenu from './BookContextMenu';

interface Bookshelf3DProps {
  onSelectBook: (book: Book) => void;
  onCreateBook: () => void;
}

const SHELF_Y = [0, 10, 20, 30];
const BOOKS_PER_SHELF = 6;
const SHELF_THICKNESS = 1;
const DRAG_THRESHOLD = 12;
const MAX_DRAG_PX = 220;
const MAX_THROW_SPEED = 60;
const SHAKE_DURATION = 0.35;

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

interface ContextMenuState {
  bookId: string;
  x: number;
  y: number;
}

interface DragState {
  bookId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ShakeRefState {
  strength: number;
  startTime: number;
}

// Runs inside Canvas: modulates camera.position each frame.
// IMPORTANT: priority must be 0 (default) — non-zero priority disables R3F auto-render.
// Rendered after OrbitControls in JSX order, so its useFrame runs after OrbitControls' .update.
function CameraShake({ shakeRef }: { shakeRef: React.MutableRefObject<ShakeRefState> }) {
  const { camera } = useThree();
  useFrame(() => {
    const s = shakeRef.current;
    if (s.strength <= 0) return;
    const elapsed = (performance.now() - s.startTime) / 1000;
    if (elapsed >= SHAKE_DURATION) {
      shakeRef.current = { strength: 0, startTime: 0 };
      return;
    }
    const decay = 1 - elapsed / SHAKE_DURATION;
    const amp = s.strength * decay;
    const t = elapsed * 60;
    camera.position.x += Math.sin(t * 1.3) * amp;
    camera.position.y += Math.cos(t * 1.7) * amp * 0.6;
  });
  return null;
}

export default function Bookshelf3D({ onSelectBook, onCreateBook }: Bookshelf3DProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookAnimStates, setBookAnimStates] = useState<Record<string, BookAnimState>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<any>(null);
  const dragThresholdReachedRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);
  const shakeRef = useRef<ShakeRefState>({ strength: 0, startTime: 0 });

  useEffect(() => {
    loadData();
  }, []);

  // Dismiss context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  // Drag tracking
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > DRAG_THRESHOLD) dragThresholdReachedRef.current = true;

      const updated = { ...ds, currentX: e.clientX, currentY: e.clientY };
      dragStateRef.current = updated;
      setDragState(updated);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;

      if (dragThresholdReachedRef.current) {
        const dx = ds.currentX - ds.startX;
        const dy = ds.currentY - ds.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(dist / MAX_DRAG_PX, 1);
        const speed = power * MAX_THROW_SPEED;

        const vx = (dx / Math.max(dist, 1)) * speed;
        const vy = (-dy / Math.max(dist, 1)) * speed;
        const vz = 10 + power * 30;

        const mode: BookAnimMode = e.shiftKey ? 'throw-burn' : 'throwing';
        triggerAnim(ds.bookId, mode, { vx, vy, vz });

        // Camera shake — stronger for throw-burn
        const shakeStrength = (mode === 'throw-burn' ? 0.55 : 0.35) * (0.4 + power * 0.6);
        shakeRef.current = { strength: shakeStrength, startTime: performance.now() };
      }

      if (orbitRef.current) orbitRef.current.enabled = true;
      dragStateRef.current = null;
      setDragState(null);

      setTimeout(() => { dragThresholdReachedRef.current = false; }, 0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

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

  const triggerAnim = useCallback((
    bookId: string,
    mode: BookAnimMode,
    velocity?: { vx: number; vy: number; vz: number },
  ) => {
    setBookAnimStates(prev => {
      if (prev[bookId]?.mode && prev[bookId].mode !== 'idle') return prev;
      return { ...prev, [bookId]: { mode, startTime: performance.now(), velocity } };
    });
  }, []);

  const handleThrow = useCallback((bookId: string) => {
    setContextMenu(null);
    triggerAnim(bookId, 'throwing');
    shakeRef.current = { strength: 0.3, startTime: performance.now() };
  }, [triggerAnim]);

  const handleBurn = useCallback((bookId: string) => {
    setContextMenu(null);
    triggerAnim(bookId, 'burning');
  }, [triggerAnim]);

  const handleThrowBurn = useCallback((bookId: string) => {
    setContextMenu(null);
    triggerAnim(bookId, 'throw-burn');
    shakeRef.current = { strength: 0.5, startTime: performance.now() };
  }, [triggerAnim]);

  const handleAnimationEnd = useCallback((bookId: string) => {
    setBookAnimStates(prev => {
      const next = { ...prev };
      delete next[bookId];
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((bookId: string, x: number, y: number) => {
    setContextMenu({ bookId, x, y });
  }, []);

  const handleDragStart = useCallback((bookId: string, screenX: number, screenY: number) => {
    if (orbitRef.current) orbitRef.current.enabled = false;
    dragThresholdReachedRef.current = false;
    const ds = { bookId, startX: screenX, startY: screenY, currentX: screenX, currentY: screenY };
    dragStateRef.current = ds;
    setDragState(ds);
  }, []);

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

  const anyAnimating = useMemo(
    () => Object.values(bookAnimStates).some(s => s.mode !== 'idle'),
    [bookAnimStates]
  );

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
      <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()}>
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 15, 25]} fov={50} />

          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
          <directionalLight position={[-8, 10, 5]} intensity={0.3} />

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
              onClick={() => {
                if (dragThresholdReachedRef.current) return;
                onSelectBook(book);
              }}
              animState={bookAnimStates[book.id]}
              onContextMenu={handleContextMenu}
              onAnimationEnd={handleAnimationEnd}
              onDragStart={handleDragStart}
            />
          ))}

          <OrbitControls
            ref={orbitRef}
            enablePan={false}
            minDistance={15}
            maxDistance={80}
            autoRotate={!anyAnimating && !dragState}
            autoRotateSpeed={0.2}
          />

          <CameraShake shakeRef={shakeRef} />
        </Canvas>
      </div>

      {contextMenu && (
        <div ref={menuRef}>
          <BookContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onThrow={() => handleThrow(contextMenu.bookId)}
            onBurn={() => handleBurn(contextMenu.bookId)}
            onThrowBurn={() => handleThrowBurn(contextMenu.bookId)}
          />
        </div>
      )}

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

      <div className="absolute bottom-4 right-4 glass-pink px-3 py-2 rounded-xl text-xs font-serif pointer-events-none opacity-60">
        Click &amp; drag to throw · Shift+drag to throw + burn · Right-click for menu
      </div>
    </div>
  );
}
