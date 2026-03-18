import CryptoJS from 'crypto-js';
import { APP_CONFIG } from '../constants';

export class PasswordManager {
  /**
   * Generate a random salt for password hashing
   */
  generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  /**
   * Hash a password using PBKDF2
   */
  hashPassword(password: string, salt: string): string {
    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: APP_CONFIG.PBKDF2_ITERATIONS
    });
    return hash.toString();
  }

  /**
   * Verify a password against a stored hash
   */
  verifyPassword(password: string, storedHash: string, salt: string): boolean {
    const hash = this.hashPassword(password, salt);
    return hash === storedHash;
  }

  /**
   * Derive an encryption key from password and salt
   */
  deriveKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: APP_CONFIG.PBKDF2_ITERATIONS
    }).toString();
  }

  /**
   * Encrypt data using AES
   */
  encryptData(data: any, key: string): string {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key);
    return encrypted.toString();
  }

  /**
   * Decrypt data using AES
   */
  decryptData<T = any>(encryptedData: string, key: string): T {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < APP_CONFIG.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${APP_CONFIG.PASSWORD_MIN_LENGTH} characters`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const passwordManager = new PasswordManager();

/**
 * Chrome Storage wrapper for secure data
 */
export class SecureStorage {
  private encryptionKey: string | null = null;

  /**
   * Initialize with password to derive encryption key
   */
  async initialize(password: string, salt: string): Promise<void> {
    this.encryptionKey = passwordManager.deriveKey(password, salt);
  }

  /**
   * Check if storage is initialized
   */
  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Save encrypted data to Chrome storage
   */
  async saveEncrypted<T>(key: string, data: T): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('SecureStorage not initialized');
    }

    const encrypted = passwordManager.encryptData(data, this.encryptionKey);
    await chrome.storage.local.set({ [key]: encrypted });
  }

  /**
   * Load and decrypt data from Chrome storage
   */
  async loadEncrypted<T>(key: string): Promise<T | null> {
    if (!this.encryptionKey) {
      throw new Error('SecureStorage not initialized');
    }

    const result = await chrome.storage.local.get(key);
    if (!result[key]) {
      return null;
    }

    return passwordManager.decryptData<T>(result[key], this.encryptionKey);
  }

  /**
   * Remove encrypted data
   */
  async removeEncrypted(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  /**
   * Clear encryption key (lock the extension)
   */
  lock(): void {
    this.encryptionKey = null;
  }
}

export const secureStorage = new SecureStorage();
