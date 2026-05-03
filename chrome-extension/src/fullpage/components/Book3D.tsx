import React, { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Book } from '../../shared/types';
import FireParticles from './FireParticles';

export type BookAnimMode = 'idle' | 'throwing' | 'burning' | 'throw-burn';
export interface BookAnimState {
  mode: BookAnimMode;
  startTime: number;
  velocity?: { vx: number; vy: number; vz: number };
}

interface Book3DProps {
  book: Book;
  position: [number, number, number];
  offenseCount?: number;
  onClick: () => void;
  animState?: BookAnimState;
  onContextMenu: (bookId: string, screenX: number, screenY: number) => void;
  onAnimationEnd: (bookId: string) => void;
  onDragStart?: (bookId: string, screenX: number, screenY: number) => void;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  }
  return (h >>> 0) / 4294967296;
}

const SPINE_CHAR_LIMIT = 12;

function createTextTexture(
  text: string,
  fontSize: number,
  canvasWidth: number,
  canvasHeight: number,
  color = '#ffffff',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const scale = 4;
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${fontSize * scale}px Georgia, serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = scale * 0.5;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.9);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.9);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const THROW_DURATION = 3.0;
const BURN_DURATION = 3.0;
const THROW_FLIGHT = 2.4;
const BURN_FADE = 2.5;
const GRAVITY = 14;
const TRAIL_COUNT = 36;

export default function Book3D({
  book,
  position,
  offenseCount = 0,
  onClick,
  animState,
  onContextMenu,
  onAnimationEnd,
  onDragStart,
}: Book3DProps) {
  const [hovered, setHovered] = useState(false);

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const prevModeRef = useRef<BookAnimMode>('idle');
  const throwParamsRef = useRef({ vx: 0, vy: 0, vz: 0, rotVx: 0, rotVz: 0 });
  const internalPhaseRef = useRef<'anim' | 'respawning'>('anim');
  const respawnStartRef = useRef(0);
  const respawnDoneRef = useRef(false);
  const trailIndexRef = useRef(0);
  const trailFilledRef = useRef(false);

  const baseColor = useMemo(() => new THREE.Color(book.coverColor), [book.coverColor]);
  const ashColor = useMemo(() => new THREE.Color('#555555'), []);
  const lerpColor = useMemo(() => new THREE.Color(), []);

  const trail = useMemo(() => {
    const positions = new Float32Array(TRAIL_COUNT * 3);
    const colors = new Float32Array(TRAIL_COUNT * 3);
    const ages = new Float32Array(TRAIL_COUNT);
    for (let i = 0; i < TRAIL_COUNT; i++) ages[i] = 999;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geo, ages };
  }, []);

  const { width, height, rotation } = useMemo(() => {
    const r1 = hashId(book.id + '1');
    const r2 = hashId(book.id + '2');
    const r3 = hashId(book.id + '3');
    return {
      width: 3 + r1 * 2,
      height: 8 + r2 * 3,
      rotation: r3 * 0.2 - 0.1,
    };
  }, [book.id]);

  const spineLabel = useMemo(() => {
    const upper = book.personName.toUpperCase();
    return upper.length > SPINE_CHAR_LIMIT ? upper.slice(0, SPINE_CHAR_LIMIT - 1) + '…' : upper;
  }, [book.personName]);

  const spineTexture = useMemo(() => createTextTexture(spineLabel, 12, 128, 20), [spineLabel]);
  const coverTexture = useMemo(() => createTextTexture(book.personName, 12, 128, 28), [book.personName]);
  const titleTexture = useMemo(
    () => book.title ? createTextTexture(book.title, 9, 128, 20, '#dddddd') : null,
    [book.title]
  );

  const depth = 0.7;
  const mode = animState?.mode ?? 'idle';
  const isAnimating = mode !== 'idle';
  const isFlying = mode === 'throwing' || mode === 'throw-burn';
  const isBurning = mode === 'burning' || mode === 'throw-burn';

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;
    const group = groupRef.current;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (mode !== prevModeRef.current) {
      if (mode === 'throwing' || mode === 'throw-burn') {
        const vel = animState?.velocity;
        const speed = vel ? Math.sqrt(vel.vx ** 2 + vel.vy ** 2 + vel.vz ** 2) / 25 : 0.5;
        throwParamsRef.current = {
          vx: vel ? vel.vx : (Math.random() - 0.5) * 10,
          vy: vel ? vel.vy : 7 + Math.random() * 4,
          vz: vel ? vel.vz : 9 + Math.random() * 4,
          rotVx: (2 + speed * 6) * (Math.random() > 0.5 ? 1 : -1),
          rotVz: (Math.random() - 0.5) * 5 * Math.max(0.4, speed),
        };
        internalPhaseRef.current = 'anim';
        respawnDoneRef.current = false;
        trailIndexRef.current = 0;
        trailFilledRef.current = false;
        for (let i = 0; i < TRAIL_COUNT; i++) trail.ages[i] = 999;
        group.position.set(...position);
        group.rotation.set(0, rotation, 0);
        group.scale.setScalar(1);
        mat.color.set(book.coverColor);
        mat.opacity = 1;
      } else if (mode === 'burning') {
        internalPhaseRef.current = 'anim';
        respawnDoneRef.current = false;
        group.position.set(...position);
        group.rotation.set(0, rotation, 0);
        group.scale.setScalar(1);
        mat.color.set(book.coverColor);
        mat.opacity = 1;
      } else if (mode === 'idle') {
        respawnDoneRef.current = false;
        group.position.set(...position);
        group.rotation.set(0, rotation, 0);
        group.scale.setScalar(1);
        mat.color.set(book.coverColor);
        mat.opacity = 1;
      }
      prevModeRef.current = mode;
    }

    // Always update trail (even when idle, to age out residual particles)
    if (trailRef.current) {
      const posAttr = trailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = trailRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
      let anyVisible = false;
      for (let i = 0; i < TRAIL_COUNT; i++) {
        trail.ages[i] += delta;
        const lifeFrac = Math.min(trail.ages[i] / 0.6, 1);
        if (lifeFrac < 1) {
          anyVisible = true;
          // Color shifts by life: hot white/orange (throw-burn) or pale blur (throw)
          if (mode === 'throw-burn' || isBurning) {
            const r = 1;
            const g = 0.7 - lifeFrac * 0.7;
            const b = 0.1 - lifeFrac * 0.1;
            const fade = 1 - lifeFrac;
            colAttr.setXYZ(i, r * fade, Math.max(0, g) * fade, Math.max(0, b) * fade);
          } else {
            const fade = (1 - lifeFrac) * 0.6;
            colAttr.setXYZ(i, fade, fade * 0.4, fade * 0.4);
          }
        } else {
          colAttr.setXYZ(i, 0, 0, 0);
        }
      }
      colAttr.needsUpdate = true;
      if (anyVisible) posAttr.needsUpdate = true;
    }

    if (mode === 'idle') return;

    const elapsed = (performance.now() - animState!.startTime) / 1000;
    const animDuration = isFlying ? THROW_DURATION : BURN_DURATION;

    if (internalPhaseRef.current === 'anim') {
      if (isFlying) {
        if (elapsed < THROW_FLIGHT) {
          const { vx, vy, vz, rotVx, rotVz } = throwParamsRef.current;
          group.position.set(
            position[0] + vx * elapsed,
            position[1] + vy * elapsed - 0.5 * GRAVITY * elapsed * elapsed,
            position[2] + vz * elapsed,
          );
          group.rotation.set(rotVx * elapsed, rotation, rotVz * elapsed);
          // throw-burn fades slower so we can see the fiery book longer
          const fadeDuration = mode === 'throw-burn' ? THROW_FLIGHT * 1.3 : THROW_FLIGHT;
          mat.opacity = Math.max(0, 1 - elapsed / fadeDuration);

          // Push current position into trail buffer
          if (trailRef.current) {
            const posAttr = trailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
            const idx = trailIndexRef.current;
            posAttr.setXYZ(idx, group.position.x, group.position.y, group.position.z);
            trail.ages[idx] = 0;
            trailIndexRef.current = (idx + 1) % TRAIL_COUNT;
            if (trailIndexRef.current === 0) trailFilledRef.current = true;
          }
        } else {
          mat.opacity = 0;
        }
      } else if (mode === 'burning') {
        if (elapsed < BURN_FADE) {
          const t = elapsed / BURN_FADE;
          mat.opacity = Math.max(0, 1 - t);
          lerpColor.lerpColors(baseColor, ashColor, t);
          mat.color.copy(lerpColor);
          group.scale.setScalar(1 - t * 0.3);
        } else {
          mat.opacity = 0;
        }
      }

      if (elapsed >= animDuration) {
        internalPhaseRef.current = 'respawning';
        respawnStartRef.current = performance.now();
        group.position.set(position[0], position[1] + 20, position[2]);
        group.rotation.set(0, rotation, 0);
        group.scale.setScalar(1);
        mat.color.set(book.coverColor);
        mat.opacity = 0;
      }
    } else {
      const rElapsed = (performance.now() - respawnStartRef.current) / 1000;
      const origY = position[1];

      if (rElapsed < 0.5) {
        const t = rElapsed / 0.5;
        group.position.y = origY + 20 * (1 - t * t);
        mat.opacity = Math.min(1, t * 3);
      } else if (rElapsed < 0.7) {
        const t = (rElapsed - 0.5) / 0.2;
        group.position.y = origY + t * 3;
        mat.opacity = 1;
      } else if (rElapsed < 0.9) {
        const t = (rElapsed - 0.7) / 0.2;
        group.position.y = origY + 3 * (1 - t);
        mat.opacity = 1;
      } else if (rElapsed < 0.95) {
        const t = (rElapsed - 0.9) / 0.05;
        group.position.y = origY + t * 0.7;
        mat.opacity = 1;
      } else if (rElapsed < 1.0) {
        const t = (rElapsed - 0.95) / 0.05;
        group.position.y = origY + 0.7 * (1 - t);
        mat.opacity = 1;
      } else if (!respawnDoneRef.current) {
        respawnDoneRef.current = true;
        group.position.set(...position);
        group.rotation.set(0, rotation, 0);
        group.scale.setScalar(1);
        mat.color.set(book.coverColor);
        mat.opacity = 1;
        setHovered(false);
        document.body.style.cursor = 'auto';
        onAnimationEnd(book.id);
      }
    }
  });

  return (
    <>
      {/* Trail rendered at scene root so it stays in world space, not transformed by the book group */}
      <points ref={trailRef} geometry={trail.geo} frustumCulled={false}>
        <pointsMaterial
          vertexColors
          size={mode === 'throw-burn' ? 0.9 : 0.5}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
        <mesh
          ref={meshRef}
          castShadow
          receiveShadow
          onClick={(e) => {
            if (isAnimating) return;
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={(e) => {
            if (isAnimating) return;
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
          onPointerDown={(e) => {
            if (isAnimating || !onDragStart) return;
            e.stopPropagation();
            onDragStart(book.id, e.nativeEvent.clientX, e.nativeEvent.clientY);
          }}
          onContextMenu={(e) => {
            if (isAnimating) return;
            e.stopPropagation();
            e.nativeEvent.preventDefault();
            onContextMenu(book.id, e.nativeEvent.clientX, e.nativeEvent.clientY);
          }}
          scale={!isAnimating && hovered ? 1.05 : 1}
        >
          <boxGeometry args={[depth, height, width]} />
          <meshStandardMaterial
            color={book.coverColor}
            roughness={0.7}
            metalness={0.1}
            transparent
            emissive={!isAnimating && hovered ? '#ff69b4' : '#000000'}
            emissiveIntensity={!isAnimating && hovered ? 0.3 : 0}
          />
        </mesh>

        {/* Spine label */}
        <mesh position={[0, 0, width / 2 + 0.01]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[height * 0.7, depth * 0.85]} />
          <meshBasicMaterial map={spineTexture} transparent depthWrite={false} />
        </mesh>

        {/* Front cover name */}
        <mesh
          position={[depth / 2 + 0.01, book.title ? 0.5 : 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[width - 0.5, 1.6]} />
          <meshBasicMaterial map={coverTexture} transparent depthWrite={false} />
        </mesh>

        {titleTexture && (
          <mesh position={[depth / 2 + 0.01, -0.8, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[width - 0.5, 1]} />
            <meshBasicMaterial map={titleTexture} transparent depthWrite={false} />
          </mesh>
        )}

        <FireParticles
          bookHeight={height}
          bookWidth={width}
          active={isBurning}
        />

        {!isAnimating && offenseCount > 0 && (
          <Html
            position={[depth / 2 + 0.1, height / 2 - 0.5, width / 2 - 0.5]}
            distanceFactor={8}
            center
          >
            <div style={{
              background: '#ef4444',
              color: 'white',
              borderRadius: '9999px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              padding: '0 4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}>
              {offenseCount}
            </div>
          </Html>
        )}

        {!isAnimating && hovered && (
          <Html distanceFactor={10} center>
            <div className="glass-pink px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none">
              <div className="font-handwritten text-sm">{book.personName}</div>
              {book.title && (
                <div className="text-[10px] text-burn-gray mt-0.5">{book.title}</div>
              )}
              {offenseCount > 0 && (
                <div className="text-[10px] text-red-500 mt-0.5">{offenseCount} offense{offenseCount !== 1 ? 's' : ''}</div>
              )}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
