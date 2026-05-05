import { describe, it, expect } from 'vitest';
import { selectDueReminders, pruneFiredReminders, dedupeKey } from '../../src/background/reminders';
import { RelationshipModel } from '../../src/shared/models/Relationship';
import type { Relationship } from '../../src/shared/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-05-05T12:00:00Z');

function rel(overrides: Partial<Relationship> = {}): Relationship {
  return new RelationshipModel({
    bookId: 'b1',
    personName: 'Regina',
    contactFrequency: 'weekly',
    strengthScore: 70,
    reminderEnabled: true,
    reminderFrequency: 7,
    nextReminderDate: new Date(NOW.getTime() - DAY),
    archived: false,
    ...overrides,
  }).toObject();
}

describe('selectDueReminders', () => {
  it('returns relationships with nextReminderDate <= now', () => {
    const due = rel({ id: 'a' });
    const future = rel({ id: 'b', nextReminderDate: new Date(NOW.getTime() + DAY) });
    const result = selectDueReminders([due, future], null, NOW, {});
    expect(result.map((r) => r.id)).toEqual(['a']);
  });

  it('excludes archived relationships even if due', () => {
    const r = rel({ id: 'a', archived: true });
    expect(selectDueReminders([r], null, NOW, {})).toEqual([]);
  });

  it('excludes relationships where reminderEnabled is false', () => {
    const r = rel({ id: 'a', reminderEnabled: false });
    expect(selectDueReminders([r], null, NOW, {})).toEqual([]);
  });

  it('excludes relationships with no nextReminderDate', () => {
    const r = rel({ id: 'a', nextReminderDate: undefined });
    expect(selectDueReminders([r], null, NOW, {})).toEqual([]);
  });

  it('returns empty when notificationsEnabled is false', () => {
    const r = rel({ id: 'a' });
    expect(selectDueReminders([r], { notificationsEnabled: false, reminderNotifications: true }, NOW, {})).toEqual([]);
  });

  it('returns empty when reminderNotifications is false', () => {
    const r = rel({ id: 'a' });
    expect(selectDueReminders([r], { notificationsEnabled: true, reminderNotifications: false }, NOW, {})).toEqual([]);
  });

  it('excludes relationships whose dedupe key is already in alreadyFired', () => {
    const r = rel({ id: 'a' });
    const key = dedupeKey(r)!;
    expect(selectDueReminders([r], null, NOW, { [key]: NOW.toISOString() })).toEqual([]);
  });

  it('preserves input order across multiple due relationships', () => {
    const a = rel({ id: 'a', nextReminderDate: new Date(NOW.getTime() - 2 * DAY) });
    const b = rel({ id: 'b', nextReminderDate: new Date(NOW.getTime() - DAY) });
    const c = rel({ id: 'c', nextReminderDate: new Date(NOW.getTime() + DAY) });
    expect(selectDueReminders([a, b, c], null, NOW, {}).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('pruneFiredReminders', () => {
  it('drops entries older than maxAgeDays', () => {
    const old = new Date(NOW.getTime() - 90 * DAY).toISOString();
    const fresh = new Date(NOW.getTime() - 5 * DAY).toISOString();
    const result = pruneFiredReminders({ stale: old, current: fresh }, NOW, 60);
    expect(result).toEqual({ current: fresh });
  });

  it('drops entries with unparseable timestamps', () => {
    const result = pruneFiredReminders({ junk: 'not-a-date', ok: NOW.toISOString() }, NOW, 60);
    expect(result).toEqual({ ok: NOW.toISOString() });
  });
});

describe('dedupeKey', () => {
  it('combines id + nextReminderDate ISO', () => {
    const r = rel({ id: 'xyz', nextReminderDate: new Date('2026-05-01T00:00:00Z') });
    expect(dedupeKey(r)).toBe('xyz_2026-05-01T00:00:00.000Z');
  });

  it('returns null when nextReminderDate is missing', () => {
    expect(dedupeKey({ id: 'x', nextReminderDate: undefined })).toBeNull();
  });
});
