/**
 * Notification Manager
 *
 * Handles:
 *   1. Permission requests for local notifications
 *   2. Scheduling silent booking-window reminders (120 days before travel)
 *   3. Scheduling critical Tatkal alarms (high-priority, sound even in DND)
 *   4. Listing / cancelling scheduled notifications
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { TATKAL_TIMES } from '../constants/theme';

// ─── Configuration ───────────────────────────────────────────────────────────

// Set default notification behavior (show alert + sound even in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// ─── Permission ──────────────────────────────────────────────────────────────

/**
 * Request notification permissions. Creates an Android notification channel
 * for Tatkal alarms with high importance.
 * @returns {boolean} whether permission was granted
 */
export async function requestNotificationPermission() {
  if (!Device.isDevice) {
    console.warn('[NotificationManager] Must use a physical device for notifications');
    // In Expo Go / simulator we can still schedule, but they may not fire as alarms
  }

  if (Platform.OS === 'android') {
    // High-priority channel for Tatkal alarms
    await Notifications.setNotificationChannelAsync('tatkal-alarm', {
      name: 'Tatkal Booking Alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      enableVibrate: true,
    });

    // Normal channel for booking reminders
    await Notifications.setNotificationChannelAsync('booking-reminder', {
      name: 'Booking Window Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
        allowCriticalAlerts: true, // iOS critical alerts bypass DND
      },
    });
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// ─── Schedule: Booking Window Reminder ───────────────────────────────────────

/**
 * Schedule a silent notification 120 days before a holiday travel date
 * @param {object} params
 * @param {string} params.holidayName - e.g. "Republic Day"
 * @param {string} params.travelDate  - ISO string e.g. "2025-10-02"
 * @param {string} params.reminderDate - ISO string (120 days before travelDate)
 * @returns {string} notification identifier
 */
export async function scheduleBookingReminder({ holidayName, travelDate, reminderDate }) {
  const trigger = new Date(reminderDate + 'T09:00:00');

  // Don't schedule if the date is in the past
  if (trigger <= new Date()) {
    console.log('[NotificationManager] Reminder date is in the past, skipping:', reminderDate);
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚂 Booking Window Opens!',
      body: `Train tickets for ${holidayName} (${travelDate}) can be booked now! Book early for the long weekend.`,
      data: { type: 'booking-reminder', holidayName, travelDate },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'booking-reminder' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });

  console.log(`[NotificationManager] Scheduled booking reminder: ${id} for ${reminderDate}`);
  return id;
}

// ─── Schedule: Tatkal Alarm ──────────────────────────────────────────────────

/**
 * Schedule a high-priority Tatkal alarm
 * @param {object} params
 * @param {string} params.travelDate - ISO string e.g. "2025-10-02"
 * @param {'AC'|'NON_AC'} params.classType - AC or NON_AC
 * @param {string} [params.label] - Optional user label
 * @returns {string} notification identifier
 */
export async function scheduleTatkalAlarm({ travelDate, classType, label = '' }) {
  const config = TATKAL_TIMES[classType];
  // Tatkal opens 1 day before travel
  const tatkalDate = _addDays(travelDate, -1);
  const trigger = new Date(`${tatkalDate}T00:00:00`);
  trigger.setHours(config.alarmHour, config.alarmMinute, 0, 0);

  if (trigger <= new Date()) {
    console.log('[NotificationManager] Tatkal alarm date is in the past, skipping');
    return null;
  }

  const classLabel = classType === 'AC' ? 'AC (10:00 AM)' : 'Non-AC (11:00 AM)';
  const displayLabel = label ? ` — ${label}` : '';

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 TATKAL ALERT — ${classLabel}`,
      body: `Tatkal booking for ${travelDate} opens in 5 minutes!${displayLabel} Open IRCTC NOW!`,
      data: { type: 'tatkal-alarm', travelDate, classType, label },
      sound: 'default',
      priority: 'max',
      ...(Platform.OS === 'android' && { channelId: 'tatkal-alarm' }),
      // iOS critical alert
      ...(Platform.OS === 'ios' && {
        interruptionLevel: 'critical',
        sound: { critical: true, name: 'default', volume: 1.0 },
      }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });

  console.log(`[NotificationManager] Scheduled Tatkal alarm: ${id} for ${tatkalDate} at ${config.alarmHour}:${config.alarmMinute}`);
  return id;
}

// ─── Manage Scheduled Notifications ──────────────────────────────────────────

/**
 * Get all currently scheduled notifications
 */
export async function getAllScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Cancel a specific notification by ID
 */
export async function cancelNotification(notificationId) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Listeners ───────────────────────────────────────────────────────────────

/**
 * Register listener for when a notification is received while app is in foreground
 */
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Register listener for when user taps on a notification
 */
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
