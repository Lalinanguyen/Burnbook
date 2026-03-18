import Dexie, { Table } from 'dexie';
import { Offense, Relationship, UserSettings } from '../types';
import { APP_CONFIG } from '../constants';

export class BurnBookDB extends Dexie {
  offenses!: Table<Offense, string>;
  relationships!: Table<Relationship, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super(APP_CONFIG.DB_NAME);

    this.version(APP_CONFIG.DB_VERSION).stores({
      offenses: 'id, userId, personName, personId, occurrenceDate, severity, createdAt, archived, localModified',
      relationships: 'id, userId, personName, strengthScore, lastContactDate, nextReminderDate, archived, localModified',
      settings: 'userId'
    });
  }
}

// Singleton instance
export const db = new BurnBookDB();

export class LocalStorage {
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

  // ===== UTILITY =====

  async clearAllData(): Promise<void> {
    await db.offenses.clear();
    await db.relationships.clear();
    await db.settings.clear();
  }

  async exportData(): Promise<{ offenses: Offense[]; relationships: Relationship[]; settings: UserSettings | undefined }> {
    return {
      offenses: await this.getAllOffenses(),
      relationships: await this.getAllRelationships(),
      settings: await this.getUserSettings()
    };
  }

  async importData(data: { offenses: Offense[]; relationships: Relationship[]; settings?: UserSettings }): Promise<void> {
    await db.transaction('rw', db.offenses, db.relationships, db.settings, async () => {
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
