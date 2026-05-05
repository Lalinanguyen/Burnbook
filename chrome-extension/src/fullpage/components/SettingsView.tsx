import React, { useEffect, useState } from 'react';
import { KeyRound, Check, X, Home, Bell } from 'lucide-react';
import { localStorage as db } from '../../shared/storage/LocalDB';
import { passwordManager, secureStorage } from '../../shared/utils/encryption';
import type { RoomTheme } from './Room';

const ROOM_OPTIONS: { value: RoomTheme; label: string; note?: string }[] = [
  { value: 'girls', label: '💖 Girls Room' },
  { value: 'boys', label: '💪 Boys Room', note: 'coming soon — falls back to bare for now' },
  { value: 'bare', label: '⚪ Just Walls' },
];

export default function SettingsView() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roomTheme, setRoomTheme] = useState<RoomTheme>('girls');
  const [roomSaved, setRoomSaved] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [testStatus, setTestStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    db.getUserSettings().then(s => {
      if (s?.roomTheme) setRoomTheme(s.roomTheme);
      if (typeof s?.notificationsEnabled === 'boolean') setNotificationsEnabled(s.notificationsEnabled);
      if (typeof s?.reminderNotifications === 'boolean') setReminderNotifications(s.reminderNotifications);
    }).catch(() => {});
  }, []);

  const persistNotifPref = async (patch: { notificationsEnabled?: boolean; reminderNotifications?: boolean }) => {
    try {
      const settings = await db.getUserSettings();
      if (!settings) return;
      await db.updateUserSettings(settings.userId ?? '', patch);
    } catch (err) {
      console.error('Error saving notification settings:', err);
    }
  };

  const handleMasterToggle = (next: boolean) => {
    setNotificationsEnabled(next);
    persistNotifPref({ notificationsEnabled: next });
  };

  const handleReminderToggle = (next: boolean) => {
    setReminderNotifications(next);
    persistNotifPref({ reminderNotifications: next });
  };

  const sendTestNotification = async () => {
    setTestStatus('idle');
    try {
      const res = await chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' });
      setTestStatus(res?.success ? 'sent' : 'error');
    } catch {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus('idle'), 2500);
  };

  const handleRoomChange = async (theme: RoomTheme) => {
    setRoomTheme(theme);
    setRoomSaved(false);
    try {
      const settings = await db.getUserSettings();
      if (!settings) return;
      await db.updateUserSettings(settings.userId ?? '', { roomTheme: theme });
      setRoomSaved(true);
      setTimeout(() => setRoomSaved(false), 2000);
    } catch (err) {
      console.error('Error saving room theme:', err);
    }
  };

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

        <div className="card mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-burn-pink-light">
              <Home size={20} className="text-burn-pink-darker" />
            </div>
            <h2 className="font-handwritten text-xl text-burn-pink-darker">Room Theme</h2>
          </div>

          <p className="text-xs font-serif text-burn-gray mb-4">
            Pick the room around your bookshelf. Reopen the bookshelf to see changes.
          </p>

          <div className="space-y-2">
            {ROOM_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleRoomChange(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all font-handwritten text-base ${
                  roomTheme === opt.value
                    ? 'bg-burn-pink-light border-burn-pink-dark text-burn-pink-darker'
                    : 'bg-white border-burn-pink-light text-burn-gray hover:bg-burn-cream'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  {roomTheme === opt.value && <Check size={16} />}
                </div>
                {opt.note && (
                  <div className="text-[11px] font-serif text-burn-gray mt-1 italic">{opt.note}</div>
                )}
              </button>
            ))}
          </div>

          {roomSaved && (
            <div className="flex items-center gap-2 text-green-700 text-xs font-serif mt-3">
              <Check size={14} />
              Saved.
            </div>
          )}
        </div>

        <div className="card mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-burn-pink-light">
              <Bell size={20} className="text-burn-pink-darker" />
            </div>
            <h2 className="font-handwritten text-xl text-burn-pink-darker">Reminders</h2>
          </div>

          <p className="text-xs font-serif text-burn-gray mb-4">
            Get a daily nudge when it's been a while since you've checked in with someone.
          </p>

          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className="font-serif text-sm text-burn-black">Notifications</span>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => handleMasterToggle(e.target.checked)}
              className="h-4 w-4 accent-burn-pink-darker"
            />
          </label>

          <label className={`flex items-center justify-between py-2 cursor-pointer ${!notificationsEnabled ? 'opacity-50' : ''}`}>
            <span className="font-serif text-sm text-burn-black">Relationship check-ins</span>
            <input
              type="checkbox"
              checked={reminderNotifications}
              disabled={!notificationsEnabled}
              onChange={(e) => handleReminderToggle(e.target.checked)}
              className="h-4 w-4 accent-burn-pink-darker"
            />
          </label>

          <button
            type="button"
            onClick={sendTestNotification}
            disabled={!notificationsEnabled}
            className="btn-secondary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send test notification
          </button>

          {testStatus === 'sent' && (
            <div className="flex items-center gap-2 text-green-700 text-xs font-serif mt-3">
              <Check size={14} />
              Notification sent.
            </div>
          )}
          {testStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 text-xs font-serif mt-3">
              <X size={14} />
              Couldn't send. Check OS notification permissions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
