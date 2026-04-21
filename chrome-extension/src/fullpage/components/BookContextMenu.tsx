import React from 'react';

interface BookContextMenuProps {
  x: number;
  y: number;
  onThrow: () => void;
  onBurn: () => void;
}

export default function BookContextMenu({ x, y, onThrow, onBurn }: BookContextMenuProps) {
  return (
    <div
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}
      className="glass-pink rounded-xl shadow-lg overflow-hidden flex flex-col"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        className="px-4 py-2 text-sm font-handwritten text-left hover:bg-burn-pink-light transition-colors"
        onClick={onThrow}
      >
        Throw 🤬
      </button>
      <button
        className="px-4 py-2 text-sm font-handwritten text-left hover:bg-burn-pink-light transition-colors border-t border-burn-pink-light"
        onClick={onBurn}
      >
        Burn 🔥
      </button>
    </div>
  );
}
