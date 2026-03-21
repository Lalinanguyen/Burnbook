import { v4 as uuidv4 } from 'uuid';
import {
  Offense as IOffense,
  CreateOffenseData,
  UpdateOffenseData,
  SeverityLevel
} from '../types';
import { SEVERITY_LEVELS } from '../constants';

export class OffenseModel implements IOffense {
  id: string;
  userId?: string;
  bookId: string;
  personName: string;
  personId?: string;
  title: string;
  description: string;
  occurrenceDate: Date;
  createdAt: Date;
  updatedAt: Date;
  severity: SeverityLevel;
  categories: string[];
  tags: string[];
  evidence: IOffense['evidence'];
  resolved: boolean;
  resolutionDate?: Date;
  resolutionNotes?: string;
  archived: boolean;
  localModified: boolean;

  constructor(data: Partial<IOffense>) {
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.bookId = data.bookId || '';
    this.personName = data.personName || '';
    this.personId = data.personId;
    this.title = data.title || '';
    this.description = data.description || '';
    this.occurrenceDate = data.occurrenceDate || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.severity = data.severity || 1;
    this.categories = data.categories || [];
    this.tags = data.tags || [];
    this.evidence = data.evidence || { notes: '' };
    this.resolved = data.resolved ?? false;
    this.resolutionDate = data.resolutionDate;
    this.resolutionNotes = data.resolutionNotes;
    this.archived = data.archived ?? false;
    this.localModified = data.localModified ?? true;
  }

  /**
   * Create a new offense from form data
   */
  static create(data: CreateOffenseData): OffenseModel {
    return new OffenseModel({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolved: false,
      archived: false,
      localModified: true
    });
  }

  /**
   * Update the offense
   */
  update(data: UpdateOffenseData): void {
    Object.assign(this, data);
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Mark as resolved
   */
  markAsResolved(resolutionNotes?: string): void {
    this.resolved = true;
    this.resolutionDate = new Date();
    this.resolutionNotes = resolutionNotes;
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Reopen a resolved offense
   */
  reopen(): void {
    this.resolved = false;
    this.resolutionDate = undefined;
    this.resolutionNotes = undefined;
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Archive the offense
   */
  archive(): void {
    this.archived = true;
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Unarchive the offense
   */
  unarchive(): void {
    this.archived = false;
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Get severity details
   */
  getSeverityDetails() {
    return SEVERITY_LEVELS[this.severity];
  }

  /**
   * Add a tag
   */
  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
      this.localModified = true;
    }
  }

  /**
   * Remove a tag
   */
  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Add a category
   */
  addCategory(category: string): void {
    if (!this.categories.includes(category)) {
      this.categories.push(category);
      this.updatedAt = new Date();
      this.localModified = true;
    }
  }

  /**
   * Remove a category
   */
  removeCategory(category: string): void {
    this.categories = this.categories.filter(c => c !== category);
    this.updatedAt = new Date();
    this.localModified = true;
  }

  /**
   * Check if offense is recent (within last 30 days)
   */
  isRecent(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.occurrenceDate >= thirtyDaysAgo;
  }

  /**
   * Get days since offense occurred
   */
  getDaysSinceOccurrence(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.occurrenceDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Convert to plain object for storage
   */
  toObject(): IOffense {
    return {
      id: this.id,
      userId: this.userId,
      bookId: this.bookId,
      personName: this.personName,
      personId: this.personId,
      title: this.title,
      description: this.description,
      occurrenceDate: this.occurrenceDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      severity: this.severity,
      categories: this.categories,
      tags: this.tags,
      evidence: this.evidence,
      resolved: this.resolved,
      resolutionDate: this.resolutionDate,
      resolutionNotes: this.resolutionNotes,
      archived: this.archived,
      localModified: this.localModified
    };
  }
}
