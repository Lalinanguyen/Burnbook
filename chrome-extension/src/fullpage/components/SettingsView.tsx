import React, { useState } from 'react';
import { KeyRound, Check, X } from 'lucide-react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { passwordManager, secureStorage } from '../../shared/utils/encryption';

export default function SettingsView() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const settings = await db.getUserSettings();
      if (!settings) {
        setError('Could not load settings.');
        return;
      }

      // Verify current password
      const isValid = passwordManager.verifyPassword(
        currentPassword,
        settings.passwordHash,
        settings.passwordSalt,
      );
      if (!isValid) {
        setError('Current password is incorrect.');
        return;
      }

      // Validate new password strength
      const { isValid: passwordStrong, errors: strengthErrors } = passwordManager.validatePasswordStrength(newPassword);
      if (!passwordStrong) {
        setError(strengthErrors[0]);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.');
        return;
      }

      if (newPassword === currentPassword) {
        setError('New password must be different from current password.');
        return;
      }

      // Generate new salt + hash, update DB, re-initialize session key
      const newSalt = passwordManager.generateSalt();
      const newHash = passwordManager.hashPassword(newPassword, newSalt);

      await db.updateUserSettings(settings.userId ?? '', {
        passwordHash: newHash,
        passwordSalt: newSalt,
      });

      await secureStorage.initialize(newPassword, newSalt);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-burn-cream to-burn-pink-light flex items-start justify-center pt-16 pb-32 px-4">
      <div className="w-full max-w-md">
        <h1 className="font-handwritten text-4xl text-burn-pink-darker mb-8 text-center">Settings</h1>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-burn-pink-light">
              <KeyRound size={20} className="text-burn-pink-darker" />
            </div>
            <h2 className="font-handwritten text-xl text-burn-pink-darker">Change Password</h2>
          </div>

          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-5 text-sm font-serif">
              <Check size={16} />
              Password updated successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-serif text-burn-gray mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setError(''); setSuccess(false); }}
                className="input-field"
                placeholder="Enter current password"
                required
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-xs font-serif text-burn-gray mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); setSuccess(false); }}
                className="input-field"
                placeholder="At least 8 chars, A-Z, a-z, 0-9"
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-xs font-serif text-burn-gray mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); setSuccess(false); }}
                className="input-field"
                placeholder="Repeat new password"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm font-serif">
                <X size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
