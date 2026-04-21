import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
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
const DRAG_THRESHOLD = 12;   // px before it counts as a drag
const MAX_DRAG_PX = 280;     // px for full-power throw
const MAX_THROW_SPEED = 26;  // scene units/s

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

export default function Bookshelf3D({ onSelectBook, onCreateBook }: Bookshelf3DProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookAnimStates, setBookAnimStates] = useState<Record<string, BookAnimState>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<any>(null);
  // Tracks whether the current mousedown became a real drag (suppresses the click event)
  const dragThresholdReachedRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null); // sync ref for event handlers

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

  // Drag tracking — mousemove and mouseup on window
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
        // Compute throw velocity from drag vector
        const dx = ds.currentX - ds.startX;
        const dy = ds.currentY - ds.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(dist / MAX_DRAG_PX, 1);
        const speed = power * MAX_THROW_SPEED;

        const vx = (dx / Math.max(dist, 1)) * speed;
        const vy = (-dy / Math.max(dist, 1)) * speed; // screen Y is inverted
        const vz = 5 + power * 12;

        triggerAnim(ds.bookId, 'throwing', { vx, vy, vz });
      }

      // Restore OrbitControls and reset drag
      if (orbitRef.current) orbitRef.current.enabled = true;
      dragStateRef.current = null;
      setDragState(null);

      // Reset threshold flag after a tick so the click event can check it
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
  }, [triggerAnim]);

  const handleBurn = useCallback((bookId: string) => {
    setContextMenu(null);
    triggerAnim(bookId, 'burning');
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

  // Compute drag indicator values
  const dragIndicator = useMemo(() => {
    if (!dragState) return null;
    const dx = dragState.currentX - dragState.startX;
    const dy = dragState.currentY - dragState.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(dist / MAX_DRAG_PX, 1);
    const r = Math.round(power * 220);
    const g = Math.round((1 - power) * 200);
    const color = `rgb(${r}, ${g}, 40)`;
    return { x1: dragState.startX, y1: dragState.startY, x2: dragState.currentX, y2: dragState.currentY, color, power };
  }, [dragState]);

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
      {/* Suppress browser context menu on canvas */}
      <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()}>
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
        </Canvas>
      </div>

      {/* Drag-to-throw indicator */}
      {dragIndicator && (
        <svg
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}
        >
          <defs>
            <marker id="throw-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={dragIndicator.color} />
            </marker>
          </defs>
          {/* Glow line */}
          <line
            x1={dragIndicator.x1} y1={dragIndicator.y1}
            x2={dragIndicator.x2} y2={dragIndicator.y2}
            stroke={dragIndicator.color}
            strokeWidth={8}
            strokeOpacity={0.2}
            strokeLinecap="round"
          />
          {/* Main arrow */}
          <line
            x1={dragIndicator.x1} y1={dragIndicator.y1}
            x2={dragIndicator.x2} y2={dragIndicator.y2}
            stroke={dragIndicator.color}
            strokeWidth={2.5}
            strokeDasharray="10 5"
            markerEnd="url(#throw-arrow)"
            strokeLinecap="round"
          />
          {/* Origin dot */}
          <circle cx={dragIndicator.x1} cy={dragIndicator.y1} r={6} fill={dragIndicator.color} opacity={0.8} />
          {/* Power label */}
          {dragIndicator.power > 0.05 && (
            <text
              x={dragIndicator.x2 + 14}
              y={dragIndicator.y2 + 4}
              fill={dragIndicator.color}
              fontSize={12}
              fontFamily="Georgia, serif"
              fontWeight="bold"
            >
              {Math.round(dragIndicator.power * 100)}%
            </text>
          )}
        </svg>
      )}

      {/* Context menu rendered outside Canvas so it always sits on top */}
      {contextMenu && (
        <div ref={menuRef}>
          <BookContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onThrow={() => handleThrow(contextMenu.bookId)}
            onBurn={() => handleBurn(contextMenu.bookId)}
          />
        </div>
      )}

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

      {/* Hint */}
      <div className="absolute bottom-4 right-4 glass-pink px-3 py-2 rounded-xl text-xs font-serif pointer-events-none opacity-60">
        Click &amp; drag to throw · Right-click to burn
      </div>
    </div>
  );
}
