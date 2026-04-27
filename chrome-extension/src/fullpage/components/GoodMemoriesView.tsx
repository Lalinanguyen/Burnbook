import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, ChevronRight, Plus, Image, Type, X, BookImage } from 'lucide-react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { MemoryPage, ScrapbookItem } from '../../shared/types';
import InlineEditField from './InlineEditField';

interface GoodMemoriesViewProps {
  bookId: string;
}

const BG_STYLES: { value: MemoryPage['backgroundStyle']; label: string }[] = [
  { value: 'lined', label: 'Lined' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'grid', label: 'Grid' },
  { value: 'blank', label: 'Blank' },
];

const BG_CSS: Record<MemoryPage['backgroundStyle'], string> = {
  lined: 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(212,165,116,0.3) 27px, rgba(212,165,116,0.3) 28px)',
  dotted: 'radial-gradient(circle, rgba(212,165,116,0.4) 1px, transparent 1px)',
  grid: 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(212,165,116,0.2) 27px, rgba(212,165,116,0.2) 28px), repeating-linear-gradient(to right, transparent, transparent 27px, rgba(212,165,116,0.2) 27px, rgba(212,165,116,0.2) 28px)',
  blank: 'none',
};

const BG_SIZE: Record<MemoryPage['backgroundStyle'], string | undefined> = {
  lined: undefined,
  dotted: '20px 20px',
  grid: undefined,
  blank: undefined,
};

// ─── Resize Handle ────────────────────────────────────────────────────────────

type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_POSITIONS: { dir: ResizeDir; style: React.CSSProperties }[] = [
  { dir: 'nw', style: { top: -5, left: -5, cursor: 'nw-resize' } },
  { dir: 'n',  style: { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
  { dir: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
  { dir: 'e',  style: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize' } },
  { dir: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
  { dir: 's',  style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
  { dir: 'sw', style: { bottom: -5, left: -5, cursor: 'sw-resize' } },
  { dir: 'w',  style: { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'w-resize' } },
];

interface ResizeHandleProps {
  dir: ResizeDir;
  posStyle: React.CSSProperties;
  item: ScrapbookItem;
  itemRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdate: (updates: Partial<ScrapbookItem>) => void;
}

function ResizeHandle({ dir, posStyle, item, itemRef, containerRef, onUpdate }: ResizeHandleProps) {
  const startRef = useRef<{ cx: number; cy: number; ix: number; iy: number; iw: number; ih: number } | null>(null);

  const applyResize = (cx: number, cy: number) => {
    if (!startRef.current || !containerRef.current) return { x: item.x, y: item.y, width: item.width, height: item.height };
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((cx - startRef.current.cx) / rect.width) * 100;
    const dy = ((cy - startRef.current.cy) / rect.height) * 100;
    let { ix, iy, iw, ih } = startRef.current;

    if (dir.includes('e')) iw = Math.max(5, iw + dx);
    if (dir.includes('w')) { ix = ix + dx; iw = Math.max(5, iw - dx); }
    if (dir.includes('s')) ih = Math.max(5, ih + dy);
    if (dir.includes('n')) { iy = iy + dy; ih = Math.max(5, ih - dy); }

    return { x: ix, y: iy, width: iw, height: ih };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    startRef.current = { cx: e.clientX, cy: e.clientY, ix: item.x, iy: item.y, iw: item.width, ih: item.height };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || !itemRef.current) return;
    const { x, y, width, height } = applyResize(e.clientX, e.clientY);
    itemRef.current.style.left = `${x}%`;
    itemRef.current.style.top = `${y}%`;
    itemRef.current.style.width = `${width}%`;
    if (item.type !== 'text') itemRef.current.style.height = `${height}%`;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const updates = applyResize(e.clientX, e.clientY);
    startRef.current = null;
    onUpdate(updates);
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: '#FF69B4',
        border: '2px solid white',
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        zIndex: 10,
        ...posStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

// ─── Rotation Handle ──────────────────────────────────────────────────────────

interface RotationHandleProps {
  item: ScrapbookItem;
  itemRef: React.RefObject<HTMLDivElement>;
  onUpdate: (updates: Partial<ScrapbookItem>) => void;
}

function RotationHandle({ item, itemRef, onUpdate }: RotationHandleProps) {
  const startAngle = useRef<number | null>(null);
  const startRotation = useRef(0);

  const getAngle = (clientX: number, clientY: number) => {
    if (!itemRef.current) return 0;
    const rect = itemRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    startAngle.current = getAngle(e.clientX, e.clientY);
    startRotation.current = item.rotation;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startAngle.current === null || !itemRef.current) return;
    const delta = getAngle(e.clientX, e.clientY) - startAngle.current;
    itemRef.current.style.transform = `rotate(${startRotation.current + delta}deg)`;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startAngle.current === null) return;
    const delta = getAngle(e.clientX, e.clientY) - startAngle.current;
    const newRotation = startRotation.current + delta;
    startAngle.current = null;
    onUpdate({ rotation: newRotation });
  };

  return (
    <>
      {/* Connector line */}
      <div style={{
        position: 'absolute',
        top: -20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 1,
        height: 16,
        backgroundColor: '#FF69B4',
        zIndex: 10,
        pointerEvents: 'none',
      }} />
      {/* Rotation knob */}
      <div
        style={{
          position: 'absolute',
          top: -32,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 14,
          height: 14,
          backgroundColor: 'white',
          border: '2px solid #FF69B4',
          borderRadius: '50%',
          cursor: 'grab',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Drag to rotate"
      >
        ↻
      </div>
    </>
  );
}

// ─── ScrapbookItemView ────────────────────────────────────────────────────────

interface ScrapbookItemViewProps {
  item: ScrapbookItem;
  containerRef: React.RefObject<HTMLDivElement>;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ScrapbookItem>) => void;
  onDelete: () => void;
}

function ScrapbookItemView({ item, containerRef, selected, onSelect, onUpdate, onDelete }: ScrapbookItemViewProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isEditingText = useRef(false);
  const dragStart = useRef({ px: 0, py: 0, ix: 0, iy: 0 });
  const [editingText, setEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState(item.textContent || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTextDraft(item.textContent || ''); }, [item.textContent]);
  useEffect(() => { if (editingText) textareaRef.current?.focus(); }, [editingText]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEditingText.current) return;
    if ((e.target as HTMLElement).dataset.handle) return; // let handles handle it
    e.stopPropagation();
    onSelect();
    isDragging.current = true;
    dragStart.current = { px: e.clientX, py: e.clientY, ix: item.x, iy: item.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current || !itemRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.px) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.py) / rect.height) * 100;
    const newX = Math.max(0, Math.min(95 - item.width, dragStart.current.ix + dx));
    const newY = Math.max(0, Math.min(95 - item.height, dragStart.current.iy + dy));
    itemRef.current.style.left = `${newX}%`;
    itemRef.current.style.top = `${newY}%`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    isDragging.current = false;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.px) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.py) / rect.height) * 100;
    const newX = Math.max(0, Math.min(95 - item.width, dragStart.current.ix + dx));
    const newY = Math.max(0, Math.min(95 - item.height, dragStart.current.iy + dy));
    onUpdate({ x: newX, y: newY });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (item.type !== 'text') return;
    e.stopPropagation();
    isEditingText.current = true;
    setEditingText(true);
  };

  const commitText = () => {
    isEditingText.current = false;
    setEditingText(false);
    if (textDraft !== item.textContent) onUpdate({ textContent: textDraft });
  };

  const textStyles: React.CSSProperties = {
    fontFamily: item.textStyle?.fontFamily === 'handwritten' ? 'Caveat, cursive' : 'Arial, sans-serif',
    fontSize: `${item.textStyle?.fontSize || 18}px`,
    color: item.textStyle?.color || '#1a1a1a',
    fontWeight: item.textStyle?.bold ? 'bold' : 'normal',
    fontStyle: item.textStyle?.italic ? 'italic' : 'normal',
    textAlign: item.textStyle?.textAlign || 'left',
    padding: '4px',
  };

  return (
    <div
      ref={itemRef}
      style={{
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.width}%`,
        height: item.type === 'text' ? 'auto' : `${item.height}%`,
        transform: `rotate(${item.rotation}deg)`,
        zIndex: selected ? 1000 : item.zIndex,
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      className={selected ? 'ring-2 ring-[#FF69B4] ring-offset-1' : ''}
    >
      {/* Controls shown only when selected */}
      {selected && (
        <>
          {/* Delete */}
          <button
            data-handle="true"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ position: 'absolute', top: -12, right: -12, zIndex: 20, cursor: 'pointer' }}
            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
          >
            <X size={10} />
          </button>

          {/* Rotation handle */}
          <RotationHandle item={item} itemRef={itemRef} onUpdate={onUpdate} />

          {/* Resize handles */}
          {HANDLE_POSITIONS.map(({ dir, style: posStyle }) => (
            <ResizeHandle
              key={dir}
              dir={dir}
              posStyle={posStyle}
              item={item}
              itemRef={itemRef}
              containerRef={containerRef}
              onUpdate={onUpdate}
            />
          ))}
        </>
      )}

      {/* Content */}
      {item.type === 'photo' || item.type === 'sticker' ? (
        <img
          src={item.imageData!}
          alt={item.type}
          className="w-full h-full select-none"
          style={{ pointerEvents: 'none', display: 'block', objectFit: item.type === 'photo' ? 'cover' : 'contain' }}
          draggable={false}
        />
      ) : editingText ? (
        <textarea
          ref={textareaRef}
          value={textDraft}
          onChange={e => setTextDraft(e.target.value)}
          onBlur={commitText}
          onPointerDown={e => e.stopPropagation()}
          rows={4}
          style={{
            ...textStyles,
            resize: 'none',
            background: 'rgba(255,255,255,0.75)',
            border: '1px dashed #FF69B4',
            outline: 'none',
            width: '100%',
            cursor: 'text',
          }}
        />
      ) : (
        <div
          style={{
            ...textStyles,
            minWidth: 80,
            minHeight: 30,
            background: selected ? 'rgba(255,255,255,0.5)' : 'transparent',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {item.textContent || <span style={{ color: '#bbb', fontStyle: 'italic' }}>Double-click to edit</span>}
        </div>
      )}
    </div>
  );
}

// ─── Sticker Library ──────────────────────────────────────────────────────────

interface StickerLibraryProps {
  bookId: string;
  onStamp: (imageData: string, side: 'left' | 'right') => void;
  onClose: () => void;
}

function StickerLibrary({ bookId, onStamp, onClose }: StickerLibraryProps) {
  const [stickers, setStickers] = useState<ScrapbookItem[]>([]);

  useEffect(() => {
    db.getScrapbookItemsByBook(bookId).then(all => {
      const seen = new Set<string>();
      const unique = all.filter(i => {
        if (i.type !== 'sticker' || !i.imageData) return false;
        if (seen.has(i.imageData)) return false;
        seen.add(i.imageData);
        return true;
      });
      setStickers(unique);
    });
  }, [bookId]);

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#FFF8DC] rounded-xl p-5 shadow-2xl max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-handwritten text-xl font-bold text-[#1a1a1a]">📚 Sticker Library</h3>
          <button onClick={onClose} className="text-[#888] hover:text-[#333] transition-colors">
            <X size={18} />
          </button>
        </div>

        {stickers.length === 0 ? (
          <p className="font-handwritten text-sm text-[#999] text-center py-6">
            No stickers yet. Upload one with the Sticker button above.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {stickers.map(s => (
              <div key={s.id} className="group relative">
                <img
                  src={s.imageData!}
                  alt="sticker"
                  className="w-full aspect-square object-contain border border-[#D2B48C]/30 rounded cursor-pointer hover:border-[#FF69B4] transition-colors bg-white"
                />
                <div className="absolute inset-0 hidden group-hover:flex flex-col items-center justify-center gap-1 bg-black/40 rounded">
                  <button
                    onClick={() => { onStamp(s.imageData!, 'left'); onClose(); }}
                    className="text-xs bg-white/90 text-[#333] px-2 py-0.5 rounded font-handwritten hover:bg-[#FF69B4] hover:text-white transition-colors"
                  >
                    Left
                  </button>
                  <button
                    onClick={() => { onStamp(s.imageData!, 'right'); onClose(); }}
                    className="text-xs bg-white/90 text-[#333] px-2 py-0.5 rounded font-handwritten hover:bg-[#FF69B4] hover:text-white transition-colors"
                  >
                    Right
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MemoryPageCanvas ─────────────────────────────────────────────────────────

interface MemoryPageCanvasProps {
  page: MemoryPage;
  items: ScrapbookItem[];
  onUpdatePage: (updates: Partial<MemoryPage>) => void;
  onUpdateItem: (id: string, updates: Partial<ScrapbookItem>) => void;
  onDeleteItem: (id: string) => void;
}

function MemoryPageCanvas({ page, items, onUpdatePage, onUpdateItem, onDeleteItem }: MemoryPageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedItems = [...items].sort((a, b) => a.zIndex - b.zIndex);
  const maxZ = items.length > 0 ? Math.max(...items.map(i => i.zIndex)) : 0;

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#FFF8DC' }}>
      <div className="px-6 pt-4 pb-1 border-b border-[#D2B48C]/30 flex-shrink-0">
        <InlineEditField
          value={page.title}
          onSave={v => onUpdatePage({ title: v })}
          placeholder="Page title..."
          className="font-handwritten text-xl font-bold text-[#1a1a1a]"
        />
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ backgroundImage: BG_CSS[page.backgroundStyle], backgroundSize: BG_SIZE[page.backgroundStyle] }}
        onClick={() => setSelectedId(null)}
      >
        {sortedItems.map(item => (
          <ScrapbookItemView
            key={item.id}
            item={item}
            containerRef={containerRef}
            selected={selectedId === item.id}
            onSelect={() => { setSelectedId(item.id); onUpdateItem(item.id, { zIndex: maxZ + 1 }); }}
            onUpdate={updates => onUpdateItem(item.id, updates)}
            onDelete={() => { setSelectedId(null); onDeleteItem(item.id); }}
          />
        ))}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="font-handwritten text-[#D2B48C]/60 text-lg text-center px-8">
              Add photos, stickers, or text ✨
            </p>
          </div>
        )}
      </div>

      <div className="px-6 py-2 border-t border-[#D2B48C]/30 flex-shrink-0">
        <InlineEditField
          value={page.caption}
          onSave={v => onUpdatePage({ caption: v })}
          placeholder="Add a caption..."
          className="font-handwritten text-sm text-[#888] italic"
        />
      </div>
    </div>
  );
}

// ─── GoodMemoriesView ─────────────────────────────────────────────────────────

export default function GoodMemoriesView({ bookId }: GoodMemoriesViewProps) {
  const [pages, setPages] = useState<MemoryPage[]>([]);
  const [items, setItems] = useState<Record<string, ScrapbookItem[]>>({});
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showStickerLibrary, setShowStickerLibrary] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<{ side: 'left' | 'right'; type: 'photo' | 'sticker' } | null>(null);

  const loadData = useCallback(async () => {
    await db.ensureTrailingBlankPage(bookId);
    const loadedPages = await db.getMemoryPagesByBook(bookId);
    setPages(loadedPages);
    const itemMap: Record<string, ScrapbookItem[]> = {};
    await Promise.all(loadedPages.map(async p => {
      itemMap[p.id] = await db.getScrapbookItemsByPage(p.id);
    }));
    setItems(itemMap);
    setLoading(false);
  }, [bookId]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalSpreads = Math.ceil(pages.length / 2);
  const leftPage = pages[spreadIndex * 2] ?? null;
  const rightPage = pages[spreadIndex * 2 + 1] ?? null;

  const handleUpdatePage = async (pageId: string, updates: Partial<MemoryPage>) => {
    await db.updateMemoryPage(pageId, updates);
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, ...updates } : p));
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<ScrapbookItem>) => {
    await db.updateScrapbookItem(itemId, updates);
    setItems(prev => {
      const next = { ...prev };
      for (const pid in next) {
        next[pid] = next[pid].map(i => i.id === itemId ? { ...i, ...updates } : i);
      }
      return next;
    });
  };

  const handleDeleteItem = async (pageId: string, itemId: string) => {
    await db.deleteScrapbookItem(itemId);
    setItems(prev => ({ ...prev, [pageId]: (prev[pageId] || []).filter(i => i.id !== itemId) }));
    await refreshPages();
  };

  const refreshPages = async () => {
    await db.ensureTrailingBlankPage(bookId);
    const refreshed = await db.getMemoryPagesByBook(bookId);
    if (refreshed.length !== pages.length) {
      const itemMap = { ...items };
      for (const p of refreshed) {
        if (!itemMap[p.id]) itemMap[p.id] = await db.getScrapbookItemsByPage(p.id);
      }
      setItems(itemMap);
      setPages(refreshed);
    }
  };

  const addImageToPage = async (pageId: string, type: 'photo' | 'sticker', imageData: string) => {
    const pageItems = items[pageId] || [];
    const maxZ = pageItems.length > 0 ? Math.max(...pageItems.map(i => i.zIndex)) : 0;
    const isSticker = type === 'sticker';
    const newItem: ScrapbookItem = {
      id: uuidv4(),
      pageId,
      bookId,
      type,
      x: 10 + Math.random() * 30,
      y: 10 + Math.random() * 30,
      width: isSticker ? 18 : 40,
      height: isSticker ? 18 : 40,
      rotation: (Math.random() - 0.5) * 12,
      imageData,
      textContent: null,
      textStyle: null,
      zIndex: maxZ + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.createScrapbookItem(newItem);
    setItems(prev => ({ ...prev, [pageId]: [...(prev[pageId] || []), newItem] }));
    await refreshPages();
  };

  const addTextToPage = async (pageId: string) => {
    const pageItems = items[pageId] || [];
    const maxZ = pageItems.length > 0 ? Math.max(...pageItems.map(i => i.zIndex)) : 0;
    const newItem: ScrapbookItem = {
      id: uuidv4(),
      pageId,
      bookId,
      type: 'text',
      x: 20 + Math.random() * 30,
      y: 20 + Math.random() * 30,
      width: 45,
      height: 20,
      rotation: 0,
      imageData: null,
      textContent: '',
      textStyle: { fontFamily: 'handwritten', fontSize: 18, color: '#1a1a1a', bold: false, italic: false, textAlign: 'left' },
      zIndex: maxZ + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.createScrapbookItem(newItem);
    setItems(prev => ({ ...prev, [pageId]: [...(prev[pageId] || []), newItem] }));
    await refreshPages();
  };

  const processAndAdd = (file: File, pageId: string, type: 'photo' | 'sticker') => {
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64Raw = ev.target?.result as string;
      const img = new window.Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const max = type === 'sticker' ? 400 : 900;
        const scale = Math.min(max / img.width, max / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        await addImageToPage(pageId, type, canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = base64Raw;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingRef.current) return;
    const { side, type } = pendingRef.current;
    const page = side === 'left' ? leftPage : rightPage;
    if (!page) return;
    processAndAdd(file, page.id, type);
    e.target.value = '';
    pendingRef.current = null;
  };

  const triggerAdd = (side: 'left' | 'right', type: 'photo' | 'sticker') => {
    pendingRef.current = { side, type };
    if (type === 'photo') photoInputRef.current?.click();
    else stickerInputRef.current?.click();
  };

  const handleStickerStamp = async (imageData: string, side: 'left' | 'right') => {
    const page = side === 'left' ? leftPage : rightPage;
    if (!page) return;
    await addImageToPage(page.id, 'sticker', imageData);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FFF8DC' }}>
        <p className="font-handwritten text-[#999] text-lg">Loading memories...</p>
      </div>
    );
  }

  const ToolGroup = ({ side, page }: { side: 'left' | 'right'; page: MemoryPage | null }) => (
    <div className="flex items-center gap-1">
      <span className="text-xs text-[#888] font-handwritten capitalize">{side}</span>
      <button onClick={() => page && triggerAdd(side, 'photo')} disabled={!page} className="flex items-center gap-1 px-2 py-1 bg-white border border-[#FF69B4]/40 rounded hover:bg-[#FFE4F0] transition-colors text-xs font-handwritten disabled:opacity-30">
        <Image size={11} /> Photo
      </button>
      <button onClick={() => page && triggerAdd(side, 'sticker')} disabled={!page} className="flex items-center gap-1 px-2 py-1 bg-white border border-[#FF69B4]/40 rounded hover:bg-[#FFE4F0] transition-colors text-xs font-handwritten disabled:opacity-30">
        <Plus size={11} /> Sticker
      </button>
      <button onClick={() => page && addTextToPage(page.id)} disabled={!page} className="flex items-center gap-1 px-2 py-1 bg-white border border-[#FF69B4]/40 rounded hover:bg-[#FFE4F0] transition-colors text-xs font-handwritten disabled:opacity-30">
        <Type size={11} /> Text
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#FFF0F6] border-b border-[#FF69B4]/20 flex-wrap flex-shrink-0">
        <ToolGroup side="left" page={leftPage} />
        <div className="w-px h-5 bg-[#FF69B4]/20 mx-1" />
        <ToolGroup side="right" page={rightPage} />
        <div className="w-px h-5 bg-[#FF69B4]/20 mx-1" />

        <button
          onClick={() => setShowStickerLibrary(true)}
          className="flex items-center gap-1 px-2 py-1 bg-white border border-[#FF69B4]/40 rounded hover:bg-[#FFE4F0] transition-colors text-xs font-handwritten"
        >
          <BookImage size={11} /> Library
        </button>

        {leftPage && (
          <select
            value={leftPage.backgroundStyle}
            onChange={e => handleUpdatePage(leftPage.id, { backgroundStyle: e.target.value as MemoryPage['backgroundStyle'] })}
            className="ml-auto text-xs bg-white border border-[#FF69B4]/40 rounded px-2 py-1 font-handwritten outline-none"
          >
            {BG_STYLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={stickerInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Two-page spread */}
      <div className="flex-1 flex items-stretch min-h-0 relative">
        <button
          onClick={() => setSpreadIndex(i => Math.max(0, i - 1))}
          disabled={spreadIndex === 0}
          className="w-8 flex-shrink-0 flex items-center justify-center text-[#FF69B4]/60 hover:text-[#FF69B4] disabled:opacity-20 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="flex-1 border-r-2 border-[#D2691E] relative overflow-hidden" style={{ boxShadow: 'inset -8px 0 16px rgba(0,0,0,0.06)' }}>
          {leftPage
            ? <MemoryPageCanvas page={leftPage} items={items[leftPage.id] || []} onUpdatePage={u => handleUpdatePage(leftPage.id, u)} onUpdateItem={handleUpdateItem} onDeleteItem={id => handleDeleteItem(leftPage.id, id)} />
            : <BlankMemoryPage />
          }
        </div>

        <div className="flex-1 border-l-2 border-[#D2691E] relative overflow-hidden" style={{ boxShadow: 'inset 8px 0 16px rgba(0,0,0,0.06)' }}>
          {rightPage
            ? <MemoryPageCanvas page={rightPage} items={items[rightPage.id] || []} onUpdatePage={u => handleUpdatePage(rightPage.id, u)} onUpdateItem={handleUpdateItem} onDeleteItem={id => handleDeleteItem(rightPage.id, id)} />
            : <BlankMemoryPage />
          }
        </div>

        <button
          onClick={() => setSpreadIndex(i => Math.min(totalSpreads - 1, i + 1))}
          disabled={spreadIndex >= totalSpreads - 1}
          className="w-8 flex-shrink-0 flex items-center justify-center text-[#FF69B4]/60 hover:text-[#FF69B4] disabled:opacity-20 transition-colors"
        >
          <ChevronRight size={22} />
        </button>

        {/* Sticker library overlay */}
        {showStickerLibrary && (
          <StickerLibrary
            bookId={bookId}
            onStamp={handleStickerStamp}
            onClose={() => setShowStickerLibrary(false)}
          />
        )}
      </div>

      <div className="text-center py-1 text-xs font-handwritten text-[#999] flex-shrink-0">
        Pages {spreadIndex * 2 + 1}–{spreadIndex * 2 + 2} of {pages.length}
      </div>
    </div>
  );
}

function BlankMemoryPage() {
  return (
    <div
      className="w-full h-full"
      style={{
        backgroundColor: '#FFF8DC',
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(212,165,116,0.3) 27px, rgba(212,165,116,0.3) 28px)',
      }}
    />
  );
}
