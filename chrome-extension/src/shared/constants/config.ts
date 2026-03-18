export const APP_CONFIG = {
  // Database
  DB_NAME: 'BurnBookDB',
  DB_VERSION: 1,

  // Sync
  DEFAULT_SYNC_INTERVAL: 15, // minutes
  MIN_SYNC_INTERVAL: 5,
  MAX_SYNC_INTERVAL: 1440, // 24 hours

  // Reminders
  DEFAULT_REMINDER_FREQUENCY: 7, // days
  DEFAULT_IMPORTANT_DATE_REMINDER: 7, // days before

  // UI
  MAX_OFFENSE_LIST_SIZE: 50,
  MAX_RELATIONSHIP_LIST_SIZE: 50,

  // Password
  PASSWORD_MIN_LENGTH: 8,
  PBKDF2_ITERATIONS: 100000,

  // Relationship strength calculation
  STRENGTH_BASE_SCORE: 50,
  STRENGTH_CONTACT_RECENCY_MAX: 30,
  STRENGTH_MOMENTS_MAX: 20,
  STRENGTH_FREQUENCY_BONUS: 10,
  STRENGTH_OFFENSE_PENALTY: 5
} as const;

export const STORAGE_KEYS = {
  USER_SETTINGS: 'user_settings',
  PASSWORD_HASH: 'password_hash',
  PASSWORD_SALT: 'password_salt',
  IS_LOCKED: 'is_locked',
  LAST_SYNC: 'last_sync'
} as const;
