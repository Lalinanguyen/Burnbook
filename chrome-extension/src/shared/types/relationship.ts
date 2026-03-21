export type RelationshipType = 'friend' | 'family' | 'colleague' | 'partner' | 'other';
export type ContactFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ImportantDateType = 'birthday' | 'anniversary' | 'custom';
export type SharingPermission = 'view' | 'edit' | 'contribute';

export interface ImportantDate {
  id: string;
  type: ImportantDateType;
  label: string;
  date: string; // MM-DD format
  year?: number; // Optional specific year
  reminderDays: number; // Days before to remind
}

export interface PositiveMoment {
  id: string;
  date: Date;
  title: string;
  description: string;
  tags: string[];
  addedBy?: string; // User ID (for shared relationships)
}

export interface SharedUser {
  userId: string;
  email: string;
  inviteAccepted: boolean;
  permissions: SharingPermission;
}

export interface PrivacySettings {
  shareOffenses: boolean;       // Default: false
  sharePositiveMoments: boolean; // Default: true
  shareImportantDates: boolean;  // Default: true
  shareNotes: boolean;           // Default: false
  shareReminders: boolean;       // Default: false
}

export interface SharingSettings {
  enabled: boolean;
  sharedWith: SharedUser[];
  privacySettings: PrivacySettings;
}

export interface Relationship {
  id: string;
  userId?: string;
  bookId: string; // Link to which book this relationship belongs to
  personName: string;
  relationship: RelationshipType;
  createdAt: Date;
  updatedAt: Date;

  // Relationship health
  strengthScore: number; // 0-100, auto-calculated
  lastContactDate?: Date;
  contactFrequency: ContactFrequency;

  // Important dates
  importantDates: ImportantDate[];

  // Positive tracking
  positiveMoments: PositiveMoment[];

  // Reminders
  nextReminderDate?: Date;
  reminderEnabled: boolean;
  reminderFrequency: number; // Days between reminders

  // Privacy & Sharing
  sharing?: SharingSettings;

  notes: string;
  archived: boolean;
  localModified: boolean; // For sync tracking
}

export interface CreateRelationshipData {
  bookId: string;
  personName: string;
  relationship: RelationshipType;
  contactFrequency: ContactFrequency;
  importantDates?: ImportantDate[];
  reminderEnabled?: boolean;
  reminderFrequency?: number;
  notes?: string;
}

export interface UpdateRelationshipData {
  personName?: string;
  relationship?: RelationshipType;
  contactFrequency?: ContactFrequency;
  lastContactDate?: Date;
  importantDates?: ImportantDate[];
  positiveMoments?: PositiveMoment[];
  reminderEnabled?: boolean;
  reminderFrequency?: number;
  sharing?: SharingSettings;
  notes?: string;
  archived?: boolean;
}

export type RelationshipHealthStatus = 'excellent' | 'good' | 'needs_attention' | 'critical';
