import React, { useState, useRef } from 'react';
import { Html } from '@react-three/drei';
import { Book } from '../../shared/types';
import * as THREE from 'three';

interface Book3DProps {
  book: Book;
  position: [number, number, number];
  onClick: () => void;
}

export default function Book3D({ book, position, onClick }: Book3DProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const width = 3 + Math.random() * 2;
  const height = 8 + Math.random() * 4;
  const depth = 0.7;

  const randomRotation = Math.random() * 0.2 - 0.1;

  return (
    <group position={position} rotation={[0, randomRotation, 0]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
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

      {hovered && (
        <Html distanceFactor={10} center>
          <div className="glass-pink px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none">
            <div className="font-handwritten text-sm">{book.personName}</div>
            {book.title && (
              <div className="text-[10px] text-burn-gray mt-0.5">{book.title}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
