export interface MemoryPage {
  id: string;
  bookId: string;
  pageOrder: number;
  title: string;
  caption: string;
  backgroundStyle: 'lined' | 'dotted' | 'blank' | 'grid';
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapbookItemTextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  textAlign: 'left' | 'center' | 'right';
}

export interface ScrapbookItem {
  id: string;
  pageId: string;
  bookId: string;
  type: 'photo' | 'sticker' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  imageData: string | null;
  textContent: string | null;
  textStyle: ScrapbookItemTextStyle | null;
  zIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RantMood = 'furious' | 'hurt' | 'done' | 'betrayed' | 'numb' | 'unbothered';

export const RANT_MOODS: { value: RantMood; emoji: string; label: string }[] = [
  { value: 'furious', emoji: '😤', label: 'Furious' },
  { value: 'hurt', emoji: '😢', label: 'Hurt' },
  { value: 'done', emoji: '🙄', label: 'Done' },
  { value: 'betrayed', emoji: '😠', label: 'Betrayed' },
  { value: 'numb', emoji: '😶', label: 'Numb' },
  { value: 'unbothered', emoji: '💅', label: 'Unbothered' },
];

export interface Rant {
  id: string;
  bookId: string;
  title: string;
  content: string;
  mood: RantMood | null;
  createdAt: Date;
  updatedAt: Date;
}
