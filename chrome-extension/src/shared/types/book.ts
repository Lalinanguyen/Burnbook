export interface Book {
  id: string;
  userId: string;
  personName: string;
  title?: string;
  coverColor: string;
  coverStyle: 'classic' | 'collage' | 'minimal';
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
  localModified: boolean;
}

export interface CreateBookInput {
  userId: string;
  personName: string;
  title?: string;
  coverColor?: string;
  coverStyle?: 'classic' | 'collage' | 'minimal';
}

export interface UpdateBookInput {
  personName?: string;
  title?: string;
  coverColor?: string;
  coverStyle?: 'classic' | 'collage' | 'minimal';
  archived?: boolean;
}
