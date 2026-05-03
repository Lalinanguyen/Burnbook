import { db } from '../shared/storage/LocalDB';
import { Relationship } from '../shared/types';

console.log('Burn Book background service worker started');

const DAILY_CHECK_ALARM = 'check-important-dates';

// ─── Install / startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('backgroundSync', { periodInMinutes: 15 });
  scheduleDailyCheck();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleDailyCheck();
});

function scheduleDailyCheck() {
  // Fire once per day; start at next midnight
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
  } else if (alarm.name.startsWith('reminder_')) {
    const relationshipId = alarm.name.replace('reminder_', '');
    await fireRelationshipReminder(relationshipId);
  }
});

// ─── Important date checker ───────────────────────────────────────────────────

async function checkImportantDates() {
  let relationships: Relationship[];
  try {
    relationships = await db.relationships.toArray();
  } catch {
    return;
  }

  const today = new Date();
  const sentKey = 'sentNotifications';
  const stored = await chrome.storage.local.get(sentKey);
  const sent: Record<string, string> = stored[sentKey] || {};

  for (const rel of relationships) {
    if (rel.archived) continue;
    const dates = rel.importantDates || [];

    // Birthday check
    if ((rel as any).birthday) {
      const bday = new Date((rel as any).birthday as string);
      const mmdd = `${String(bday.getMonth() + 1).padStart(2, '0')}-${String(bday.getDate()).padStart(2, '0')}`;
      await maybeFire(
        `bday_${rel.id}`,
        `🎂 ${rel.personName}'s Birthday`,
        `${rel.personName}'s birthday is coming up!`,
        mmdd,
        7,
        today,
        sent
      );
    }

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

  await chrome.storage.local.set({ [sentKey]: sent });
}

async function maybeFire(
  key: string,
  title: string,
  message: string,
  mmdd: string,         // "MM-DD"
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

  // Don't fire the same notification twice in the same year
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
    // notifications may be unavailable in some contexts
  }
}

async function fireRelationshipReminder(relationshipId: string) {
  try {
    const rel = await db.relationships.get(relationshipId);
    if (!rel || rel.archived) return;
    chrome.notifications.create(`reminder_${relationshipId}_${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: `👋 Check in with ${rel.personName}`,
      message: `It's been a while. How are things with ${rel.personName}?`,
      priority: 1,
    });
  } catch {
    // db may not be available yet
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'SYNC_NOW':
      sendResponse({ success: true });
      break;
    case 'SCHEDULE_REMINDER':
      sendResponse({ success: true });
      break;
    case 'UNLOCK':
      // Run date check immediately after unlock so user sees alerts right away
      checkImportantDates();
      sendResponse({ success: true });
      break;
    case 'LOCK':
      sendResponse({ success: true });
      break;
    case 'CHECK_DATES_NOW':
      checkImportantDates().then(() => sendResponse({ success: true }));
      return true;
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
