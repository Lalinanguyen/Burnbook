import React, { useMemo } from 'react';
import * as THREE from 'three';

const FLOOR_Y = -2;
const CEILING_Y = 100;
const WALL_X = 100;
const BACK_Z = -85;
const FRONT_Z = 80;

// Canvas-drawn texture helper. Drop a real image into public/images/ later
// and swap in `new THREE.TextureLoader().load(chrome.runtime.getURL('images/foo.png'))`.
function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function tryLoadImage(filename: string): THREE.Texture | null {
  // Real image swap-in path. Returns null if chrome.runtime not available
  // (e.g., during dev outside extension context); GirlsRoom falls back to canvas placeholder.
  if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return null;
  try {
    const url = chrome.runtime.getURL(`images/${filename}`);
    const tex = new THREE.TextureLoader().load(url, undefined, undefined, () => {
      // onError — texture stays blank; the canvas placeholder is what the user sees
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  } catch {
    return null;
  }
}

export default function GirlsRoom() {
  const wallH = CEILING_Y - FLOOR_Y;
  const roomDepth = FRONT_Z - BACK_Z;
  const roomCenterZ = (BACK_Z + FRONT_Z) / 2;

  // Tzuyu poster — try real image, fall back to a styled canvas placeholder
  const posterTexture = useMemo(() => {
    return tryLoadImage('tzuyu-poster.jpg') ?? makeCanvasTexture(800, 1100, (ctx, w, h) => {
      // Deep gradient background — high contrast so text reads from across the room
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1a0014');
      g.addColorStop(0.5, '#3d0029');
      g.addColorStop(1, '#1a0014');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Pink halo glow behind subject
      const halo = ctx.createRadialGradient(w / 2, h * 0.45, 50, w / 2, h * 0.45, 380);
      halo.addColorStop(0, 'rgba(255, 130, 200, 0.55)');
      halo.addColorStop(0.5, 'rgba(255, 80, 160, 0.22)');
      halo.addColorStop(1, 'rgba(255, 80, 160, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Stylized portrait silhouette (gradient-filled head + shoulders)
      const portraitY = h * 0.38;
      // Hair (long dark behind head)
      ctx.fillStyle = '#0a0006';
      ctx.beginPath();
      ctx.ellipse(w / 2, portraitY + 80, 200, 320, 0, 0, Math.PI * 2);
      ctx.fill();
      // Face oval
      const faceGrad = ctx.createLinearGradient(w / 2 - 100, portraitY - 120, w / 2 + 100, portraitY + 120);
      faceGrad.addColorStop(0, '#FFE0D0');
      faceGrad.addColorStop(1, '#F5C8B8');
      ctx.fillStyle = faceGrad;
      ctx.beginPath();
      ctx.ellipse(w / 2, portraitY, 130, 170, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes (closed/cute)
      ctx.strokeStyle = '#1a0a0a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(w / 2 - 50, portraitY - 10, 18, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2 + 50, portraitY - 10, 18, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      // Lips
      ctx.fillStyle = '#C84872';
      ctx.beginPath();
      ctx.ellipse(w / 2, portraitY + 70, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hair forelock
      ctx.fillStyle = '#0a0006';
      ctx.beginPath();
      ctx.ellipse(w / 2, portraitY - 130, 130, 60, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top label "TWICE" — bright with stroke
      ctx.font = 'bold 90px Helvetica, Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FF1493';
      ctx.lineWidth = 6;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.strokeText('TWICE', w / 2, 130);
      ctx.fillText('TWICE', w / 2, 130);

      // Big "TZUYU" — neon gradient
      const tzGrad = ctx.createLinearGradient(0, 870, 0, 990);
      tzGrad.addColorStop(0, '#FFB6E1');
      tzGrad.addColorStop(0.5, '#FF1493');
      tzGrad.addColorStop(1, '#C8267A');
      ctx.fillStyle = tzGrad;
      ctx.font = 'bold 180px Helvetica, Arial, sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeText('TZUYU', w / 2, 980);
      ctx.fillText('TZUYU', w / 2, 980);

      // Hangul + subtitle
      ctx.font = 'bold 50px serif';
      ctx.fillStyle = '#FFD0E5';
      ctx.fillText('쯔위 · 周子瑜', w / 2, 1040);

      // Sparkle stars
      ctx.font = '48px serif';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('✦', 80, 200);
      ctx.fillText('✧', w - 90, 240);
      ctx.fillText('✦', 70, 920);
      ctx.fillText('✧', w - 90, 880);
    });
  }, []);

  // Hello Kitty-style cute decals as stickers
  const sticker1 = useMemo(() =>
    tryLoadImage('hk1.png') ?? makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = '180px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎀', w / 2, h / 2);
    }), []);
  const sticker2 = useMemo(() =>
    tryLoadImage('hk2.png') ?? makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = '180px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♡', w / 2, h / 2);
      ctx.fillStyle = '#FF69B4';
      ctx.fillText('♡', w / 2, h / 2);
    }), []);
  const sticker3 = useMemo(() =>
    tryLoadImage('hk3.png') ?? makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = '170px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨', w / 2, h / 2);
    }), []);

  // HK plush face decal
  const plushFace = useMemo(() => makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // Face circle background (skip — sphere already white)
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(w * 0.36, h * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * 0.64, h * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    // Nose (yellow)
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.6, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Whiskers
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.55); ctx.lineTo(w * 0.32, h * 0.58);
    ctx.moveTo(w * 0.18, h * 0.62); ctx.lineTo(w * 0.32, h * 0.62);
    ctx.moveTo(w * 0.82, h * 0.55); ctx.lineTo(w * 0.68, h * 0.58);
    ctx.moveTo(w * 0.82, h * 0.62); ctx.lineTo(w * 0.68, h * 0.62);
    ctx.stroke();
    // Pink ribbon (stylized) on the side
    ctx.fillStyle = '#FF1493';
    ctx.beginPath();
    ctx.ellipse(w * 0.85, h * 0.25, 20, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }), []);

  // BURN BOOK sign
  const burnSignTex = useMemo(() => makeCanvasTexture(800, 200, (ctx, w, h) => {
    ctx.fillStyle = '#1a0008';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold italic 110px Georgia, serif';
    ctx.fillStyle = '#FF1493';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 18;
    ctx.fillText('Burn Book', w / 2, h / 2);
  }), []);

  // Cinnamoroll-style face (light blue tint)
  const cinnamorollFace = useMemo(() => makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // Eyes (oval)
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(w * 0.36, h * 0.5, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.64, h * 0.5, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
    // Cheek blush
    ctx.fillStyle = 'rgba(135, 206, 235, 0.7)';
    ctx.beginPath(); ctx.arc(w * 0.28, h * 0.62, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.72, h * 0.62, 10, 0, Math.PI * 2); ctx.fill();
    // Tiny mouth
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.46, h * 0.68);
    ctx.lineTo(w * 0.5, h * 0.71);
    ctx.lineTo(w * 0.54, h * 0.68);
    ctx.stroke();
  }), []);

  // My Melody-style face (with pink hood implied)
  const myMelodyFace = useMemo(() => makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(w * 0.36, h * 0.5, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.64, h * 0.5, 10, 0, Math.PI * 2); ctx.fill();
    // Yellow nose dot
    ctx.fillStyle = '#FFB347';
    ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.6, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Smile
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.65, 12, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Pink bow on top-right
    ctx.fillStyle = '#FF1493';
    ctx.beginPath(); ctx.ellipse(w * 0.78, h * 0.18, 18, 12, 0.3, 0, Math.PI * 2); ctx.fill();
  }), []);

  // Wall art textures
  const polaroidHeart = useMemo(() => makeCanvasTexture(400, 480, (ctx, w, h) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFD9E5';
    ctx.fillRect(20, 20, w - 40, h - 120);
    ctx.font = '180px serif';
    ctx.fillStyle = '#FF1493';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♡', w / 2, (h - 100) / 2);
    ctx.font = 'italic 32px Georgia, serif';
    ctx.fillStyle = '#7A1535';
    ctx.fillText('best day ever', w / 2, h - 50);
  }), []);

  const polaroidBffs = useMemo(() => makeCanvasTexture(400, 480, (ctx, w, h) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(20, 20, 20, h - 100);
    grad.addColorStop(0, '#FFB6E1');
    grad.addColorStop(1, '#C8267A');
    ctx.fillStyle = grad;
    ctx.fillRect(20, 20, w - 40, h - 120);
    ctx.font = 'bold 100px Helvetica, Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BFFs', w / 2, (h - 100) / 2 - 20);
    ctx.font = '80px serif';
    ctx.fillText('♡♡♡', w / 2, (h - 100) / 2 + 60);
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillStyle = '#7A1535';
    ctx.fillText('forever and always', w / 2, h - 50);
  }), []);

  const polaroidSunshine = useMemo(() => makeCanvasTexture(400, 480, (ctx, w, h) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    // Sky gradient
    const sky = ctx.createLinearGradient(20, 20, 20, h - 100);
    sky.addColorStop(0, '#FFE6CC');
    sky.addColorStop(0.5, '#FFC0E0');
    sky.addColorStop(1, '#FFB6E1');
    ctx.fillStyle = sky;
    ctx.fillRect(20, 20, w - 40, h - 120);
    // Sun
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(w / 2, 150, 60, 0, Math.PI * 2); ctx.fill();
    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(80, 220, 24, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(105, 215, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(135, 220, 22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(290, 290, 24, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(320, 285, 30, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'italic 32px Georgia, serif';
    ctx.fillStyle = '#7A1535';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('sunny days', w / 2, h - 50);
  }), []);

  // Wall clock
  const clockFaceTex = useMemo(() => makeCanvasTexture(512, 512, (ctx, w, h) => {
    const r = w / 2;
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.fill();
    // Outer ring
    ctx.strokeStyle = '#FF1493';
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(r, r, r - 12, 0, Math.PI * 2); ctx.stroke();
    // Numbers (12, 3, 6, 9)
    ctx.fillStyle = '#7A1535';
    ctx.font = 'bold 60px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('12', r, 60);
    ctx.fillText('3', w - 50, r);
    ctx.fillText('6', r, h - 50);
    ctx.fillText('9', 50, r);
    // Hour hand (pointing to ~10:10)
    ctx.strokeStyle = '#7A1535';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r, r);
    ctx.lineTo(r - 100, r - 60);
    ctx.stroke();
    // Minute hand
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(r, r);
    ctx.lineTo(r + 130, r - 70);
    ctx.stroke();
    // Center dot
    ctx.fillStyle = '#FF1493';
    ctx.beginPath(); ctx.arc(r, r, 16, 0, Math.PI * 2); ctx.fill();
  }), []);

  // Generic photo frame helper builder
  const Photo = ({ position, rotation, tex, size = [10, 12] }: {
    position: [number, number, number];
    rotation: [number, number, number];
    tex: THREE.Texture;
    size?: [number, number];
  }) => (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[size[0] + 1.2, size[1] + 1.2, 0.4]} />
        <meshStandardMaterial color="#F5E6D3" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.16]}>
        <planeGeometry args={size} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} roughness={0.85} toneMapped={false} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, roomCenterZ]} receiveShadow>
        <planeGeometry args={[WALL_X * 2, roomDepth]} />
        <meshStandardMaterial color="#F5E6D3" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CEILING_Y, roomCenterZ]} receiveShadow>
        <planeGeometry args={[WALL_X * 2, roomDepth]} />
        <meshStandardMaterial color="#FFF5F8" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, (FLOOR_Y + CEILING_Y) / 2, BACK_Z]} receiveShadow>
        <planeGeometry args={[WALL_X * 2, wallH]} />
        <meshStandardMaterial color="#F8C8D9" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Front wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, (FLOOR_Y + CEILING_Y) / 2, FRONT_Z]} receiveShadow>
        <planeGeometry args={[WALL_X * 2, wallH]} />
        <meshStandardMaterial color="#FFD9E5" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Left wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-WALL_X, (FLOOR_Y + CEILING_Y) / 2, roomCenterZ]} receiveShadow>
        <planeGeometry args={[roomDepth, wallH]} />
        <meshStandardMaterial color="#FFD9E5" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[WALL_X, (FLOOR_Y + CEILING_Y) / 2, roomCenterZ]} receiveShadow>
        <planeGeometry args={[roomDepth, wallH]} />
        <meshStandardMaterial color="#FFD9E5" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Pink shaggy rug */}
      <mesh position={[0, FLOOR_Y + 0.05, 8]} receiveShadow>
        <cylinderGeometry args={[28, 28, 0.1, 48]} />
        <meshStandardMaterial color="#FF99C8" roughness={1.0} />
      </mesh>

      {/* Tzuyu poster (frame + canvas) on left wall */}
      <group position={[-WALL_X + 0.2, 22, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Soft halo on the wall behind the frame */}
        <mesh position={[0, 0, -0.2]}>
          <planeGeometry args={[34, 44]} />
          <meshStandardMaterial color="#FF8FBA" emissive="#FF8FBA" emissiveIntensity={0.25} transparent opacity={0.55} />
        </mesh>
        {/* Frame */}
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[26, 36, 0.6]} />
          <meshStandardMaterial color="#E8B4B8" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Poster face — emissive so it stays readable even in shadow, also lit by spotlight */}
        <mesh position={[0, 0, 0.18]}>
          <planeGeometry args={[23, 32]} />
          <meshStandardMaterial
            map={posterTexture}
            emissive="#ffffff"
            emissiveMap={posterTexture}
            emissiveIntensity={0.5}
            roughness={0.85}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Spotlight on the poster */}
      <spotLight
        position={[-55, 55, 18]}
        angle={0.55}
        penumbra={0.35}
        intensity={4.0}
        distance={140}
        color="#FFFAEC"
        target-position={[-WALL_X, 22, 0]}
        castShadow={false}
      />
      {/* Soft fill light from the front so the poster never falls into pure shadow */}
      <pointLight position={[-50, 28, 15]} color="#FFE6F0" intensity={0.8} distance={70} decay={1.6} />

      {/* Hello Kitty-style sticker decals */}
      {/* Right wall, near window */}
      <mesh position={[WALL_X - 0.2, 50, -20]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial map={sticker1} transparent alphaTest={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[WALL_X - 0.2, 36, 12]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshBasicMaterial map={sticker2} transparent alphaTest={0.3} toneMapped={false} />
      </mesh>
      {/* Back wall, flanking sign */}
      <mesh position={[-22, 50, BACK_Z + 0.2]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial map={sticker3} transparent alphaTest={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[22, 50, BACK_Z + 0.2]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial map={sticker1} transparent alphaTest={0.3} toneMapped={false} />
      </mesh>
      {/* Left wall low (above rug) */}
      <mesh position={[-WALL_X + 0.2, 6, 14]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial map={sticker2} transparent alphaTest={0.3} toneMapped={false} />
      </mesh>

      {/* Heart-shaped frame on back wall (two rotated rounded rects approximation) */}
      <group position={[-30, 38, BACK_Z + 0.15]}>
        {/* Two overlapping circles + rotated square = heart silhouette */}
        <mesh position={[-2.4, 1.4, 0]}>
          <cylinderGeometry args={[3.2, 3.2, 0.4, 32]} />
          <meshStandardMaterial color="#FF69B4" roughness={0.6} />
        </mesh>
        <mesh position={[2.4, 1.4, 0]}>
          <cylinderGeometry args={[3.2, 3.2, 0.4, 32]} />
          <meshStandardMaterial color="#FF69B4" roughness={0.6} />
        </mesh>
        <mesh position={[0, -1.6, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[5.4, 5.4, 0.4]} />
          <meshStandardMaterial color="#FF69B4" roughness={0.6} />
        </mesh>
        {/* HK face inside */}
        <mesh position={[0, 0.4, 0.3]}>
          <planeGeometry args={[4.6, 4.6]} />
          <meshBasicMaterial map={plushFace} transparent toneMapped={false} />
        </mesh>
      </group>

      {/* Hello Kitty plush on floor */}
      <group position={[22, FLOOR_Y, 14]} scale={1.6}>
        {/* Body */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[3, 3, 2.2]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 4, 0]} castShadow>
          <sphereGeometry args={[2, 24, 24]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
        </mesh>
        {/* Face decal */}
        <mesh position={[0, 4, 1.95]}>
          <planeGeometry args={[3.4, 3.4]} />
          <meshBasicMaterial map={plushFace} transparent toneMapped={false} />
        </mesh>
        {/* Pink bow on side */}
        <mesh position={[1.6, 4.7, 0.4]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[1.2, 0.8, 0.5]} />
          <meshStandardMaterial color="#FF1493" roughness={0.5} />
        </mesh>
      </group>

      {/* Ceiling pendant lamp */}
      <mesh position={[0, CEILING_Y - 4, 8]}>
        <cylinderGeometry args={[0.08, 0.08, 8, 8]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[0, CEILING_Y - 10, 8]}>
        <sphereGeometry args={[2.6, 16, 16]} />
        <meshStandardMaterial
          color="#FFE6CC"
          emissive="#FFE6CC"
          emissiveIntensity={1.6}
          roughness={0.4}
        />
      </mesh>
      <pointLight
        position={[0, CEILING_Y - 12, 8]}
        color="#FFE6CC"
        intensity={2.4}
        distance={120}
        decay={1.4}
        castShadow
      />

      {/* Window on right wall — emissive panel */}
      <mesh position={[WALL_X - 0.1, 36, -10]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[26, 36]} />
        <meshStandardMaterial
          color="#FFF8E7"
          emissive="#FFF8E7"
          emissiveIntensity={0.95}
          roughness={0.2}
        />
      </mesh>
      {/* Window frame (cross pattern) */}
      <mesh position={[WALL_X - 0.05, 36, -10]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[26.5, 0.6, 0.4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
      <mesh position={[WALL_X - 0.05, 36, -10]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[0.6, 36.5, 0.4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
      {/* Daylight spill from outside the window */}
      <pointLight position={[WALL_X + 20, 36, -10]} color="#FFFFE0" intensity={1.8} distance={140} decay={1.5} />

      {/* Corner plant */}
      <group position={[-50, FLOOR_Y, -30]} scale={1.8}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[1.4, 1.0, 2.4, 16]} />
          <meshStandardMaterial color="#C2745A" roughness={0.8} />
        </mesh>
        <mesh position={[0, 4.0, 0]} castShadow>
          <icosahedronGeometry args={[2.5, 0]} />
          <meshStandardMaterial color="#5DAA64" roughness={0.85} />
        </mesh>
        <mesh position={[1.4, 5.0, 0.4]} castShadow>
          <icosahedronGeometry args={[1.7, 0]} />
          <meshStandardMaterial color="#6FB872" roughness={0.85} />
        </mesh>
        <mesh position={[-1.0, 5.4, -0.6]} castShadow>
          <icosahedronGeometry args={[1.5, 0]} />
          <meshStandardMaterial color="#4F9D5A" roughness={0.85} />
        </mesh>
      </group>

      {/* BURN BOOK sign on back wall above the shelf */}
      <mesh position={[0, 56, BACK_Z + 0.15]}>
        <planeGeometry args={[28, 7]} />
        <meshBasicMaterial map={burnSignTex} toneMapped={false} />
      </mesh>

      {/* === Bed (right back area) === */}
      <group position={[55, FLOOR_Y, -55]}>
        {/* Bed frame */}
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[34, 3, 50]} />
          <meshStandardMaterial color="#E8B4B8" roughness={0.7} />
        </mesh>
        {/* Mattress */}
        <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[32, 4, 48]} />
          <meshStandardMaterial color="#FFD9E5" roughness={0.85} />
        </mesh>
        {/* Comforter / blanket on top */}
        <mesh position={[0, 6.4, 4]} castShadow>
          <boxGeometry args={[32.4, 0.8, 30]} />
          <meshStandardMaterial color="#FFB6E1" roughness={0.95} />
        </mesh>
        {/* Headboard */}
        <mesh position={[0, 12, -23]} castShadow>
          <boxGeometry args={[34, 18, 1.5]} />
          <meshStandardMaterial color="#C8267A" roughness={0.5} />
        </mesh>
        {/* Pillow 1 */}
        <mesh position={[-8, 7, -18]} castShadow>
          <boxGeometry args={[12, 3, 8]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
        </mesh>
        {/* Pillow 2 */}
        <mesh position={[8, 7, -18]} castShadow>
          <boxGeometry args={[12, 3, 8]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
        </mesh>
        {/* Heart pillow on top */}
        <mesh position={[0, 9, -16]} castShadow>
          <sphereGeometry args={[3.5, 16, 16]} />
          <meshStandardMaterial color="#FF1493" roughness={0.9} />
        </mesh>

        {/* Cinnamoroll-style plushie on the bed */}
        <group position={[-9, 7.5, -10]}>
          <mesh castShadow>
            <sphereGeometry args={[2.6, 24, 24]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0, 2.55]}>
            <planeGeometry args={[4.2, 4.2]} />
            <meshBasicMaterial map={cinnamorollFace} transparent toneMapped={false} />
          </mesh>
          {/* Floppy ears */}
          <mesh position={[-2.1, 1.6, 0]} rotation={[0, 0, 0.3]} castShadow>
            <boxGeometry args={[1.2, 3, 1]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
          </mesh>
          <mesh position={[2.1, 1.6, 0]} rotation={[0, 0, -0.3]} castShadow>
            <boxGeometry args={[1.2, 3, 1]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
          </mesh>
        </group>

        {/* My Melody-style plushie on the bed */}
        <group position={[8, 7.5, -10]}>
          <mesh castShadow>
            <sphereGeometry args={[2.4, 24, 24]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0, 2.35]}>
            <planeGeometry args={[4, 4]} />
            <meshBasicMaterial map={myMelodyFace} transparent toneMapped={false} />
          </mesh>
          {/* Pink hood */}
          <mesh position={[0, 1.6, -0.3]} castShadow>
            <sphereGeometry args={[2.7, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#FFB6E1" roughness={0.9} />
          </mesh>
          {/* Pink ears */}
          <mesh position={[-1.6, 3.4, 0]} rotation={[0, 0, 0.2]} castShadow>
            <coneGeometry args={[0.8, 2.4, 12]} />
            <meshStandardMaterial color="#FFB6E1" roughness={0.9} />
          </mesh>
          <mesh position={[1.6, 3.4, 0]} rotation={[0, 0, -0.2]} castShadow>
            <coneGeometry args={[0.8, 2.4, 12]} />
            <meshStandardMaterial color="#FFB6E1" roughness={0.9} />
          </mesh>
        </group>
      </group>

      {/* === Vanity mirror (left back corner) === */}
      <group position={[-65, FLOOR_Y, -60]}>
        {/* Cabinet base */}
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[20, 10, 10]} />
          <meshStandardMaterial color="#E8B4B8" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Drawer fronts */}
        <mesh position={[-5, 5, 5.05]}>
          <planeGeometry args={[8, 3.5]} />
          <meshStandardMaterial color="#F8C8D9" roughness={0.4} />
        </mesh>
        <mesh position={[5, 5, 5.05]}>
          <planeGeometry args={[8, 3.5]} />
          <meshStandardMaterial color="#F8C8D9" roughness={0.4} />
        </mesh>
        {/* Drawer handles */}
        <mesh position={[-5, 5, 5.2]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#FFD700" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[5, 5, 5.2]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#FFD700" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Mirror frame */}
        <mesh position={[0, 22, 0]} castShadow>
          <boxGeometry args={[16, 22, 1]} />
          <meshStandardMaterial color="#FFD700" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Mirror surface — bright emissive panel to fake reflection */}
        <mesh position={[0, 22, 0.55]}>
          <planeGeometry args={[14, 20]} />
          <meshStandardMaterial
            color="#E8E0FF"
            emissive="#E8E0FF"
            emissiveIntensity={0.45}
            roughness={0.05}
            metalness={0.85}
          />
        </mesh>
        {/* Vanity bulbs around the mirror */}
        {[-7, -3.5, 0, 3.5, 7].map((x, i) => (
          <group key={i}>
            <mesh position={[x, 33.5, 0.7]}>
              <sphereGeometry args={[0.7, 12, 12]} />
              <meshStandardMaterial color="#FFFAEC" emissive="#FFFAEC" emissiveIntensity={1.6} />
            </mesh>
            <pointLight position={[x, 33.5, 1.5]} color="#FFFAEC" intensity={0.25} distance={20} decay={1.5} />
          </group>
        ))}
      </group>

      {/* === Beanbag chair (in front of rug) === */}
      <group position={[-30, FLOOR_Y, 32]}>
        <mesh position={[0, 3, 0]} castShadow receiveShadow scale={[1.4, 0.7, 1.2]}>
          <sphereGeometry args={[5, 24, 16]} />
          <meshStandardMaterial color="#FF8FBA" roughness={1.0} />
        </mesh>
        {/* Top dimple */}
        <mesh position={[0, 5.4, 0]} castShadow scale={[1.0, 0.4, 0.9]}>
          <sphereGeometry args={[3.5, 16, 12]} />
          <meshStandardMaterial color="#FFB6E1" roughness={1.0} />
        </mesh>
      </group>

      {/* === More wall art === */}
      {/* Front wall — three polaroids */}
      <Photo position={[-22, 36, FRONT_Z - 0.1]} rotation={[0, Math.PI, 0]} tex={polaroidHeart} size={[10, 12]} />
      <Photo position={[0, 36, FRONT_Z - 0.1]} rotation={[0, Math.PI, 0]} tex={polaroidBffs} size={[11, 13]} />
      <Photo position={[24, 36, FRONT_Z - 0.1]} rotation={[0, Math.PI, 0]} tex={polaroidSunshine} size={[10, 12]} />

      {/* Right wall above bed — extra frame */}
      <Photo position={[WALL_X - 0.2, 60, -55]} rotation={[0, -Math.PI / 2, 0]} tex={polaroidHeart} size={[12, 14]} />

      {/* Back wall — clock above the BURN BOOK sign on the right */}
      <group position={[40, 70, BACK_Z + 0.2]}>
        <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[6.5, 6.5, 0.5, 32]} />
          <meshStandardMaterial color="#FF1493" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.32]}>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial map={clockFaceTex} emissive="#ffffff" emissiveMap={clockFaceTex} emissiveIntensity={0.3} roughness={0.85} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
