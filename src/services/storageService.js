/**
 * Simple persistence layer using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  STATE: '@tbr_state',
  REMINDERS: '@tbr_reminders',
  HOLIDAYS: '@tbr_holidays_cache',
  ONBOARDED: '@tbr_onboarded',
  STATE_CHANGE_LOG: '@tbr_state_change_log',
  CUSTOM_HOLIDAYS: '@tbr_custom_holidays',
};

const MAX_STATE_CHANGES_PER_MONTH = 2;

// ─── State (selected Indian state) ──────────────────────────────────────────

export async function saveSelectedState(stateIso) {
  await AsyncStorage.setItem(KEYS.STATE, stateIso);
}

export async function getSelectedState() {
  return AsyncStorage.getItem(KEYS.STATE);
}

// ─── Reminders ───────────────────────────────────────────────────────────────

/**
 * Get all saved reminders
 * @returns {Array} Array of reminder objects
 */
export async function getReminders() {
  const data = await AsyncStorage.getItem(KEYS.REMINDERS);
  return data ? JSON.parse(data) : [];
}

/**
 * Save a new reminder
 * @param {object} reminder - { id, notificationId, type, label, date, classType?, ... }
 */
export async function addReminder(reminder) {
  const reminders = await getReminders();
  reminders.push(reminder);
  await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders));
}

/**
 * Delete a reminder by its id
 */
export async function deleteReminder(id) {
  const reminders = await getReminders();
  const filtered = reminders.filter((r) => r.id !== id);
  await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify(filtered));
}

/**
 * Clear all reminders
 */
export async function clearAllReminders() {
  await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify([]));
}

// ─── Holiday Cache (persistent — never expires, only refreshed on state change) ─

export async function cacheHolidays(holidays) {
  await AsyncStorage.setItem(
    KEYS.HOLIDAYS,
    JSON.stringify({ holidays, timestamp: Date.now() })
  );
}

export async function getCachedHolidays() {
  const data = await AsyncStorage.getItem(KEYS.HOLIDAYS);
  if (!data) return null;
  const parsed = JSON.parse(data);
  // Persistent cache — no expiry. Only refreshed when user changes state.
  return parsed.holidays;
}

// ─── State Change Rate Limiting ──────────────────────────────────────────────

/**
 * Record a state change event
 */
export async function recordStateChange() {
  const log = await getStateChangeLog();
  log.push(Date.now());
  await AsyncStorage.setItem(KEYS.STATE_CHANGE_LOG, JSON.stringify(log));
}

/**
 * Get state change timestamps for the current month
 */
export async function getStateChangeLog() {
  const data = await AsyncStorage.getItem(KEYS.STATE_CHANGE_LOG);
  if (!data) return [];
  const log = JSON.parse(data);
  // Filter to current month only
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return log.filter((ts) => ts >= monthStart);
}

/**
 * Check if user can change state (max 2 per month)
 * @returns {{ allowed: boolean, remaining: number, changesThisMonth: number }}
 */
export async function canChangeState() {
  const log = await getStateChangeLog();
  const changesThisMonth = log.length;
  return {
    allowed: changesThisMonth < MAX_STATE_CHANGES_PER_MONTH,
    remaining: Math.max(0, MAX_STATE_CHANGES_PER_MONTH - changesThisMonth),
    changesThisMonth,
  };
}

// ─── Custom Holidays (user-edited) ──────────────────────────────────────────

/**
 * Get user-added custom holidays
 */
export async function getCustomHolidays() {
  const data = await AsyncStorage.getItem(KEYS.CUSTOM_HOLIDAYS);
  return data ? JSON.parse(data) : [];
}

/**
 * Save a custom holiday
 */
export async function addCustomHoliday(holiday) {
  const holidays = await getCustomHolidays();
  holidays.push(holiday);
  await AsyncStorage.setItem(KEYS.CUSTOM_HOLIDAYS, JSON.stringify(holidays));
}

/**
 * Remove a custom holiday by date
 */
export async function removeCustomHoliday(dateIso) {
  const holidays = await getCustomHolidays();
  const filtered = holidays.filter((h) => h.date.iso !== dateIso);
  await AsyncStorage.setItem(KEYS.CUSTOM_HOLIDAYS, JSON.stringify(filtered));
}

/**
 * Remove an API-fetched holiday by date (store as "removed" so it stays removed)
 */
export async function getHiddenHolidays() {
  const data = await AsyncStorage.getItem('@tbr_hidden_holidays');
  return data ? JSON.parse(data) : [];
}

export async function hideHoliday(dateIso) {
  const hidden = await getHiddenHolidays();
  if (!hidden.includes(dateIso)) {
    hidden.push(dateIso);
    await AsyncStorage.setItem('@tbr_hidden_holidays', JSON.stringify(hidden));
  }
}

export async function unhideHoliday(dateIso) {
  const hidden = await getHiddenHolidays();
  const filtered = hidden.filter((d) => d !== dateIso);
  await AsyncStorage.setItem('@tbr_hidden_holidays', JSON.stringify(filtered));
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export async function setOnboarded() {
  await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
}

export async function isOnboarded() {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return val === 'true';
}
