import { describe, it, expect } from 'vitest';
import { RelationshipModel } from '../../src/shared/models/Relationship';
import { APP_CONFIG } from '../../src/shared/constants';

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

function makeRel(overrides: Partial<ConstructorParameters<typeof RelationshipModel>[0]> = {}) {
  return new RelationshipModel({
    bookId: 'b1',
    personName: 'Test',
    contactFrequency: 'weekly',
    strengthScore: 50,
    ...overrides,
  });
}

describe('RelationshipModel.calculateStrengthScore', () => {
  it('penalizes when there is no recorded contact', () => {
    const rel = makeRel({ lastContactDate: undefined, positiveMoments: [] });
    expect(rel.calculateStrengthScore(0)).toBe(APP_CONFIG.STRENGTH_BASE_SCORE - 5);
  });

  it('rewards recent contact within frequency window (weekly, 1 day ago)', () => {
    const rel = makeRel({ lastContactDate: daysAgo(1), positiveMoments: [] });
    expect(rel.calculateStrengthScore(0)).toBe(
      APP_CONFIG.STRENGTH_BASE_SCORE + 30 + APP_CONFIG.STRENGTH_FREQUENCY_BONUS
    );
  });

  it('applies frequency penalty when gap > 2x expected (weekly, 15 days)', () => {
    const rel = makeRel({ lastContactDate: daysAgo(15), positiveMoments: [] });
    expect(rel.calculateStrengthScore(0)).toBe(
      APP_CONFIG.STRENGTH_BASE_SCORE + 20 - APP_CONFIG.STRENGTH_FREQUENCY_BONUS
    );
  });

  it('penalizes long gaps (100 days, monthly cadence)', () => {
    const rel = makeRel({ lastContactDate: daysAgo(100), contactFrequency: 'monthly', positiveMoments: [] });
    expect(rel.calculateStrengthScore(0)).toBe(APP_CONFIG.STRENGTH_BASE_SCORE - 10 - APP_CONFIG.STRENGTH_FREQUENCY_BONUS);
  });

  it('caps positive-moment bonus at STRENGTH_MOMENTS_MAX', () => {
    const moments = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i}`,
      date: new Date(),
      title: 't',
      description: 'x',
      tags: [],
    }));
    const rel = makeRel({ lastContactDate: daysAgo(1), positiveMoments: moments });
    const expected =
      APP_CONFIG.STRENGTH_BASE_SCORE + 30 + APP_CONFIG.STRENGTH_FREQUENCY_BONUS + APP_CONFIG.STRENGTH_MOMENTS_MAX;
    expect(rel.calculateStrengthScore(0)).toBe(Math.min(100, expected));
  });

  it('floors the score at 0 when offense penalty exceeds base', () => {
    const rel = makeRel({ lastContactDate: undefined, positiveMoments: [] });
    expect(rel.calculateStrengthScore(50)).toBe(0);
  });

  it('caps the score at 100', () => {
    const moments = Array.from({ length: 50 }, (_, i) => ({
      id: `m${i}`,
      date: new Date(),
      title: 't',
      description: 'x',
      tags: [],
    }));
    const rel = makeRel({ lastContactDate: daysAgo(0), positiveMoments: moments });
    expect(rel.calculateStrengthScore(0)).toBe(100);
  });
});

describe('RelationshipModel.getHealthStatus', () => {
  it.each([
    [80, 'excellent'],
    [99, 'excellent'],
    [60, 'good'],
    [79, 'good'],
    [40, 'needs_attention'],
    [59, 'needs_attention'],
    [39, 'critical'],
    [0, 'critical'],
  ])('score %i → %s', (score, status) => {
    const rel = makeRel({ strengthScore: 50 });
    rel.strengthScore = score;
    expect(rel.getHealthStatus()).toBe(status);
  });
});
