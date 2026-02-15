/**
 * Analytics Service — Tracks user events and screen views via Firebase Analytics
 */
import analytics from '@react-native-firebase/analytics';

/**
 * Log app open event
 */
export async function logAppOpen() {
  try {
    await analytics().logAppOpen();
  } catch (err) {
    console.warn('[Analytics] logAppOpen error:', err);
  }
}

/**
 * Log screen view
 * @param {string} screenName
 */
export async function logScreenView(screenName) {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (err) {
    console.warn('[Analytics] logScreenView error:', err);
  }
}

/**
 * Log user login
 * @param {string} method - 'email' | 'google'
 */
export async function logLogin(method) {
  try {
    await analytics().logLogin({ method });
  } catch (err) {
    console.warn('[Analytics] logLogin error:', err);
  }
}

/**
 * Log user sign up
 * @param {string} method - 'email' | 'google'
 */
export async function logSignUp(method) {
  try {
    await analytics().logSignUp({ method });
  } catch (err) {
    console.warn('[Analytics] logSignUp error:', err);
  }
}

/**
 * Log a reminder being set
 * @param {string} type - 'booking' | 'tatkal'
 * @param {object} params - { holidayName, travelDate, ... }
 */
export async function logReminderSet(type, params = {}) {
  try {
    await analytics().logEvent('reminder_set', {
      reminder_type: type,
      holiday_name: params.holidayName || '',
      travel_date: params.travelDate || '',
    });
  } catch (err) {
    console.warn('[Analytics] logReminderSet error:', err);
  }
}

/**
 * Log state change
 * @param {string} stateIso
 */
export async function logStateChange(stateIso) {
  try {
    await analytics().logEvent('state_changed', {
      state: stateIso,
    });
  } catch (err) {
    console.warn('[Analytics] logStateChange error:', err);
  }
}

/**
 * Set user ID for analytics (after login)
 * @param {string} userId
 */
export async function setAnalyticsUserId(userId) {
  try {
    await analytics().setUserId(userId);
  } catch (err) {
    console.warn('[Analytics] setUserId error:', err);
  }
}

/**
 * Set user properties (e.g., state, app version)
 * @param {string} name
 * @param {string} value
 */
export async function setUserProperty(name, value) {
  try {
    await analytics().setUserProperty(name, value);
  } catch (err) {
    console.warn('[Analytics] setUserProperty error:', err);
  }
}
