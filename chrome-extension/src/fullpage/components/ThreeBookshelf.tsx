import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Book } from '../../shared/types';

interface Props {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onCreateBook: () => void;
}

const PER_ROW = 6;
const ROW_SPACING = 3.0;
const BOOK_DEPTH = 0.6;
const SHELF_H = 0.1;
const SHELF_W = 13;
const CAM_Z = 8.5;

function pseudoRandom(id: string, slot: number): number {
  let h = slot * 2246822519;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2246822519);
  }
  return (h >>> 0) / 0xffffffff;
}

function createSpineTexture(book: Book): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = book.coverColor || '#FF69B4';
  ctx.fillRect(0, 0, 64, 256);

  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.28)');
  grad.addColorStop(0.1, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(0, 0, 64, 12);
  ctx.fillRect(0, 244, 64, 12);

  ctx.save();
  ctx.translate(32, 128);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText((book.title || book.personName).toUpperCase(), 0, 0, 224);
  ctx.restore();

  return new THREE.CanvasTexture(canvas);
}

export default function ThreeBookshelf({ books, onSelectBook, onCreateBook }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const putBackFn = useRef<() => void>(() => {});
  const scrollToRowFn = useRef<(row: number) => void>(() => {});
  const [pickedBook, setPickedBook] = useState<Book | null>(null);
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRow, setCurrentRow] = useState(0);
  const numRows = Math.max(1, Math.ceil(books.length / PER_ROW));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;
    const rows = Math.max(1, Math.ceil(books.length / PER_ROW));

    const rowCamY = (row: number) => row * ROW_SPACING + 0.7;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f0a03);
    scene.fog = new THREE.FogExp2(0x140601, 0.032);

    // Camera — starts focused on row 0
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    const camLook = { y: rowCamY(0) - 0.3 };
    camera.position.set(0, rowCamY(0), CAM_Z);
    camera.lookAt(0, camLook.y, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffd8a8, 0.5));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sun.position.set(5, 10, 8);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.PointLight(0xff4488, 0.35, 20);
    fill.position.set(-5, 3, 7);
    scene.add(fill);
    const rim = new THREE.PointLight(0xffaa44, 0.2, 12);
    rim.position.set(0, -3, 5);
    scene.add(rim);

    // Back wall — spans full height of all rows
    const wallCenterY = (rows - 1) * ROW_SPACING * 0.5;
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(30, rows * ROW_SPACING + 8),
      new THREE.MeshStandardMaterial({ color: 0x180700, roughness: 1 })
    );
    wall.position.set(0, wallCenterY, -2.8);
    scene.add(wall);

    // Side panels — full height
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x3d1508, roughness: 0.9 });
    for (const sx of [-(SHELF_W / 2 + 0.25), SHELF_W / 2 + 0.25]) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, rows * ROW_SPACING + 2, BOOK_DEPTH + 0.5),
        sideMat
      );
      panel.position.set(sx, wallCenterY, 0);
      scene.add(panel);
    }

    // Book tracking
    const meshes: THREE.Mesh[] = [];
    const meshToBook = new Map<THREE.Mesh, Book>();
    const origPos = new Map<THREE.Mesh, THREE.Vector3>();
    const origRot = new Map<THREE.Mesh, THREE.Euler>();
    let hovered: THREE.Mesh | null = null;
    let picked: THREE.Mesh | null = null;
    let idleTween: gsap.core.Tween | null = null;
    let activeRow = 0;

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x5c2e0e, roughness: 0.82, metalness: 0.04 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x7a3f18, roughness: 0.5 });

    for (let row = 0; row < rows; row++) {
      const ry = row * ROW_SPACING;
      const rowBooks = books.slice(row * PER_ROW, (row + 1) * PER_ROW);

      const plank = new THREE.Mesh(new THREE.BoxGeometry(SHELF_W + 0.6, SHELF_H, BOOK_DEPTH + 0.25), shelfMat);
      plank.position.set(0, ry, 0);
      plank.receiveShadow = true;
      scene.add(plank);

      const edge = new THREE.Mesh(new THREE.BoxGeometry(SHELF_W + 0.6, 0.045, 0.055), edgeMat);
      edge.position.set(0, ry + SHELF_H / 2, BOOK_DEPTH / 2 + 0.14);
      scene.add(edge);

      const spineWidths = rowBooks.map(b => 0.2 + pseudoRandom(b.id, 0) * 0.14);
      const totalW = spineWidths.reduce((s, v) => s + v, 0) + Math.max(0, rowBooks.length - 1) * 0.048;
      let cx = -totalW / 2;

      rowBooks.forEach((book, bi) => {
        const sw = spineWidths[bi];
        const bh = 0.95 + pseudoRandom(book.id, 1) * 0.58;
        const tilt = (pseudoRandom(book.id, 2) - 0.5) * 0.065;
        const bx = cx + sw / 2;
        const by = ry + SHELF_H / 2 + bh / 2;

        const base = new THREE.Color(book.coverColor || '#FF69B4');
        const dark = base.clone().multiplyScalar(0.52);

        const mats = [
          new THREE.MeshStandardMaterial({ color: dark, roughness: 0.9 }),
          new THREE.MeshStandardMaterial({ color: dark, roughness: 0.9 }),
          new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.8), roughness: 0.85 }),
          new THREE.MeshStandardMaterial({ color: dark, roughness: 0.95 }),
          new THREE.MeshStandardMaterial({ map: createSpineTexture(book), roughness: 0.65 }),
          new THREE.MeshStandardMaterial({ color: dark.clone().multiplyScalar(0.7), roughness: 0.95 }),
        ];

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sw, bh, BOOK_DEPTH), mats);
        mesh.position.set(bx, by, 0);
        mesh.rotation.z = tilt;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add(mesh);
        meshes.push(mesh);
        meshToBook.set(mesh, book);
        origPos.set(mesh, mesh.position.clone());
        origRot.set(mesh, new THREE.Euler(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z));

        cx += sw + 0.048;
      });
    }

    // Idle camera sway (X only)
    const startIdleSway = () => {
      idleTween = gsap.to(camera.position, {
        x: 0.55,
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    };
    startIdleSway();

    // Scroll between rows
    const scrollToRow = (row: number) => {
      activeRow = row;
      setCurrentRow(row);
      const targetY = rowCamY(row);
      idleTween?.kill();
      gsap.killTweensOf(camera.position, 'y');
      gsap.killTweensOf(camLook);
      gsap.to(camera.position, { y: targetY, duration: 0.7, ease: 'power2.inOut' });
      gsap.to(camLook, {
        y: targetY - 0.3,
        duration: 0.7,
        ease: 'power2.inOut',
        onComplete: startIdleSway,
      });
    };
    scrollToRowFn.current = scrollToRow;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (picked) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(rows - 1, activeRow + dir));
      if (next !== activeRow) scrollToRow(next);
    };
    mount.addEventListener('wheel', onWheel, { passive: false });

    // Overlay button position
    const updateBtnPos = () => {
      if (!picked) return;
      const v = picked.position.clone().project(camera);
      const rect = mount.getBoundingClientRect();
      setBtnPos({
        x: ((v.x + 1) / 2) * rect.width,
        y: ((1 - v.y) / 2) * rect.height - 64,
      });
    };

    const putBack = () => {
      if (!picked) return;
      const mesh = picked;
      const op = origPos.get(mesh)!;
      const or = origRot.get(mesh)!;

      gsap.killTweensOf(mesh.position);
      gsap.killTweensOf(mesh.rotation);
      gsap.to(mesh.position, { x: op.x, y: op.y, z: op.z, duration: 0.5, ease: 'power2.inOut' });
      gsap.to(mesh.rotation, { x: or.x, y: or.y, z: or.z, duration: 0.5, ease: 'power2.inOut' });
      gsap.to(camera.position, { z: CAM_Z, duration: 0.55, ease: 'power2.inOut', onComplete: startIdleSway });

      if (hovered === mesh) hovered = null;
      picked = null;
      setPickedBook(null);
      setBtnPos(null);
      mount.style.cursor = 'default';
    };
    putBackFn.current = putBack;

    const pickUp = (mesh: THREE.Mesh) => {
      if (picked) putBack();
      idleTween?.kill();

      picked = mesh;
      const op = origPos.get(mesh)!;

      gsap.killTweensOf(mesh.position);
      gsap.killTweensOf(mesh.rotation);
      gsap.to(mesh.position, {
        x: op.x, y: op.y + 1.25, z: op.z + 1.7,
        duration: 0.45,
        ease: 'back.out(1.3)',
        onUpdate: updateBtnPos,
        onComplete: updateBtnPos,
      });
      gsap.to(mesh.rotation, { x: -0.18, y: 0.14, z: 0, duration: 0.45, ease: 'power2.out' });
      gsap.to(camera.position, { z: CAM_Z - 1.5, duration: 0.5, ease: 'power2.out' });

      setPickedBook(meshToBook.get(mesh) ?? null);
    };

    // Raycaster
    const rc = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getHit = (e: MouseEvent): THREE.Mesh | null => {
      const rect = mount.getBoundingClientRect();
      mouse.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      rc.setFromCamera(mouse, camera);
      const hits = rc.intersectObjects(meshes);
      return hits.length > 0 ? (hits[0].object as THREE.Mesh) : null;
    };

    let dragStart = { x: 0, y: 0 };
    let dragMesh: THREE.Mesh | null = null;
    let dragging = false;

    const onMouseDown = (e: MouseEvent) => {
      dragStart = { x: e.clientX, y: e.clientY };
      dragging = false;
      dragMesh = getHit(e);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (dragMesh) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        if (!dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          dragging = true;
          if (picked !== dragMesh) pickUp(dragMesh);
        }
        if (dragging && dragMesh === picked) {
          const rect = mount.getBoundingClientRect();
          mouse.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          rc.setFromCamera(mouse, camera);
          const op = origPos.get(dragMesh)!;
          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(op.z + 1.7));
          const worldPt = new THREE.Vector3();
          if (rc.ray.intersectPlane(plane, worldPt)) {
            dragMesh.position.x = worldPt.x;
            updateBtnPos();
          }
        }
        return;
      }

      if (picked) { updateBtnPos(); return; }

      const h = getHit(e);
      if (h) {
        if (hovered !== h) {
          if (hovered) {
            const op = origPos.get(hovered)!;
            const or = origRot.get(hovered)!;
            gsap.to(hovered.position, { y: op.y, duration: 0.3, ease: 'power2.out' });
            gsap.to(hovered.rotation, { z: or.z, duration: 0.3 });
          }
          hovered = h;
          const op = origPos.get(h)!;
          gsap.to(h.position, { y: op.y + 0.28, duration: 0.3, ease: 'power2.out' });
          gsap.to(h.rotation, { z: 0, duration: 0.25 });
          mount.style.cursor = 'grab';
        }
      } else if (hovered) {
        const op = origPos.get(hovered)!;
        const or = origRot.get(hovered)!;
        gsap.to(hovered.position, { y: op.y, duration: 0.3, ease: 'power2.out' });
        gsap.to(hovered.rotation, { z: or.z, duration: 0.3 });
        hovered = null;
        mount.style.cursor = 'default';
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (dragMesh) {
        if (!dragging) {
          if (picked === dragMesh) putBack();
          else pickUp(dragMesh);
        } else if (picked === dragMesh) {
          const op = origPos.get(dragMesh)!;
          gsap.to(dragMesh.position, { x: op.x, duration: 0.35, ease: 'back.out(1.5)', onUpdate: updateBtnPos });
        }
      } else if (!dragging && picked) {
        putBack();
      }
      dragMesh = null;
      dragging = false;
    };

    mount.addEventListener('mousedown', onMouseDown);
    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('mouseup', onMouseUp);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Render loop — lookAt is called each frame so scroll stays smooth
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      camera.lookAt(0, camLook.y, 0);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      idleTween?.kill();
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(camLook);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('mousedown', onMouseDown);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('mouseup', onMouseUp);
      mount.removeEventListener('wheel', onWheel);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      meshes.forEach(m => {
        m.geometry.dispose();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach(mat => {
          (mat as THREE.MeshStandardMaterial).map?.dispose();
          mat.dispose();
        });
      });
    };
  }, [books]);

  return (
    <div className="relative w-full h-screen bg-[#1f0a03] overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-6 pointer-events-none z-10">
        <h1 className="font-handwritten text-5xl font-bold text-[#F5DEB3] drop-shadow-lg">
          My Burn Book Collection
        </h1>
        <p className="text-[#DEB887] text-base font-serif italic mt-1 opacity-70">
          "One book per person. Because some people deserve their own chapter."
        </p>
      </div>

      {/* Shelf row indicators */}
      {numRows > 1 && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
          {Array.from({ length: numRows }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToRowFn.current(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentRow === i
                  ? 'bg-[#F5DEB3] scale-125 shadow-[0_0_6px_rgba(245,222,179,0.6)]'
                  : 'bg-[#F5DEB3]/25 hover:bg-[#F5DEB3]/55'
              }`}
              aria-label={`Shelf ${i + 1}`}
            />
          ))}
        </div>
      )}

      {pickedBook && btnPos && (
        <div
          className="absolute z-20 flex flex-col items-center gap-2 pointer-events-auto"
          style={{ left: btnPos.x, top: btnPos.y, transform: 'translateX(-50%)' }}
        >
          <button
            onClick={() => onSelectBook(pickedBook)}
            className="bg-[#FF1493] hover:bg-[#FF69B4] text-white px-6 py-2.5 rounded-full font-handwritten text-xl shadow-2xl transition-all hover:scale-105 active:scale-95 border border-white/20"
          >
            Open Book
          </button>
          <button
            onClick={() => putBackFn.current()}
            className="text-[#DEB887]/70 hover:text-[#DEB887] text-sm font-serif transition-colors"
          >
            put it back
          </button>
        </div>
      )}

      {books.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <p className="text-[#F5DEB3] text-3xl font-handwritten mb-6 drop-shadow-lg">
            Your shelf is empty...
          </p>
          <button
            onClick={onCreateBook}
            className="pointer-events-auto bg-[#FF1493] hover:bg-[#FF69B4] text-white px-8 py-4 rounded-lg font-handwritten text-xl transition-all shadow-lg hover:shadow-xl"
          >
            + Create Your First Burn Book
          </button>
        </div>
      )}

      {books.length > 0 && (
        <button
          onClick={onCreateBook}
          className="absolute bottom-6 right-6 z-10 bg-[#FF1493] hover:bg-[#FF69B4] text-white px-6 py-3 rounded-full font-handwritten text-lg shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          + Add Book
        </button>
      )}
    </div>
  );
}
