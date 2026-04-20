import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

interface DockItem {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
}

interface MacOSDockProps {
  items: DockItem[];
  visible?: boolean;
}

export default function MacOSDock({ items, visible = true }: MacOSDockProps) {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dockRef.current) {
        const rect = dockRef.current.getBoundingClientRect();
        if (e.clientY >= rect.top - 100 && e.clientY <= rect.bottom + 20) {
          setMouseX(e.clientX);
        } else {
          setMouseX(null);
        }
      }
    };

    const handleMouseLeave = () => {
      setMouseX(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    if (dockRef.current) {
      dockRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (dockRef.current) {
        dockRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  const getScale = (itemId: string): number => {
    if (mouseX === null) return 1;

    const itemElement = itemRefs.current.get(itemId);
    if (!itemElement) return 1;

    const rect = itemElement.getBoundingClientRect();
    const itemCenterX = rect.left + rect.width / 2;
    const distance = Math.abs(mouseX - itemCenterX);
    const maxDistance = 200;
    const maxScale = 1.5;
    const minScale = 1.0;

    const scale = Math.max(
      minScale,
      maxScale - (distance / maxDistance) * (maxScale - minScale)
    );

    return scale;
  };

  if (!visible) return null;

  return (
    <div
      ref={dockRef}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 animate-dock-bounce hidden sm:block"
    >
      <div className="dock-glass rounded-2xl px-4 py-3 flex items-end gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const scale = getScale(item.id);

          return (
            <div
              key={item.id}
              className="relative"
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el);
              }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <button
                onClick={item.onClick}
                className="relative p-3 rounded-xl hover:bg-burn-pink-light/20 transition-all duration-300 ease-out flex items-center justify-center"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'bottom center',
                }}
                aria-label={item.label}
              >
                <Icon
                  size={28}
                  className={item.color || 'text-burn-pink-dark'}
                  strokeWidth={2}
                />
              </button>

              {hoveredItem === item.id && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 glass-dark text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none animate-fade-in">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
