// Background service worker for Burn Book extension
// Handles alarms, notifications, and background sync

console.log('Burn Book background service worker started');

// Initialize on installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  // Set up periodic sync alarm (every 15 minutes)
  chrome.alarms.create('backgroundSync', { periodInMinutes: 15 });
});

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm fired:', alarm.name);

  if (alarm.name === 'backgroundSync') {
    // TODO: Implement background sync logic in Phase 2
    console.log('Background sync triggered');
  } else if (alarm.name.startsWith('reminder_')) {
    // TODO: Handle relationship reminders
    const relationshipId = alarm.name.replace('reminder_', '');
    console.log('Reminder for relationship:', relationshipId);
  } else if (alarm.name.startsWith('date_')) {
    // TODO: Handle important date reminders
    const dateId = alarm.name.replace('date_', '');
    console.log('Important date reminder:', dateId);
  }
});

// Handle messages from popup/fullpage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  switch (message.type) {
    case 'SYNC_NOW':
      // TODO: Trigger immediate sync
      sendResponse({ success: true });
      break;

    case 'SCHEDULE_REMINDER':
      // TODO: Schedule a relationship reminder
      sendResponse({ success: true });
      break;

    case 'UNLOCK':
      // User has unlocked the extension
      console.log('Extension unlocked');
      sendResponse({ success: true });
      break;

    case 'LOCK':
      // User has locked the extension
      console.log('Extension locked');
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Keep channel open for async response
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);

  // Open fullpage view
  chrome.tabs.create({
    url: chrome.runtime.getURL('fullpage.html')
  });
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log('Notification button clicked:', notificationId, buttonIndex);

  // TODO: Handle notification actions
  // Button 0: "Mark as Contacted" or similar
  // Button 1: "Remind Me Tomorrow" or similar
});

export {};
