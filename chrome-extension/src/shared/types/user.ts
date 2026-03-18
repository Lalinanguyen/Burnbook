export interface UserSettings {
  userId?: string;

  // Security
  passwordHash: string;
  passwordSalt: string;

  // Sync preferences
  cloudSyncEnabled: boolean;
  autoSyncInterval: number; // Minutes
  lastSyncAt?: Date;

  // Notification preferences
  notificationsEnabled: boolean;
  reminderNotifications: boolean;
  importantDateNotifications: boolean;

  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  defaultView: 'offenses' | 'relationships' | 'dashboard';

  // Customizable categories
  offenseCategories: string[];
  relationshipTypes: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserSettingsData {
  passwordHash: string;
  passwordSalt: string;
}

export interface UpdateUserSettingsData {
  cloudSyncEnabled?: boolean;
  autoSyncInterval?: number;
  lastSyncAt?: Date;
  notificationsEnabled?: boolean;
  reminderNotifications?: boolean;
  importantDateNotifications?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  defaultView?: 'offenses' | 'relationships' | 'dashboard';
  offenseCategories?: string[];
  relationshipTypes?: string[];
}
