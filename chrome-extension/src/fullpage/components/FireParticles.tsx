import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FireParticlesProps {
  bookHeight: number;
  bookWidth: number;
  active: boolean;
}

const FLAME_COUNT = 200;
const EMBER_COUNT = 60;
const FLAME_LIFETIME = 0.55;
const EMBER_LIFETIME = 1.6;

export default function FireParticles({ bookHeight, bookWidth, active }: FireParticlesProps) {
  const flameRef = useRef<THREE.Points>(null);
  const emberRef = useRef<THREE.Points>(null);

  // Main flame geometry + per-particle data
  const flame = useMemo(() => {
    const positions = new Float32Array(FLAME_COUNT * 3);
    const colors = new Float32Array(FLAME_COUNT * 3);
    const ages = new Float32Array(FLAME_COUNT);
    // seeds: [xBase, zBase, phaseOffset]
    const seeds = new Float32Array(FLAME_COUNT * 3);

    for (let i = 0; i < FLAME_COUNT; i++) {
      ages[i] = Math.random() * FLAME_LIFETIME;
      seeds[i * 3] = (Math.random() - 0.5) * bookWidth * 0.9;
      seeds[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
      seeds[i * 3 + 2] = Math.random() * Math.PI * 2;
      positions[i * 3] = seeds[i * 3];
      positions[i * 3 + 2] = seeds[i * 3 + 1];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geo, ages, seeds };
  }, [bookHeight, bookWidth]);

  // Ember geometry + per-particle data
  const ember = useMemo(() => {
    const positions = new Float32Array(EMBER_COUNT * 3);
    const colors = new Float32Array(EMBER_COUNT * 3);
    const ages = new Float32Array(EMBER_COUNT);
    // seeds: [launchVx, launchVy, launchVz, xBase, zBase]
    const seeds = new Float32Array(EMBER_COUNT * 5);

    for (let i = 0; i < EMBER_COUNT; i++) {
      ages[i] = Math.random() * EMBER_LIFETIME;
      seeds[i * 5] = (Math.random() - 0.5) * bookWidth * 3.5;   // vx
      seeds[i * 5 + 1] = 2 + Math.random() * 5;                 // vy (upward launch)
      seeds[i * 5 + 2] = (Math.random() - 0.5) * 3;             // vz
      seeds[i * 5 + 3] = (Math.random() - 0.5) * bookWidth * 0.6; // xBase
      seeds[i * 5 + 4] = (Math.random() - 0.5) * 0.5;           // zBase
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geo, ages, seeds };
  }, [bookHeight, bookWidth]);

  useFrame((state, delta) => {
    if (!active) return;
    const time = state.clock.elapsedTime;

    // --- Main flame update ---
    if (flameRef.current) {
      const posAttr = flameRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = flameRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < FLAME_COUNT; i++) {
        flame.ages[i] += delta;
        const lifeFrac = (flame.ages[i] % FLAME_LIFETIME) / FLAME_LIFETIME;
        const phase = flame.seeds[i * 3 + 2];

        // Cone spread: wide base, taper mid, flare top
        const spreadFactor = 0.5 - 0.25 * lifeFrac + 0.6 * lifeFrac * lifeFrac;
        const turbX = Math.sin(time * 6 + phase) * bookWidth * 0.35 * lifeFrac;
        const turbZ = Math.cos(time * 5 + phase * 1.3) * 0.4 * lifeFrac;

        posAttr.setX(i, flame.seeds[i * 3] * spreadFactor + turbX);
        // Accelerating rise: fast early, slow at top
        posAttr.setY(i, bookHeight * 2.5 * Math.pow(lifeFrac, 0.6));
        posAttr.setZ(i, flame.seeds[i * 3 + 1] * spreadFactor + turbZ);

        // Color: white-hot → yellow → orange → deep red, with flicker
        const flicker = 0.85 + 0.15 * Math.sin(time * 18 + phase * 3);
        let r: number, g: number, b: number;
        if (lifeFrac < 0.15) {
          // White-hot core
          r = 1; g = 1; b = 0.8 * (1 - lifeFrac / 0.15);
        } else if (lifeFrac < 0.35) {
          // Yellow
          const t = (lifeFrac - 0.15) / 0.2;
          r = 1; g = 1 - t * 0.2; b = 0;
        } else if (lifeFrac < 0.65) {
          // Orange
          const t = (lifeFrac - 0.35) / 0.3;
          r = 1; g = 0.8 - t * 0.5; b = 0;
        } else {
          // Deep red fading out
          const t = (lifeFrac - 0.65) / 0.35;
          r = 1 - t * 0.4; g = 0.3 - t * 0.3; b = 0;
        }
        colAttr.setXYZ(i, r * flicker, g * flicker, b);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    // --- Ember update ---
    if (emberRef.current) {
      const posAttr = emberRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = emberRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
      const gravity = 9;

      for (let i = 0; i < EMBER_COUNT; i++) {
        ember.ages[i] += delta;
        const t = (ember.ages[i] % EMBER_LIFETIME);
        const lifeFrac = t / EMBER_LIFETIME;
        const vx = ember.seeds[i * 5];
        const vy = ember.seeds[i * 5 + 1];
        const vz = ember.seeds[i * 5 + 2];
        const xBase = ember.seeds[i * 5 + 3];
        const zBase = ember.seeds[i * 5 + 4];

        posAttr.setX(i, xBase + vx * t);
        posAttr.setY(i, vy * t - 0.5 * gravity * t * t);
        posAttr.setZ(i, zBase + vz * t);

        // Orange → dark red, fade out past 60% life
        const fade = lifeFrac < 0.6 ? 1.0 : 1.0 - (lifeFrac - 0.6) / 0.4;
        colAttr.setXYZ(i, fade, fade * 0.35, 0);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  });

  if (!active) return null;

  return (
    <>
      <points ref={flameRef} geometry={flame.geo}>
        <pointsMaterial
          vertexColors
          size={0.75}
          sizeAttenuation
          transparent
          opacity={0.92}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={emberRef} geometry={ember.geo}>
        <pointsMaterial
          vertexColors
          size={0.18}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
