import { db } from '../shared/storage/LocalDB';
import { Relationship, UserSettings } from '../shared/types';
import { dateHelpers } from '../shared/utils';
import {
  selectDueReminders,
  pruneFiredReminders,
  dedupeKey,
} from './reminders';

console.log('Burn Book background service worker started');

const DAILY_CHECK_ALARM = 'check-important-dates';
const FIRED_REMINDERS_KEY = 'firedReminders';
const SENT_DATES_KEY = 'sentNotifications';

// ─── Install / startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('backgroundSync', { periodInMinutes: 15 });
  scheduleDailyCheck();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleDailyCheck();
});

function scheduleDailyCheck() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  chrome.alarms.create(DAILY_CHECK_ALARM, {
    delayInMinutes: msUntilMidnight / 60000,
    periodInMinutes: 24 * 60,
  });
}

// ─── Alarm handler ────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'backgroundSync') {
    // future sync logic
  } else if (alarm.name === DAILY_CHECK_ALARM) {
    await checkImportantDates();
    await checkRelationshipReminders();
  }
});

// ─── Settings helpers ─────────────────────────────────────────────────────────

async function loadSettings(): Promise<UserSettings | null> {
  try {
    const all = await db.settings.toArray();
    return all[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Relationship reminder sweep ──────────────────────────────────────────────

async function checkRelationshipReminders() {
  let relationships: Relationship[];
  try {
    relationships = await db.relationships.toArray();
  } catch {
    return;
  }

  const settings = await loadSettings();
  const now = new Date();

  const stored = await chrome.storage.local.get(FIRED_REMINDERS_KEY);
  let fired: Record<string, string> = stored[FIRED_REMINDERS_KEY] || {};
  fired = pruneFiredReminders(fired, now);

  const due = selectDueReminders(relationships, settings, now, fired);

  for (const rel of due) {
    fireRelationshipReminder(rel);

    const key = dedupeKey(rel);
    if (key) fired[key] = now.toISOString();

    const next = dateHelpers.addDays(now, rel.reminderFrequency || 7);
    try {
      await db.relationships.update(rel.id, {
        nextReminderDate: next,
        localModified: true,
        updatedAt: new Date(),
      });
    } catch {
      // ignore — best effort
    }
  }

  await chrome.storage.local.set({ [FIRED_REMINDERS_KEY]: fired });
}

function fireRelationshipReminder(rel: Relationship) {
  try {
    chrome.notifications.create(`reminder_${rel.id}_${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: `👋 Check in with ${rel.personName}`,
      message: `It's been a while. How are things with ${rel.personName}?`,
      priority: 1,
    });
  } catch {
    // notifications may be unavailable in some contexts
  }
}

// ─── Important date checker ───────────────────────────────────────────────────

async function checkImportantDates() {
  let relationships: Relationship[];
  try {
    relationships = await db.relationships.toArray();
  } catch {
    return;
  }

  const today = new Date();
  const stored = await chrome.storage.local.get(SENT_DATES_KEY);
  const sent: Record<string, string> = stored[SENT_DATES_KEY] || {};

  for (const rel of relationships) {
    if (rel.archived) continue;
    const dates = rel.importantDates || [];

    for (const d of dates) {
      await maybeFire(
        `date_${rel.id}_${d.id}`,
        `📅 ${d.label} — ${rel.personName}`,
        `${d.label} for ${rel.personName} is coming up in ${d.reminderDays} days`,
        d.date,
        d.reminderDays,
        today,
        sent
      );
    }
  }

  await chrome.storage.local.set({ [SENT_DATES_KEY]: sent });
}

async function maybeFire(
  key: string,
  title: string,
  message: string,
  mmdd: string,
  reminderDays: number,
  today: Date,
  sent: Record<string, string>
) {
  const [month, day] = mmdd.split('-').map(Number);
  const targetThisYear = new Date(today.getFullYear(), month - 1, day);
  const targetNextYear = new Date(today.getFullYear() + 1, month - 1, day);

  const target = targetThisYear >= today ? targetThisYear : targetNextYear;
  const daysUntil = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (daysUntil !== reminderDays) return;

  const yearKey = `${key}_${today.getFullYear()}`;
  if (sent[yearKey]) return;

  try {
    chrome.notifications.create(yearKey, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title,
      message,
      priority: 1,
    });
    sent[yearKey] = new Date().toISOString();
  } catch {
    // ignore
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'SYNC_NOW':
      sendResponse({ success: true });
      break;
    case 'SCHEDULE_REMINDER': {
      const id: string | undefined = message.relationshipId;
      if (!id) {
        sendResponse({ success: false, error: 'Missing relationshipId' });
        break;
      }
      (async () => {
        try {
          const rel = await db.relationships.get(id);
          if (!rel) {
            sendResponse({ success: false, error: 'Not found' });
            return;
          }
          const base = rel.lastContactDate ? new Date(rel.lastContactDate) : new Date();
          const next = dateHelpers.addDays(base, rel.reminderFrequency || 7);
          await db.relationships.update(id, {
            nextReminderDate: next,
            localModified: true,
            updatedAt: new Date(),
          });
          sendResponse({ success: true, nextReminderDate: next.toISOString() });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    case 'UNLOCK':
      checkImportantDates();
      checkRelationshipReminders();
      sendResponse({ success: true });
      break;
    case 'LOCK':
      sendResponse({ success: true });
      break;
    case 'CHECK_DATES_NOW':
      checkImportantDates().then(() => sendResponse({ success: true }));
      return true;
    case 'CHECK_REMINDERS_NOW':
      checkRelationshipReminders().then(() => sendResponse({ success: true }));
      return true;
    case 'TEST_NOTIFICATION':
      try {
        chrome.notifications.create(`test_${Date.now()}`, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: '🔔 Burn Book test',
          message: 'Notifications are working.',
          priority: 1,
        });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
      break;
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  return true;
});

// ─── Notification click ───────────────────────────────────────────────────────

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fullpage.html') });
});

export {};
