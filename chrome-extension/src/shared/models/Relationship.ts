import { v4 as uuidv4 } from 'uuid';
import {
  Relationship as IRelationship,
  CreateRelationshipData,
  UpdateRelationshipData,
  RelationshipHealthStatus,
  PositiveMoment,
  ImportantDate
} from '../types';
import { APP_CONFIG } from '../constants';
import { dateHelpers } from '../utils';

export class RelationshipModel implements IRelationship {
  id: string;
  userId?: string;
  bookId: string;
  personName: string;
  relationship: IRelationship['relationship'];
  createdAt: Date;
  updatedAt: Date;
  strengthScore: number;
  lastContactDate?: Date;
  contactFrequency: IRelationship['contactFrequency'];
  importantDates: ImportantDate[];
  positiveMoments: PositiveMoment[];
  nextReminderDate?: Date;
  reminderEnabled: boolean;
  reminderFrequency: number;
  sharing?: IRelationship['sharing'];
  notes: string;
  archived: boolean;
  localModified: boolean;

  constructor(data: Partial<IRelationship>) {
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.bookId = data.bookId || '';
    this.personName = data.personName || '';
    this.relationship = data.relationship || 'other';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.strengthScore = data.strengthScore || 0;
    this.lastContactDate = data.lastContactDate;
    this.contactFrequency = data.contactFrequency || 'weekly';
    this.importantDates = data.importantDates || [];
    this.positiveMoments = data.positiveMoments || [];
    this.nextReminderDate = data.nextReminderDate;
    this.reminderEnabled = data.reminderEnabled ?? true;
    this.reminderFrequency = data.reminderFrequency || APP_CONFIG.DEFAULT_REMINDER_FREQUENCY;
    this.sharing = data.sharing;
    this.notes = data.notes || '';
    this.archived = data.archived ?? false;
    this.localModified = data.localModified ?? true;

    // Calculate initial strength score if not provided
    if (!data.strengthScore) {
      this.calculateStrengthScore();
    }
  }

  /**
   * Create a new relationship from form data
   */
  static create(data: CreateRelationshipData): RelationshipModel {
    return new RelationshipModel({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      positiveMoments: [],
      strengthScore: 0,
      archived: false,
      localModified: true
    });
  }

  /**
   * Update the relationship
   */
  update(data: UpdateRelationshipData): void {
    Object.assign(this, data);
    this.updatedAt = new Date();
    this.localModified = true;

    // Recalculate strength score after update
    this.calculateStrengthScore();
  }

  /**
   * Calculate relationship strength score (0-100)
   */
  calculateStrengthScore(offenseCount: number = 0): number {
    let score = APP_CONFIG.STRENGTH_BASE_SCORE;

    // 1. Recency of contact (±30 points)
    const daysSinceContact = this.getDaysSinceLastContact();
    if (daysSinceContact === null) {
      // No contact recorded, slight penalty
      score -= 5;
    } else if (daysSinceContact < 7) {
      score += 30;
    } else if (daysSinceContact < 30) {
      score += 20;
    } else if (daysSinceContact < 90) {
      score += 10;
    } else {
      score -= 10; // Penalty for long gaps
    }

    // 2. Positive moments count (up to +20 points)
    const momentCount = this.positiveMoments.length;
    score += Math.min(momentCount * 2, APP_CONFIG.STRENGTH_MOMENTS_MAX);

    // 3. Contact frequency adherence (±10 points)
    const expectedDays = this.getExpectedContactFrequencyDays();
    if (daysSinceContact !== null && daysSinceContact <= expectedDays) {
      score += APP_CONFIG.STRENGTH_FREQUENCY_BONUS;
    } else if (daysSinceContact !== null && daysSinceContact > expectedDays * 2) {
      score -= APP_CONFIG.STRENGTH_FREQUENCY_BONUS;
    }

    // 4. Offense penalty (minus points)
    score -= offenseCount * APP_CONFIG.STRENGTH_OFFENSE_PENALTY;

    // Cap between 0-100
    this.strengthScore = Math.max(0, Math.min(100, score));
    return this.strengthScore;
  }

  /**
   * Get days since last contact
   */
  getDaysSinceLastContact(): number | null {
    if (!this.lastContactDate) {
      return null;
    }
    return dateHelpers.daysBetween(this.lastContactDate, new Date());
  }

  /**
   * Get expected contact frequency in days
   */
  getExpectedContactFrequencyDays(): number {
    const frequencyMap = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90
    };
    return frequencyMap[this.contactFrequency];
  }

  /**
   * Get relationship health status
   */
  getHealthStatus(): RelationshipHealthStatus {
    if (this.strengthScore >= 80) return 'excellent';
    if (this.strengthScore >= 60) return 'good';
    if (this.strengthScore >= 40) return 'needs_attention';
    return 'critical';
  }

  /**
   * Record a contact event
   */
  recordContact(): void {
    this.lastContactDate = new Date();
    this.updatedAt = new Date();
    this.localModified = true;
    this.calculateStrengthScore();
    this.scheduleNextReminder();
  }

  /**
   * Add a positive moment
   */
  addPositiveMoment(moment: Omit<PositiveMoment, 'id'>): void {
    const newMoment: PositiveMoment = {
      ...moment,
      id: uuidv4()
    };
    this.positiveMoments.push(newMoment);
    this.updatedAt = new Date();
    this.localModified = true;
    this.calculateStrengthScore();
  }

  /**
   * Remove a positive moment
   */
  removePositiveMoment(momentId: string): void {
    this.positiveMoments = this.positiveMoments.filter(m => m.id !== momentId);
    this.updatedAt = new Date();
    this.localModified = true;
    this.calculateStrengthScore();
  }

  /**
   * Add an important date
   */
  addImportantDate(date: Omit<ImportantDate, 'id'>): void {
    const newDate: ImportantDate = {
      ...date,
      id: uuidv4()
    };
    this.importantDates.push(newDate);
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Remove an important date
   */
  removeImportantDate(dateId: string): void {
    this.importantDates = this.importantDates.filter(d => d.id !== dateId);
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Schedule next reminder based on frequency
   */
  scheduleNextReminder(): void {
    if (!this.reminderEnabled) {
      this.nextReminderDate = undefined;
      return;
    }

    const lastContact = this.lastContactDate || new Date();
    this.nextReminderDate = dateHelpers.addDays(lastContact, this.reminderFrequency);
  }

  /**
   * Check if reminder is due
   */
  isReminderDue(): boolean {
    if (!this.reminderEnabled || !this.nextReminderDate) {
      return false;
    }
    return dateHelpers.isPast(this.nextReminderDate);
  }

  /**
   * Get upcoming important dates (within next N days)
   */
  getUpcomingImportantDates(days: number = 30): ImportantDate[] {
    return this.importantDates.filter(date => {
      const nextOccurrence = dateHelpers.getNextOccurrence(date.date);
      return dateHelpers.isWithinDays(nextOccurrence, days);
    });
  }

  /**
   * Convert to plain object for storage
   */
  toObject(): IRelationship {
    return {
      id: this.id,
      userId: this.userId,
      bookId: this.bookId,
      personName: this.personName,
      relationship: this.relationship,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      strengthScore: this.strengthScore,
      lastContactDate: this.lastContactDate,
      contactFrequency: this.contactFrequency,
      importantDates: this.importantDates,
      positiveMoments: this.positiveMoments,
      nextReminderDate: this.nextReminderDate,
      reminderEnabled: this.reminderEnabled,
      reminderFrequency: this.reminderFrequency,
      sharing: this.sharing,
      notes: this.notes,
      archived: this.archived,
      localModified: this.localModified
    };
  }
}
