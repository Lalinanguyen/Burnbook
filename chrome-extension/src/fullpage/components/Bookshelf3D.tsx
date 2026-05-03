import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book, Offense } from '../../shared/types';
import Shelves from './Shelves';
import Book3D, { BookAnimState, BookAnimMode } from './Book3D';
import Room, { RoomTheme } from './Room';

interface Bookshelf3DProps {
  onSelectBook: (book: Book) => void;
  onCreateBook: () => void;
}

const SHELF_Y = [0, 10, 20, 30];
const BOOKS_PER_SHELF = 6;
const SHELF_THICKNESS = 1;
// Shift the cabinet so its back panel kisses the room's back wall (room BACK_Z = -85).
// Cabinet's local back panel is at z = -4, so offset = -80 puts it at z = -84.
const SHELF_BACK_OFFSET_Z = -80;
const HOLD_THRESHOLD_MS = 220;       // shorter than this = click; longer = throw charge
const MAX_CHARGE_MS = 1200;          // hold this long for full-power throw
const MAX_THROW_SPEED = 60;
const SHAKE_DURATION = 0.35;
const EYE_LEVEL_Y = 6;
const WALK_SPEED = 28;
// Room interior bounds (must match GirlsRoom/BareRoom geometry)
const BOUND_X = 95;
const BOUND_Z_MIN = -80;
const BOUND_Z_MAX = 75;
// Bookshelf collision box (front-facing) — covers the shifted cabinet plus a small front buffer
const SHELF_BOX = { xMin: -22, xMax: 22, zMin: -86, zMax: -75 };

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

  return [x, y, SHELF_BACK_OFFSET_Z + (-2)];
}

interface QuickStats {
  totalOffenses: number;
  avgSeverity: number;
  mostRecent: Date | null;
}

interface HoldState {
  bookId: string;
  startTime: number;
}

interface ShakeRefState {
  strength: number;
  startTime: number;
}

// Runs inside Canvas: modulates camera.position each frame.
// IMPORTANT: priority must be 0 (default) — non-zero priority disables R3F auto-render.
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

// Press B while crosshair is on a book to burn it. Works both pointer-locked (raycasts from
// screen center) and unlocked (uses last cursor position). Bypasses R3F's per-mesh handlers
// because they're unreliable under PointerLockControls.
function BurnOnBKey({ onBurn, locked }: { onBurn: (bookId: string) => void; locked: boolean }) {
  const { camera, scene, gl } = useThree();
  const lastCursorRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      lastCursorRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const handler = (e: KeyboardEvent) => {
      if (e.code !== 'KeyB') return;
      // Don't fire while typing in an input field
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (locked) {
        ndc.set(0, 0);
      } else {
        const rect = gl.domElement.getBoundingClientRect();
        const cx = lastCursorRef.current.x;
        const cy = lastCursorRef.current.y;
        ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
      }

      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          const bookId = obj.userData?.bookId;
          if (typeof bookId === 'string') {
            onBurn(bookId);
            return;
          }
          obj = obj.parent;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [camera, scene, gl, locked, onBurn]);
  return null;
}

const KEY_BINDINGS: Record<string, 'forward' | 'backward' | 'left' | 'right'> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

// FPS-style WASD walking with pointer lock looking. Clamps camera to room bounds and
// pushes the player out of the bookshelf collision box. Updates `forwardRef` each frame
// so the parent component can throw books in the direction the camera is facing.
function FPSControls({ forwardRef }: { forwardRef: React.MutableRefObject<THREE.Vector3> }) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_BINDINGS[e.code];
      if (dir) keysRef.current[dir] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEY_BINDINGS[e.code];
      if (dir) keysRef.current[dir] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-4) forward.set(0, 0, -1);
    forward.normalize();
    forwardRef.current.copy(forward);

    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const move = new THREE.Vector3();
    const k = keysRef.current;
    if (k.forward) move.add(forward);
    if (k.backward) move.sub(forward);
    if (k.right) move.add(right);
    if (k.left) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(WALK_SPEED * delta);
      camera.position.x += move.x;
      camera.position.z += move.z;
    }

    // Stay at eye level + clamp to room bounds
    camera.position.y = EYE_LEVEL_Y;
    camera.position.x = Math.max(-BOUND_X, Math.min(BOUND_X, camera.position.x));
    camera.position.z = Math.max(BOUND_Z_MIN, Math.min(BOUND_Z_MAX, camera.position.z));

    // Bookshelf collision: if the player ends up inside the shelf box, push them to nearest edge.
    if (
      camera.position.x > SHELF_BOX.xMin && camera.position.x < SHELF_BOX.xMax &&
      camera.position.z > SHELF_BOX.zMin && camera.position.z < SHELF_BOX.zMax
    ) {
      const dx = Math.min(camera.position.x - SHELF_BOX.xMin, SHELF_BOX.xMax - camera.position.x);
      const dz = Math.min(camera.position.z - SHELF_BOX.zMin, SHELF_BOX.zMax - camera.position.z);
      if (dz < dx) {
        camera.position.z = camera.position.z < (SHELF_BOX.zMin + SHELF_BOX.zMax) / 2
          ? SHELF_BOX.zMin
          : SHELF_BOX.zMax;
      } else {
        camera.position.x = camera.position.x < (SHELF_BOX.xMin + SHELF_BOX.xMax) / 2
          ? SHELF_BOX.xMin
          : SHELF_BOX.xMax;
      }
    }
  });

  return null;
}

export default function Bookshelf3D({ onSelectBook, onCreateBook }: Bookshelf3DProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [offenses, setOffenses] = useState<Offense[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookAnimStates, setBookAnimStates] = useState<Record<string, BookAnimState>>({});
  const [holdState, setHoldState] = useState<HoldState | null>(null);
  const [chargePower, setChargePower] = useState(0);
  const [roomTheme, setRoomTheme] = useState<RoomTheme>('girls');
  const [isLocked, setIsLocked] = useState(false);

  const holdReachedRef = useRef(false);
  const holdStateRef = useRef<HoldState | null>(null);
  const shakeRef = useRef<ShakeRefState>({ strength: 0, startTime: 0 });
  const cameraForwardRef = useRef(new THREE.Vector3(0, 0, -1));

  useEffect(() => {
    loadData();
  }, []);

  // Hold-to-charge throw tracking. While LMB is held on a book, charge ramps up over MAX_CHARGE_MS.
  // On release: if held longer than HOLD_THRESHOLD_MS, fire a throw in the direction the camera is
  // facing with velocity scaled by charge. Shorter than that = a click (Book3D's onClick fires).
  useEffect(() => {
    if (!holdState) return;

    let raf = 0;
    const tick = () => {
      const hs = holdStateRef.current;
      if (!hs) return;
      const elapsed = performance.now() - hs.startTime;
      if (elapsed > HOLD_THRESHOLD_MS) holdReachedRef.current = true;
      const charge = Math.min(elapsed / MAX_CHARGE_MS, 1);
      setChargePower(charge);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const handleMouseUp = (e: MouseEvent) => {
      const hs = holdStateRef.current;
      if (!hs) return;

      const elapsed = performance.now() - hs.startTime;
      if (elapsed > HOLD_THRESHOLD_MS) {
        const power = Math.min(elapsed / MAX_CHARGE_MS, 1);
        const speed = (0.3 + 0.7 * power) * MAX_THROW_SPEED;

        // Throw books OUT of the wall and into the room — opposite of camera-forward
        // (when targeting a book, the camera faces the wall, so negate to fly away from it).
        const fwd = cameraForwardRef.current;
        const vx = -fwd.x * speed;
        const vz = -fwd.z * speed;
        const vy = 8 + power * 14; // small upward arc

        const mode: BookAnimMode = e.shiftKey ? 'throw-burn' : 'throwing';
        triggerAnim(hs.bookId, mode, { vx, vy, vz });

        const shakeStrength = (mode === 'throw-burn' ? 0.55 : 0.35) * (0.4 + power * 0.6);
        shakeRef.current = { strength: shakeStrength, startTime: performance.now() };
      }

      cancelAnimationFrame(raf);
      holdStateRef.current = null;
      setHoldState(null);
      setChargePower(0);
      // Reset on next tick so Book3D's click handler can check our flag this turn
      setTimeout(() => { holdReachedRef.current = false; }, 0);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [holdState]);

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
    try {
      const settings = await db.getUserSettings();
      if (settings?.roomTheme) setRoomTheme(settings.roomTheme);
    } catch (err) {
      console.error('Error loading settings:', err);
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

  const handleAnimationEnd = useCallback((bookId: string) => {
    setBookAnimStates(prev => {
      const next = { ...prev };
      delete next[bookId];
      return next;
    });
  }, []);

  // Right-click on a book is a no-op now (still preventDefault inside Book3D so the native
  // context menu doesn't pop up). Burn is bound to the B key instead.
  const handleContextMenu = useCallback((_bookId: string, _x: number, _y: number) => {
    // intentionally empty
  }, []);

  const handleBurnBook = useCallback((bookId: string) => {
    triggerAnim(bookId, 'burning');
  }, [triggerAnim]);

  const handleDragStart = useCallback((bookId: string, _screenX: number, _screenY: number) => {
    holdReachedRef.current = false;
    const hs = { bookId, startTime: performance.now() };
    holdStateRef.current = hs;
    setHoldState(hs);
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
          <PerspectiveCamera makeDefault position={[0, EYE_LEVEL_Y, 30]} fov={70} />

          <ambientLight intensity={0.75} />
          <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
          <directionalLight position={[-8, 10, 5]} intensity={0.3} />

          <Room theme={roomTheme} />

          <group position={[0, 0, SHELF_BACK_OFFSET_Z]}>
            <Shelves />
          </group>

          {books.map((book, index) => (
            <Book3D
              key={book.id}
              book={book}
              position={calculateBookPosition(index, book.id)}
              offenseCount={offenseCountByBook[book.id] || 0}
              onClick={() => {
                if (holdReachedRef.current) return;
                onSelectBook(book);
              }}
              animState={bookAnimStates[book.id]}
              onContextMenu={handleContextMenu}
              onAnimationEnd={handleAnimationEnd}
              onDragStart={handleDragStart}
            />
          ))}

          <FPSControls forwardRef={cameraForwardRef} />
          <PointerLockControls
            onLock={() => setIsLocked(true)}
            onUnlock={() => setIsLocked(false)}
          />
          <BurnOnBKey onBurn={handleBurnBook} locked={isLocked} />

          <CameraShake shakeRef={shakeRef} />
        </Canvas>
      </div>

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

      {/* Crosshair (only visible when pointer is locked / in walking mode) */}
      {isLocked && (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/70 mix-blend-difference"
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }}
        />
      )}

      {/* Charge bar overlay while holding LMB on a book */}
      {chargePower > 0.05 && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6">
          <div className="w-32 h-2 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${Math.round(chargePower * 100)}%`,
                background: chargePower > 0.85 ? '#ff5020' : '#FF1493',
                transition: 'width 60ms linear',
              }}
            />
          </div>
        </div>
      )}

      {/* Click-to-walk prompt when not locked */}
      {!isLocked && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-pink px-4 py-2 rounded-xl text-sm font-handwritten text-burn-pink-darker opacity-90">
          Click anywhere to walk · Esc to exit
        </div>
      )}

      <div className="absolute bottom-4 right-4 glass-pink px-3 py-2 rounded-xl text-xs font-serif pointer-events-none opacity-70 leading-relaxed">
        WASD to walk · Mouse to look<br />
        Click book to open · Hold LMB to charge throw<br />
        Shift+release for throw + burn · Press B to burn
      </div>
    </div>
  );
}
