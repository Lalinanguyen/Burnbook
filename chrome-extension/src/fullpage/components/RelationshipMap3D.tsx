import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Sphere } from '@react-three/drei';
import { Home } from 'lucide-react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { Book, Offense } from '../../shared/types';
import { RelationshipModel } from '../../shared/models';
import * as THREE from 'three';

interface RelationshipMap3DProps {
  onSelectRelationship?: (book: Book) => void;
  onClose: () => void;
}

interface RelationshipData {
  book: Book;
  offenses: Offense[];
  position: [number, number, number];
  color: string;
  scale: number;
  strengthScore: number;
}

function calculatePosition(strengthScore: number, index: number, total: number): [number, number, number] {
  const radius = strengthScore >= 90 ? 3 :
                 strengthScore >= 70 ? 5 :
                 strengthScore >= 40 ? 7 : 10;

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = goldenAngle * index;
  const phi = Math.acos(1 - 2 * (index + 0.5) / total);

  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  ];
}

function getStatusColor(strengthScore: number): string {
  if (strengthScore >= 90) return '#10B981';
  if (strengthScore >= 70) return '#3B82F6';
  if (strengthScore >= 40) return '#F59E0B';
  return '#EF4444';
}

function getScaleFromOffenseCount(count: number): number {
  if (count === 0) return 0.3;
  if (count <= 5) return 0.5;
  if (count <= 10) return 0.8;
  return 1.2;
}

interface RelationshipNodeProps {
  data: RelationshipData;
  onClick: () => void;
}

function RelationshipNode({ data, onClick }: RelationshipNodeProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={data.position}>
      <mesh
        ref={meshRef}
        scale={data.scale * (hovered ? 1.2 : 1)}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={data.color}
          emissive={hovered ? '#ff69b4' : '#000000'}
          emissiveIntensity={hovered ? 0.5 : 0}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {hovered && (
        <Html distanceFactor={10} center>
          <div className="glass-pink px-3 py-1 rounded-full text-xs whitespace-nowrap pointer-events-none">
            {data.book.personName}
            <div className="text-[10px] text-burn-gray">
              {data.offenses.length} offense{data.offenses.length !== 1 ? 's' : ''}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

interface ParticleFieldProps {
  count: number;
  color: string;
}

function ParticleField({ count, color }: ParticleFieldProps) {
  const particles = useMemo(() => {
    const temp: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 30;
      temp.push([x, y, z]);
    }
    return temp;
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0005;
    }
  });

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const arr = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      arr[i * 3] = p[0];
      arr[i * 3 + 1] = p[1];
      arr[i * 3 + 2] = p[2];
    });
    geom.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geom;
  }, [particles]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial size={0.05} color={color} transparent opacity={0.6} />
    </points>
  );
}

export default function RelationshipMap3D({ onSelectRelationship, onClose }: RelationshipMap3DProps) {
  const [relationshipData, setRelationshipData] = useState<RelationshipData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const books = await db.getAllBooks();

      const data: RelationshipData[] = await Promise.all(
        books.map(async (book, index) => {
          const offenses = await db.getOffensesByBook(book.id);
          const relationships = await db.getRelationshipsByBook(book.id);

          const strengthScore = relationships[0]?.strengthScore ||
            Math.max(0, 50 - (offenses.length * 10));

          const position = calculatePosition(strengthScore, index, books.length);
          const color = getStatusColor(strengthScore);
          const scale = getScaleFromOffenseCount(offenses.length);

          return {
            book,
            offenses,
            position,
            color,
            scale,
            strengthScore
          };
        })
      );

      setRelationshipData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading relationship data:', err);
      setLoading(false);
    }
  };

  const handleSelectRelationship = (data: RelationshipData) => {
    if (onSelectRelationship) {
      onSelectRelationship(data.book);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-burn-pink-darker to-burn-black flex items-center justify-center">
        <div className="glass-pink p-6 rounded-2xl">
          <p className="font-handwritten text-2xl text-burn-pink-darker">
            Loading Relationship Galaxy...
          </p>
        </div>
      </div>
    );
  }

  if (relationshipData.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-burn-pink-darker to-burn-black flex items-center justify-center">
        <div className="glass-pink p-8 rounded-2xl max-w-md text-center">
          <h2 className="font-handwritten text-3xl text-burn-pink-darker mb-4">
            No Relationships Yet
          </h2>
          <p className="font-serif text-burn-gray mb-6">
            Create your first burn book to see it visualized in 3D space!
          </p>
          <button onClick={onClose} className="btn-primary">
            Back to Bookshelf
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-burn-pink-darker to-burn-black">
      <Canvas camera={{ position: [0, 5, 15], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#ff69b4" />

        {relationshipData.map((data) => (
          <RelationshipNode
            key={data.book.id}
            data={data}
            onClick={() => handleSelectRelationship(data)}
          />
        ))}

        <ParticleField count={200} color="#ffb6d9" />

        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={30}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>

      <div className="absolute top-4 left-4 glass-pink p-4 rounded-2xl max-w-xs">
        <h2 className="font-handwritten text-2xl text-burn-pink-darker">
          Relationship Galaxy
        </h2>
        <p className="text-xs text-burn-gray mt-1 font-serif">
          Orbit, zoom, click to explore
        </p>
        <div className="mt-3 space-y-1 text-xs font-serif">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
            <span className="text-burn-black">Excellent (90+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
            <span className="text-burn-black">Good (70-89)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="text-burn-black">Attention (40-69)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
            <span className="text-burn-black">Critical (0-39)</span>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 glass-panel text-white rounded-full p-3 hover:glass-pink transition-all"
      >
        <Home size={20} />
      </button>
    </div>
  );
}
