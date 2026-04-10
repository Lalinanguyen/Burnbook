import React from 'react';

export default function Shelves() {
  const shelfY = [0, 10, 20, 30];

  return (
    <group>
      {shelfY.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} receiveShadow>
          <boxGeometry args={[40, 1, 8]} />
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[0, 15, -4]} receiveShadow>
        <planeGeometry args={[40, 35]} />
        <meshStandardMaterial color="#D2691E" roughness={0.95} />
      </mesh>
    </group>
  );
}
