import { describe, it, expect } from 'vitest';
import { OffenseModel } from '../../src/shared/models/Offense';
import { SEVERITY_LEVELS } from '../../src/shared/constants';
import type { SeverityLevel } from '../../src/shared/types';

const DAY = 24 * 60 * 60 * 1000;

describe('OffenseModel.getSeverityDetails', () => {
  it.each([1, 2, 3, 4, 5] as SeverityLevel[])('returns SEVERITY_LEVELS entry for severity %i', (severity) => {
    const offense = new OffenseModel({ severity });
    expect(offense.getSeverityDetails()).toBe(SEVERITY_LEVELS[severity]);
  });

  it('returns undefined for an unknown severity', () => {
    const offense = new OffenseModel({ severity: 99 as unknown as SeverityLevel });
    expect(offense.getSeverityDetails()).toBeUndefined();
  });
});

describe('OffenseModel.isRecent', () => {
  it('is true within the last 30 days', () => {
    const offense = new OffenseModel({ occurrenceDate: new Date(Date.now() - 10 * DAY) });
    expect(offense.isRecent()).toBe(true);
  });

  it('is false beyond 30 days', () => {
    const offense = new OffenseModel({ occurrenceDate: new Date(Date.now() - 45 * DAY) });
    expect(offense.isRecent()).toBe(false);
  });
});

describe('OffenseModel.getDaysSinceOccurrence', () => {
  it('returns the ceiling of elapsed days', () => {
    const offense = new OffenseModel({ occurrenceDate: new Date(Date.now() - 9.2 * DAY) });
    expect(offense.getDaysSinceOccurrence()).toBe(10);
  });
});

describe('OffenseModel state transitions', () => {
  it('markAsResolved sets resolved + resolutionDate + notes', () => {
    const offense = new OffenseModel({ severity: 2 });
    offense.markAsResolved('we talked it out');
    expect(offense.resolved).toBe(true);
    expect(offense.resolutionNotes).toBe('we talked it out');
    expect(offense.resolutionDate).toBeInstanceOf(Date);
  });

  it('reopen clears resolution fields', () => {
    const offense = new OffenseModel({ severity: 2 });
    offense.markAsResolved('x');
    offense.reopen();
    expect(offense.resolved).toBe(false);
    expect(offense.resolutionDate).toBeUndefined();
    expect(offense.resolutionNotes).toBeUndefined();
  });

  it('addTag is idempotent', () => {
    const offense = new OffenseModel({ severity: 1 });
    offense.addTag('rude');
    offense.addTag('rude');
    expect(offense.tags).toEqual(['rude']);
  });
});
