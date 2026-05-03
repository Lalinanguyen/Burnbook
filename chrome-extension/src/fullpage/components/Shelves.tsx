import React from 'react';
import * as THREE from 'three';

export default function Shelves() {
  const shelfY = [0, 10, 20, 30];
  const shelfWidth = 40;
  const shelfDepth = 8;
  const backWallZ = -4;

  return (
    <group>
      {/* Horizontal shelves */}
      {shelfY.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} receiveShadow castShadow>
          <boxGeometry args={[shelfWidth, 1, shelfDepth]} />
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </mesh>
      ))}

      {/* Back wall */}
      <mesh position={[0, 15, backWallZ]} receiveShadow castShadow>
        <boxGeometry args={[shelfWidth, 35, 0.5]} />
        <meshStandardMaterial color="#D2691E" roughness={0.95} />
      </mesh>

      {/* Left side wall */}
      <mesh position={[-shelfWidth / 2, 15, (backWallZ + shelfDepth / 2) / 2]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 35, shelfDepth - backWallZ]} />
        <meshStandardMaterial color="#A0522D" roughness={0.9} />
      </mesh>

      {/* Right side wall */}
      <mesh position={[shelfWidth / 2, 15, (backWallZ + shelfDepth / 2) / 2]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 35, shelfDepth - backWallZ]} />
        <meshStandardMaterial color="#A0522D" roughness={0.9} />
      </mesh>

      {/* Top panel */}
      <mesh position={[0, 32.5, (backWallZ + shelfDepth / 2) / 2]} receiveShadow castShadow>
        <boxGeometry args={[shelfWidth, 1, shelfDepth - backWallZ]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>

      {/* Bottom panel */}
      <mesh position={[0, -1, (backWallZ + shelfDepth / 2) / 2]} receiveShadow>
        <boxGeometry args={[shelfWidth, 1, shelfDepth - backWallZ]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
    </group>
  );
}
