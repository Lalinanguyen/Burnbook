import React, { useState, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Book } from '../../shared/types';

interface Book3DProps {
  book: Book;
  position: [number, number, number];
  offenseCount?: number;
  onClick: () => void;
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

export default function Book3D({ book, position, offenseCount = 0, onClick }: Book3DProps) {
  const [hovered, setHovered] = useState(false);

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

  // Spine label: ALL CAPS, truncated
  const spineLabel = useMemo(() => {
    const upper = book.personName.toUpperCase();
    return upper.length > SPINE_CHAR_LIMIT
      ? upper.slice(0, SPINE_CHAR_LIMIT - 1) + '…'
      : upper;
  }, [book.personName]);

  // Spine text: drawn horizontal on canvas, mesh rotated 90° to read bottom-to-top
  const spineTexture = useMemo(
    () => createTextTexture(spineLabel, 12, 128, 20),
    [spineLabel]
  );

  // Front cover: full person name
  const coverTexture = useMemo(
    () => createTextTexture(book.personName, 12, 128, 28),
    [book.personName]
  );

  // Front cover: title below name if set
  const titleTexture = useMemo(
    () => book.title ? createTextTexture(book.title, 9, 128, 20, '#dddddd') : null,
    [book.title]
  );

  const depth = 0.7;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        scale={hovered ? 1.05 : 1}
      >
        <boxGeometry args={[depth, height, width]} />
        <meshStandardMaterial
          color={book.coverColor}
          roughness={0.7}
          metalness={0.1}
          emissive={hovered ? '#ff69b4' : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {/* Spine label: +Z face, text rotated to read bottom-to-top */}
      <mesh
        position={[0, 0, width / 2 + 0.01]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <planeGeometry args={[height * 0.7, depth * 0.85]} />
        <meshBasicMaterial map={spineTexture} transparent depthWrite={false} />
      </mesh>

      {/* Front cover name: +X face */}
      <mesh
        position={[depth / 2 + 0.01, book.title ? 0.5 : 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[width - 0.5, 1.6]} />
        <meshBasicMaterial map={coverTexture} transparent depthWrite={false} />
      </mesh>

      {/* Front cover title */}
      {titleTexture && (
        <mesh
          position={[depth / 2 + 0.01, -0.8, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[width - 0.5, 1]} />
          <meshBasicMaterial map={titleTexture} transparent depthWrite={false} />
        </mesh>
      )}

      {/* Offense count badge */}
      {offenseCount > 0 && (
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

      {hovered && (
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
  );
}
