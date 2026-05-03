import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FireParticlesProps {
  bookHeight: number;
  bookWidth: number;
  active: boolean;
}

const FLAME_COUNT = 350;
const EMBER_COUNT = 120;
const SMOKE_COUNT = 70;
const FLAME_LIFETIME = 0.55;
const EMBER_LIFETIME = 1.6;
const SMOKE_LIFETIME = 2.4;

export default function FireParticles({ bookHeight, bookWidth, active }: FireParticlesProps) {
  const flameRef = useRef<THREE.Points>(null);
  const emberRef = useRef<THREE.Points>(null);
  const smokeRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const wasActiveRef = useRef(false);

  // Main flame
  const flame = useMemo(() => {
    const positions = new Float32Array(FLAME_COUNT * 3);
    const colors = new Float32Array(FLAME_COUNT * 3);
    const ages = new Float32Array(FLAME_COUNT);
    const seeds = new Float32Array(FLAME_COUNT * 3);

    for (let i = 0; i < FLAME_COUNT; i++) {
      ages[i] = Math.random() * FLAME_LIFETIME;
      seeds[i * 3] = (Math.random() - 0.5) * bookWidth * 0.9;
      seeds[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
      seeds[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geo, ages, seeds };
  }, [bookHeight, bookWidth]);

  // Embers
  const ember = useMemo(() => {
    const positions = new Float32Array(EMBER_COUNT * 3);
    const colors = new Float32Array(EMBER_COUNT * 3);
    const ages = new Float32Array(EMBER_COUNT);
    const seeds = new Float32Array(EMBER_COUNT * 5);

    for (let i = 0; i < EMBER_COUNT; i++) {
      ages[i] = Math.random() * EMBER_LIFETIME;
      seeds[i * 5] = (Math.random() - 0.5) * bookWidth * 4.5;
      seeds[i * 5 + 1] = 3 + Math.random() * 6;
      seeds[i * 5 + 2] = (Math.random() - 0.5) * 4;
      seeds[i * 5 + 3] = (Math.random() - 0.5) * bookWidth * 0.6;
      seeds[i * 5 + 4] = (Math.random() - 0.5) * 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geo, ages, seeds };
  }, [bookHeight, bookWidth]);

  // Smoke column
  const smoke = useMemo(() => {
    const positions = new Float32Array(SMOKE_COUNT * 3);
    const colors = new Float32Array(SMOKE_COUNT * 3);
    const ages = new Float32Array(SMOKE_COUNT);
    // seeds: [xBase, zBase, drift, phase]
    const seeds = new Float32Array(SMOKE_COUNT * 4);

    for (let i = 0; i < SMOKE_COUNT; i++) {
      ages[i] = Math.random() * SMOKE_LIFETIME;
      seeds[i * 4] = (Math.random() - 0.5) * bookWidth * 0.6;
      seeds[i * 4 + 1] = (Math.random() - 0.5) * 0.6;
      seeds[i * 4 + 2] = (Math.random() - 0.5) * 0.6;
      seeds[i * 4 + 3] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { geo, ages, seeds };
  }, [bookHeight, bookWidth]);

  // Initial burst: zero half the flame ages on activation for a "whoomph" frame
  useEffect(() => {
    if (active && !wasActiveRef.current) {
      for (let i = 0; i < FLAME_COUNT; i += 2) flame.ages[i] = 0;
      for (let i = 0; i < EMBER_COUNT; i += 2) ember.ages[i] = 0;
    }
    wasActiveRef.current = active;
  }, [active, flame, ember]);

  useFrame((state, delta) => {
    if (!active) return;
    const time = state.clock.elapsedTime;

    // Flickering point light — single highest-impact change for "real fire"
    if (lightRef.current) {
      const baseFlicker = Math.sin(time * 18) * 0.5 + Math.sin(time * 31) * 0.3;
      lightRef.current.intensity = 5 + baseFlicker * 3;
    }

    // --- Main flame update ---
    if (flameRef.current) {
      const posAttr = flameRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = flameRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < FLAME_COUNT; i++) {
        flame.ages[i] += delta;
        const lifeFrac = (flame.ages[i] % FLAME_LIFETIME) / FLAME_LIFETIME;
        const phase = flame.seeds[i * 3 + 2];

        const spreadFactor = 0.5 - 0.25 * lifeFrac + 0.6 * lifeFrac * lifeFrac;
        const turbX = Math.sin(time * 6 + phase) * bookWidth * 0.4 * lifeFrac;
        const turbZ = Math.cos(time * 5 + phase * 1.3) * 0.5 * lifeFrac;

        posAttr.setX(i, flame.seeds[i * 3] * spreadFactor + turbX);
        posAttr.setY(i, bookHeight * 2.8 * Math.pow(lifeFrac, 0.55));
        posAttr.setZ(i, flame.seeds[i * 3 + 1] * spreadFactor + turbZ);

        const flicker = 0.85 + 0.15 * Math.sin(time * 18 + phase * 3);
        let r: number, g: number, b: number;
        if (lifeFrac < 0.15) {
          r = 1; g = 1; b = 0.8 * (1 - lifeFrac / 0.15);
        } else if (lifeFrac < 0.35) {
          const t = (lifeFrac - 0.15) / 0.2;
          r = 1; g = 1 - t * 0.2; b = 0;
        } else if (lifeFrac < 0.65) {
          const t = (lifeFrac - 0.35) / 0.3;
          r = 1; g = 0.8 - t * 0.5; b = 0;
        } else {
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

        const fade = lifeFrac < 0.6 ? 1.0 : 1.0 - (lifeFrac - 0.6) / 0.4;
        colAttr.setXYZ(i, fade, fade * 0.35, 0);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    // --- Smoke update ---
    if (smokeRef.current) {
      const posAttr = smokeRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = smokeRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < SMOKE_COUNT; i++) {
        smoke.ages[i] += delta * 0.55; // smoke rises slower
        const lifeFrac = (smoke.ages[i] % SMOKE_LIFETIME) / SMOKE_LIFETIME;
        const phase = smoke.seeds[i * 4 + 3];
        const drift = smoke.seeds[i * 4 + 2];

        const sway = Math.sin(time * 1.5 + phase) * 0.8 * lifeFrac;
        posAttr.setX(i, smoke.seeds[i * 4] + drift * lifeFrac * 2 + sway);
        // Smoke starts at flame top, rises further with slight acceleration deceleration
        posAttr.setY(i, bookHeight * 2.5 + lifeFrac * bookHeight * 4);
        posAttr.setZ(i, smoke.seeds[i * 4 + 1] + sway * 0.5);

        // Gray, fading from dark to light then transparent
        const brightness = 0.25 + lifeFrac * 0.25;
        const alpha = lifeFrac < 0.2 ? lifeFrac / 0.2 : 1 - (lifeFrac - 0.2) / 0.8;
        colAttr.setXYZ(i, brightness * alpha, brightness * alpha, brightness * alpha);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  });

  if (!active) return null;

  return (
    <>
      {/* Flickering light makes nearby books and shelves glow orange */}
      <pointLight
        ref={lightRef}
        position={[0, bookHeight * 0.8, 0]}
        color="#ff8030"
        intensity={5}
        distance={14}
        decay={1.6}
      />

      <points ref={smokeRef} geometry={smoke.geo}>
        <pointsMaterial
          vertexColors
          size={1.6}
          sizeAttenuation
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>

      <points ref={flameRef} geometry={flame.geo}>
        <pointsMaterial
          vertexColors
          size={1.0}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={emberRef} geometry={ember.geo}>
        <pointsMaterial
          vertexColors
          size={0.22}
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
