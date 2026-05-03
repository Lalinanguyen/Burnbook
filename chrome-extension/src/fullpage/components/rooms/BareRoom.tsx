import React from 'react';
import * as THREE from 'three';

const FLOOR_Y = -2;
const CEILING_Y = 100;
const WALL_X = 100;
const BACK_Z = -85;
const FRONT_Z = 80;

export default function BareRoom() {
  const wallH = CEILING_Y - FLOOR_Y;
  const roomDepth = FRONT_Z - BACK_Z;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, (BACK_Z + FRONT_Z) / 2]} receiveShadow>
        <planeGeometry args={[WALL_X * 2, roomDepth]} />
        <meshStandardMaterial color="#5C3A1E" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CEILING_Y, (BACK_Z + FRONT_Z) / 2]} receiveShadow>
        <planeGeometry args={[WALL_X * 2, roomDepth]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, (FLOOR_Y + CEILING_Y) / 2, BACK_Z]} receiveShadow>
        <planeGeometry args={[WALL_X * 2, wallH]} />
        <meshStandardMaterial color="#EFEBE5" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Front wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, (FLOOR_Y + CEILING_Y) / 2, FRONT_Z]} receiveShadow>
        <planeGeometry args={[WALL_X * 2, wallH]} />
        <meshStandardMaterial color="#EFEBE5" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Left wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-WALL_X, (FLOOR_Y + CEILING_Y) / 2, (BACK_Z + FRONT_Z) / 2]} receiveShadow>
        <planeGeometry args={[roomDepth, wallH]} />
        <meshStandardMaterial color="#EFEBE5" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[WALL_X, (FLOOR_Y + CEILING_Y) / 2, (BACK_Z + FRONT_Z) / 2]} receiveShadow>
        <planeGeometry args={[roomDepth, wallH]} />
        <meshStandardMaterial color="#EFEBE5" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
