import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, LocalStorage } from '../../src/shared/storage/LocalDB';
import { OffenseModel } from '../../src/shared/models/Offense';
import { RelationshipModel } from '../../src/shared/models/Relationship';
import type { UserSettings } from '../../src/shared/types';

const storage = new LocalStorage();

const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  await Promise.all([
    db.books.clear(),
    db.offenses.clear(),
    db.relationships.clear(),
    db.settings.clear(),
    db.memoryPages.clear(),
    db.scrapbookItems.clear(),
    db.rants.clear(),
  ]);
});

afterAll(async () => {
  db.close();
});

function makeOffense(overrides: Partial<ConstructorParameters<typeof OffenseModel>[0]> = {}) {
  return new OffenseModel({
    bookId: 'b1',
    personName: 'Regina',
    personId: 'p1',
    title: 'late again',
    severity: 2,
    occurrenceDate: new Date(),
    ...overrides,
  }).toObject();
}

function makeRel(overrides: Partial<ConstructorParameters<typeof RelationshipModel>[0]> = {}) {
  return new RelationshipModel({
    bookId: 'b1',
    personName: 'Regina',
    contactFrequency: 'weekly',
    strengthScore: 70,
    ...overrides,
  }).toObject();
}

describe('LocalStorage offenses', () => {
  it('createOffense + getOffense round-trip', async () => {
    const o = makeOffense();
    await storage.createOffense(o);
    const fetched = await storage.getOffense(o.id);
    expect(fetched?.id).toBe(o.id);
    expect(fetched?.title).toBe('late again');
  });

  it('getOffensesByPersonId filters correctly', async () => {
    await storage.createOffense(makeOffense({ personId: 'p1', title: 'a' }));
    await storage.createOffense(makeOffense({ personId: 'p1', title: 'b' }));
    await storage.createOffense(makeOffense({ personId: 'p2', title: 'c' }));
    const p1 = await storage.getOffensesByPersonId('p1');
    expect(p1.map((o) => o.title).sort()).toEqual(['a', 'b']);
  });

  it('getOffensesBySeverity filters correctly', async () => {
    await storage.createOffense(makeOffense({ severity: 1 }));
    await storage.createOffense(makeOffense({ severity: 5 }));
    await storage.createOffense(makeOffense({ severity: 5 }));
    expect((await storage.getOffensesBySeverity(5)).length).toBe(2);
    expect((await storage.getOffensesBySeverity(3)).length).toBe(0);
  });

  it('getUnresolvedOffenses excludes resolved + archived', async () => {
    await storage.createOffense(makeOffense({ title: 'open' }));
    await storage.createOffense(makeOffense({ title: 'closed', resolved: true }));
    await storage.createOffense(makeOffense({ title: 'shelved', archived: true }));
    const unresolved = await storage.getUnresolvedOffenses();
    expect(unresolved.map((o) => o.title)).toEqual(['open']);
  });

  it('getRecentOffenses returns at most N, newest first', async () => {
    for (let i = 0; i < 7; i++) {
      await storage.createOffense(makeOffense({ occurrenceDate: new Date(Date.now() - i * DAY) }));
    }
    const recent = await storage.getRecentOffenses(3);
    expect(recent.length).toBe(3);
    expect(recent[0].occurrenceDate.getTime()).toBeGreaterThan(recent[2].occurrenceDate.getTime());
  });

  it('updateOffense merges updates and sets localModified', async () => {
    const o = makeOffense({ title: 'old' });
    await storage.createOffense(o);
    await storage.updateOffense(o.id, { title: 'new' });
    const updated = await storage.getOffense(o.id);
    expect(updated?.title).toBe('new');
    expect(updated?.localModified).toBe(true);
  });

  it('deleteOffense removes the record', async () => {
    const o = makeOffense();
    await storage.createOffense(o);
    await storage.deleteOffense(o.id);
    expect(await storage.getOffense(o.id)).toBeUndefined();
  });
});

describe('LocalStorage relationships', () => {
  it('getRelationshipsNeedingAttention: includes <40, excludes ≥40 and archived', async () => {
    await storage.createRelationship(makeRel({ personName: 'a', strengthScore: 20 }));
    await storage.createRelationship(makeRel({ personName: 'b', strengthScore: 39 }));
    await storage.createRelationship(makeRel({ personName: 'c', strengthScore: 40 }));
    await storage.createRelationship(makeRel({ personName: 'd', strengthScore: 80 }));
    await storage.createRelationship(makeRel({ personName: 'e', strengthScore: 10, archived: true }));

    const needing = await storage.getRelationshipsNeedingAttention();
    expect(needing.map((r) => r.personName).sort()).toEqual(['a', 'b']);
  });
});

describe('LocalStorage user settings', () => {
  it('createUserSettings + settingsExist + getUserSettings', async () => {
    expect(await storage.settingsExist()).toBe(false);
    const settings: UserSettings = {
      userId: 'u1',
      passwordHash: 'h',
      passwordSalt: 's',
      cloudSyncEnabled: false,
      autoSyncInterval: 15,
      notificationsEnabled: true,
      reminderNotifications: true,
      importantDateNotifications: true,
      theme: 'light',
      defaultView: 'dashboard',
      offenseCategories: [],
      relationshipTypes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await storage.createUserSettings(settings);
    expect(await storage.settingsExist()).toBe(true);
    const fetched = await storage.getUserSettings();
    expect(fetched?.userId).toBe('u1');
  });
});

describe('LocalStorage export / import round-trip', () => {
  it('counts match after clear + import', async () => {
    await storage.createOffense(makeOffense({ title: 'a' }));
    await storage.createOffense(makeOffense({ title: 'b' }));
    await storage.createRelationship(makeRel({ personName: 'r1' }));

    const exported = await storage.exportData();
    expect(exported.offenses.length).toBe(2);
    expect(exported.relationships.length).toBe(1);

    await storage.clearAllData();
    expect((await storage.getAllOffenses()).length).toBe(0);

    await storage.importData({
      offenses: exported.offenses,
      relationships: exported.relationships,
    });
    expect((await storage.getAllOffenses()).length).toBe(2);
    expect((await storage.getAllRelationships()).length).toBe(1);
  });
});
