export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export interface OffenseEvidence {
  notes: string;
  links?: string[];
}

export interface Offense {
  id: string;
  userId?: string;
  bookId: string; // Link to which book this offense belongs to
  personName: string;
  personId?: string; // Optional link to relationship
  title: string;
  description: string;
  occurrenceDate: Date;
  createdAt: Date;
  updatedAt: Date;
  severity: SeverityLevel;
  categories: string[];
  tags: string[];
  evidence: OffenseEvidence;
  resolved: boolean;
  resolutionDate?: Date;
  resolutionNotes?: string;
  archived: boolean;
  localModified: boolean; // For sync tracking
}

export interface CreateOffenseData {
  bookId: string;
  personName: string;
  personId?: string;
  title: string;
  description: string;
  occurrenceDate: Date;
  severity: SeverityLevel;
  categories: string[];
  tags: string[];
  evidence: OffenseEvidence;
}

export interface UpdateOffenseData {
  personName?: string;
  personId?: string;
  title?: string;
  description?: string;
  occurrenceDate?: Date;
  severity?: SeverityLevel;
  categories?: string[];
  tags?: string[];
  evidence?: OffenseEvidence;
  resolved?: boolean;
  resolutionDate?: Date;
  resolutionNotes?: string;
  archived?: boolean;
}
