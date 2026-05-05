import type { Relationship, UserSettings } from '../shared/types';

export interface ReminderGate {
  notificationsEnabled?: boolean;
  reminderNotifications?: boolean;
}

export function dedupeKey(rel: Pick<Relationship, 'id' | 'nextReminderDate'>): string | null {
  if (!rel.nextReminderDate) return null;
  const iso = new Date(rel.nextReminderDate).toISOString();
  return `${rel.id}_${iso}`;
}

export function selectDueReminders(
  relationships: Relationship[],
  settings: ReminderGate | null | undefined,
  now: Date,
  alreadyFired: Record<string, string>
): Relationship[] {
  if (settings && (settings.notificationsEnabled === false || settings.reminderNotifications === false)) {
    return [];
  }

  return relationships.filter((rel) => {
    if (rel.archived) return false;
    if (!rel.reminderEnabled) return false;
    if (!rel.nextReminderDate) return false;
    if (new Date(rel.nextReminderDate).getTime() > now.getTime()) return false;
    const key = dedupeKey(rel);
    if (key && alreadyFired[key]) return false;
    return true;
  });
}

export function pruneFiredReminders(
  fired: Record<string, string>,
  now: Date,
  maxAgeDays = 60
): Record<string, string> {
  const cutoff = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  const next: Record<string, string> = {};
  for (const [k, iso] of Object.entries(fired)) {
    const t = Date.parse(iso);
    if (Number.isFinite(t) && t >= cutoff) next[k] = iso;
  }
  return next;
}

export type { Relationship, UserSettings };
