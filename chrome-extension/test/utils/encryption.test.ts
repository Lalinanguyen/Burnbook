import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordManager, SecureStorage } from '../../src/shared/utils/encryption';
import { __resetChromeStorage } from '../setup';

const pm = new PasswordManager();

describe('PasswordManager.hashPassword / verifyPassword', () => {
  it('is deterministic for the same password + salt', () => {
    const salt = 'fixed-salt';
    expect(pm.hashPassword('hunter22', salt)).toBe(pm.hashPassword('hunter22', salt));
  });

  it('different salts produce different hashes', () => {
    expect(pm.hashPassword('hunter22', 'a')).not.toBe(pm.hashPassword('hunter22', 'b'));
  });

  it('verifyPassword: correct password returns true', () => {
    const salt = pm.generateSalt();
    const hash = pm.hashPassword('CorrectHorse1', salt);
    expect(pm.verifyPassword('CorrectHorse1', hash, salt)).toBe(true);
  });

  it('verifyPassword: wrong password returns false', () => {
    const salt = pm.generateSalt();
    const hash = pm.hashPassword('CorrectHorse1', salt);
    expect(pm.verifyPassword('wrong', hash, salt)).toBe(false);
  });
});

describe('PasswordManager.generateSalt', () => {
  it('returns a different value on each call', () => {
    expect(pm.generateSalt()).not.toBe(pm.generateSalt());
  });
});

describe('PasswordManager.encryptData / decryptData round-trip', () => {
  it('preserves a complex object', () => {
    const key = 'derived-key';
    const data = {
      name: 'Regina',
      tags: ['mean', 'scheming'],
      meta: { dob: '1989-01-01', count: 7 },
    };
    const encrypted = pm.encryptData(data, key);
    expect(encrypted).not.toContain('Regina');
    expect(pm.decryptData(encrypted, key)).toEqual(data);
  });

  it('decryption with the wrong key throws', () => {
    const encrypted = pm.encryptData({ a: 1 }, 'k1');
    expect(() => pm.decryptData(encrypted, 'k2')).toThrow();
  });
});

describe('PasswordManager.validatePasswordStrength', () => {
  it('rejects empty string with multiple errors', () => {
    const r = pm.validatePasswordStrength('');
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects "short"', () => {
    const r = pm.validatePasswordStrength('short');
    expect(r.isValid).toBe(false);
  });

  it('accepts "GoodPass1"', () => {
    expect(pm.validatePasswordStrength('GoodPass1')).toEqual({ isValid: true, errors: [] });
  });

  it('rejects "alllower1" (missing uppercase)', () => {
    const r = pm.validatePasswordStrength('alllower1');
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => e.toLowerCase().includes('uppercase'))).toBe(true);
  });
});

describe('SecureStorage', () => {
  let storage: SecureStorage;

  beforeEach(async () => {
    __resetChromeStorage();
    storage = new SecureStorage();
    await storage.initialize('GoodPass1', 'salt-xyz');
  });

  it('save → load round-trip returns the original payload', async () => {
    const payload = { offenses: [{ id: 'x', title: 'late' }] };
    await storage.saveEncrypted('vault', payload);
    const loaded = await storage.loadEncrypted<typeof payload>('vault');
    expect(loaded).toEqual(payload);
  });

  it('loadEncrypted returns null for a missing key', async () => {
    expect(await storage.loadEncrypted('missing')).toBeNull();
  });

  it('saveEncrypted before initialize throws', async () => {
    const fresh = new SecureStorage();
    await expect(fresh.saveEncrypted('k', { a: 1 })).rejects.toThrow(/not initialized/);
  });

  it('lock() prevents subsequent loads', async () => {
    await storage.saveEncrypted('k', { a: 1 });
    storage.lock();
    await expect(storage.loadEncrypted('k')).rejects.toThrow(/not initialized/);
  });
});
