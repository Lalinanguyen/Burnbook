import { z } from 'zod';

// Offense validation schemas
export const severityLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]);

export const offenseEvidenceSchema = z.object({
  notes: z.string(),
  links: z.array(z.string().url()).optional()
});

export const createOffenseSchema = z.object({
  personName: z.string().min(1, 'Person name is required').max(100),
  personId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000),
  occurrenceDate: z.date(),
  severity: severityLevelSchema,
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  tags: z.array(z.string()),
  evidence: offenseEvidenceSchema
});

export const updateOffenseSchema = z.object({
  personName: z.string().min(1).max(100).optional(),
  personId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  occurrenceDate: z.date().optional(),
  severity: severityLevelSchema.optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  evidence: offenseEvidenceSchema.optional(),
  resolved: z.boolean().optional(),
  resolutionDate: z.date().optional(),
  resolutionNotes: z.string().max(2000).optional(),
  archived: z.boolean().optional()
});

// Relationship validation schemas
export const relationshipTypeSchema = z.enum(['friend', 'family', 'colleague', 'partner', 'other']);
export const contactFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly']);
export const importantDateTypeSchema = z.enum(['birthday', 'anniversary', 'custom']);
export const sharingPermissionSchema = z.enum(['view', 'edit', 'contribute']);

export const importantDateSchema = z.object({
  id: z.string().uuid(),
  type: importantDateTypeSchema,
  label: z.string().min(1).max(100),
  date: z.string().regex(/^\d{2}-\d{2}$/, 'Date must be in MM-DD format'),
  year: z.number().min(1900).max(2100).optional(),
  reminderDays: z.number().min(0).max(365)
});

export const positiveMomentSchema = z.object({
  id: z.string().uuid(),
  date: z.date(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  tags: z.array(z.string()),
  addedBy: z.string().optional()
});

export const privacySettingsSchema = z.object({
  shareOffenses: z.boolean(),
  sharePositiveMoments: z.boolean(),
  shareImportantDates: z.boolean(),
  shareNotes: z.boolean(),
  shareReminders: z.boolean()
});

export const sharedUserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  inviteAccepted: z.boolean(),
  permissions: sharingPermissionSchema
});

export const sharingSettingsSchema = z.object({
  enabled: z.boolean(),
  sharedWith: z.array(sharedUserSchema),
  privacySettings: privacySettingsSchema
});

export const createRelationshipSchema = z.object({
  personName: z.string().min(1, 'Person name is required').max(100),
  relationship: relationshipTypeSchema,
  contactFrequency: contactFrequencySchema,
  importantDates: z.array(importantDateSchema).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderFrequency: z.number().min(1).max(365).optional(),
  notes: z.string().max(5000).optional()
});

export const updateRelationshipSchema = z.object({
  personName: z.string().min(1).max(100).optional(),
  relationship: relationshipTypeSchema.optional(),
  contactFrequency: contactFrequencySchema.optional(),
  lastContactDate: z.date().optional(),
  importantDates: z.array(importantDateSchema).optional(),
  positiveMoments: z.array(positiveMomentSchema).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderFrequency: z.number().min(1).max(365).optional(),
  sharing: sharingSettingsSchema.optional(),
  notes: z.string().max(5000).optional(),
  archived: z.boolean().optional()
});

// User settings validation schemas
export const createUserSettingsSchema = z.object({
  passwordHash: z.string().min(1),
  passwordSalt: z.string().min(1)
});

export const updateUserSettingsSchema = z.object({
  cloudSyncEnabled: z.boolean().optional(),
  autoSyncInterval: z.number().min(5).max(1440).optional(),
  lastSyncAt: z.date().optional(),
  notificationsEnabled: z.boolean().optional(),
  reminderNotifications: z.boolean().optional(),
  importantDateNotifications: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  defaultView: z.enum(['offenses', 'relationships', 'dashboard']).optional(),
  offenseCategories: z.array(z.string()).optional(),
  relationshipTypes: z.array(z.string()).optional()
});
