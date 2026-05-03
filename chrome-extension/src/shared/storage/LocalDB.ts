import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Offense, Relationship, UserSettings, Book, MemoryPage, ScrapbookItem, Rant } from '../types';
import { APP_CONFIG } from '../constants';

export class BurnBookDB extends Dexie {
  books!: Table<Book, string>;
  offenses!: Table<Offense, string>;
  relationships!: Table<Relationship, string>;
  settings!: Table<UserSettings, string>;
  memoryPages!: Table<MemoryPage, string>;
  scrapbookItems!: Table<ScrapbookItem, string>;
  rants!: Table<Rant, string>;

  constructor() {
    super(APP_CONFIG.DB_NAME);

    // V1: Original schema
    this.version(1).stores({
      offenses: 'id, userId, personName, personId, occurrenceDate, severity, createdAt, archived, localModified',
      relationships: 'id, userId, personName, strengthScore, lastContactDate, nextReminderDate, archived, localModified',
      settings: 'userId'
    });

    // V2: Added books table and bookId to offenses/relationships
    this.version(2).stores({
      books: 'id, userId, personName, createdAt, archived',
      offenses: 'id, userId, bookId, personName, personId, occurrenceDate, severity, createdAt, archived, localModified',
      relationships: 'id, userId, bookId, personName, strengthScore, lastContactDate, nextReminderDate, archived, localModified',
      settings: 'userId'
    });

    // V3: Good Memories, Yap (rants), scrapbook items
    this.version(3).stores({
      books: 'id, userId, personName, createdAt, archived',
      offenses: 'id, userId, bookId, personName, personId, occurrenceDate, severity, createdAt, archived, localModified',
      relationships: 'id, userId, bookId, personName, strengthScore, lastContactDate, nextReminderDate, archived, localModified',
      settings: 'userId',
      memoryPages: 'id, bookId, pageOrder',
      scrapbookItems: 'id, pageId, bookId, type',
      rants: 'id, bookId, createdAt'
    });
  }
}

// Singleton instance
export const db = new BurnBookDB();

export class LocalStorage {
  // ===== BOOKS =====

  async createBook(book: Book): Promise<void> {
    await db.books.add(book);
  }

  async getBook(id: string): Promise<Book | undefined> {
    return await db.books.get(id);
  }

  async getAllBooks(): Promise<Book[]> {
    return await db.books.filter(b => !b.archived).toArray();
  }

  async updateBook(id: string, updates: Partial<Book>): Promise<void> {
    await db.books.update(id, {
      ...updates,
      updatedAt: new Date(),
      localModified: true
    });
  }

  async deleteBook(id: string): Promise<void> {
    await db.books.delete(id);
    const pages = await db.memoryPages.where('bookId').equals(id).toArray();
    await Promise.all(pages.map(p => db.scrapbookItems.where('pageId').equals(p.id).delete()));
    await db.memoryPages.where('bookId').equals(id).delete();
    await db.rants.where('bookId').equals(id).delete();
  }

  // ===== OFFENSES =====

  async createOffense(offense: Offense): Promise<void> {
    await db.offenses.add(offense);
  }

  async getOffense(id: string): Promise<Offense | undefined> {
    return await db.offenses.get(id);
  }

  async getAllOffenses(): Promise<Offense[]> {
    return await db.offenses.toArray();
  }

  async getOffensesByPerson(personName: string): Promise<Offense[]> {
    return await db.offenses.where('personName').equals(personName).toArray();
  }

  async getOffensesByPersonId(personId: string): Promise<Offense[]> {
    return await db.offenses.where('personId').equals(personId).toArray();
  }

  async getOffensesByBook(bookId: string): Promise<Offense[]> {
    return await db.offenses.where('bookId').equals(bookId).toArray();
  }

  async getOffensesBySeverity(severity: number): Promise<Offense[]> {
    return await db.offenses.where('severity').equals(severity).toArray();
  }

  async getUnresolvedOffenses(): Promise<Offense[]> {
    return await db.offenses.filter(o => !o.resolved && !o.archived).toArray();
  }

  async getRecentOffenses(limit: number = 10): Promise<Offense[]> {
    return await db.offenses
      .orderBy('occurrenceDate')
      .reverse()
      .limit(limit)
      .toArray();
  }

  async updateOffense(id: string, updates: Partial<Offense>): Promise<void> {
    await db.offenses.update(id, {
      ...updates,
      updatedAt: new Date(),
      localModified: true
    });
  }

  async deleteOffense(id: string): Promise<void> {
    await db.offenses.delete(id);
  }

  async getModifiedOffenses(): Promise<Offense[]> {
    return await db.offenses.where('localModified').equals(1).toArray();
  }

  // ===== RELATIONSHIPS =====

  async createRelationship(relationship: Relationship): Promise<void> {
    await db.relationships.add(relationship);
  }

  async getRelationship(id: string): Promise<Relationship | undefined> {
    return await db.relationships.get(id);
  }

  async getAllRelationships(): Promise<Relationship[]> {
    return await db.relationships.toArray();
  }

  async getRelationshipByName(personName: string): Promise<Relationship | undefined> {
    return await db.relationships.where('personName').equals(personName).first();
  }

  async getRelationshipsByBook(bookId: string): Promise<Relationship[]> {
    return await db.relationships.where('bookId').equals(bookId).toArray();
  }

  async getRelationshipsByStrength(): Promise<Relationship[]> {
    return await db.relationships.orderBy('strengthScore').reverse().toArray();
  }

  async getRelationshipsNeedingAttention(): Promise<Relationship[]> {
    return await db.relationships.filter(r => r.strengthScore < 40 && !r.archived).toArray();
  }

  async getRelationshipsWithUpcomingReminders(): Promise<Relationship[]> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.relationships
      .where('nextReminderDate')
      .between(now, tomorrow, true, true)
      .toArray();
  }

  async updateRelationship(id: string, updates: Partial<Relationship>): Promise<void> {
    await db.relationships.update(id, {
      ...updates,
      updatedAt: new Date(),
      localModified: true
    });
  }

  async deleteRelationship(id: string): Promise<void> {
    await db.relationships.delete(id);
  }

  async getModifiedRelationships(): Promise<Relationship[]> {
    return await db.relationships.where('localModified').equals(1).toArray();
  }

  // ===== USER SETTINGS =====

  async createUserSettings(settings: UserSettings): Promise<void> {
    await db.settings.add(settings);
  }

  async getUserSettings(): Promise<UserSettings | undefined> {
    const all = await db.settings.toArray();
    return all[0]; // Should only be one settings record
  }

  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<void> {
    await db.settings.update(userId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async settingsExist(): Promise<boolean> {
    const count = await db.settings.count();
    return count > 0;
  }

  // ===== MEMORY PAGES =====

  async createMemoryPage(page: MemoryPage): Promise<void> {
    await db.memoryPages.add(page);
  }

  async getMemoryPagesByBook(bookId: string): Promise<MemoryPage[]> {
    return await db.memoryPages.where('bookId').equals(bookId).sortBy('pageOrder');
  }

  async updateMemoryPage(id: string, updates: Partial<MemoryPage>): Promise<void> {
    await db.memoryPages.update(id, { ...updates, updatedAt: new Date() });
  }

  async deleteMemoryPage(id: string): Promise<void> {
    await db.scrapbookItems.where('pageId').equals(id).delete();
    await db.memoryPages.delete(id);
  }

  async ensureTrailingBlankPage(bookId: string): Promise<void> {
    const pages = await db.memoryPages.where('bookId').equals(bookId).sortBy('pageOrder');

    const makeBlank = (order: number): MemoryPage => ({
      id: uuidv4(),
      bookId,
      pageOrder: order,
      title: '',
      caption: '',
      backgroundStyle: 'lined',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (pages.length === 0) {
      await db.memoryPages.add(makeBlank(0));
      return;
    }

    const lastPage = pages[pages.length - 1];
    const count = await db.scrapbookItems.where('pageId').equals(lastPage.id).count();
    if (count > 0) {
      await db.memoryPages.add(makeBlank(lastPage.pageOrder + 1));
    }
  }

  // ===== SCRAPBOOK ITEMS =====

  async createScrapbookItem(item: ScrapbookItem): Promise<void> {
    await db.scrapbookItems.add(item);
  }

  async getScrapbookItemsByPage(pageId: string): Promise<ScrapbookItem[]> {
    return await db.scrapbookItems.where('pageId').equals(pageId).toArray();
  }

  async getScrapbookItemsByBook(bookId: string): Promise<ScrapbookItem[]> {
    return await db.scrapbookItems.where('bookId').equals(bookId).toArray();
  }

  async updateScrapbookItem(id: string, updates: Partial<ScrapbookItem>): Promise<void> {
    await db.scrapbookItems.update(id, { ...updates, updatedAt: new Date() });
  }

  async deleteScrapbookItem(id: string): Promise<void> {
    await db.scrapbookItems.delete(id);
  }

  // ===== RANTS =====

  async createRant(rant: Rant): Promise<void> {
    await db.rants.add(rant);
  }

  async getRantsByBook(bookId: string): Promise<Rant[]> {
    const all = await db.rants.where('bookId').equals(bookId).toArray();
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateRant(id: string, updates: Partial<Rant>): Promise<void> {
    await db.rants.update(id, { ...updates, updatedAt: new Date() });
  }

  async deleteRant(id: string): Promise<void> {
    await db.rants.delete(id);
  }

  // ===== UTILITY =====

  async clearAllData(): Promise<void> {
    await db.books.clear();
    await db.offenses.clear();
    await db.relationships.clear();
    await db.settings.clear();
  }

  async exportData(): Promise<{ books: Book[]; offenses: Offense[]; relationships: Relationship[]; settings: UserSettings | undefined }> {
    return {
      books: await this.getAllBooks(),
      offenses: await this.getAllOffenses(),
      relationships: await this.getAllRelationships(),
      settings: await this.getUserSettings()
    };
  }

  async importData(data: { books?: Book[]; offenses: Offense[]; relationships: Relationship[]; settings?: UserSettings }): Promise<void> {
    await db.transaction('rw', db.books, db.offenses, db.relationships, db.settings, async () => {
      if (data.books && data.books.length > 0) {
        await db.books.bulkAdd(data.books);
      }
      if (data.offenses.length > 0) {
        await db.offenses.bulkAdd(data.offenses);
      }
      if (data.relationships.length > 0) {
        await db.relationships.bulkAdd(data.relationships);
      }
      if (data.settings) {
        await db.settings.add(data.settings);
      }
    });
  }
}

// Singleton instance
export const localStorage = new LocalStorage();
