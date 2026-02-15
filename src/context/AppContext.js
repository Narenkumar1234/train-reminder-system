/**
 * App Context — Global state management using React Context API
 *
 * Provides:
 *  - holidays: fetched/cached holiday list (API + custom, minus hidden)
 *  - longWeekends: computed long weekend opportunities
 *  - selectedState: user's Indian state ISO code
 *  - reminders: saved tatkal & booking reminders
 *  - loading: data loading state
 *  - Holiday editing (add / remove)
 *  - State change rate-limiting (2/month)
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchHolidaysMultiYear } from '../services/apiService';
import { detectState } from '../services/locationService';
import { getUpcomingLongWeekends, detectLongWeekends } from '../services/longWeekendService';
import {
  requestNotificationPermission,
  scheduleBookingReminder,
  scheduleTatkalAlarm,
  cancelNotification,
} from '../services/NotificationManager';
import {
  saveSelectedState,
  getSelectedState,
  getReminders,
  addReminder as storeReminder,
  deleteReminder as removeReminder,
  cacheHolidays,
  getCachedHolidays,
  canChangeState,
  recordStateChange,
  getCustomHolidays,
  addCustomHoliday as storeCustomHoliday,
  removeCustomHoliday as deleteCustomHoliday,
  getHiddenHolidays,
  hideHoliday as storeHideHoliday,
  unhideHoliday as storeUnhideHoliday,
} from '../services/storageService';
import { INDIAN_STATES } from '../constants/states';
import { BOOKING_WINDOW_DAYS } from '../constants/theme';
import { saveUserHolidays, saveUserState, saveUserCustomHolidays } from '../services/firestoreService';
import { logReminderSet, logStateChange, setUserProperty } from '../services/analyticsService';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [holidays, setHolidays] = useState([]);
  const [longWeekends, setLongWeekends] = useState([]);
  const [allLongWeekends, setAllLongWeekends] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [stateName, setStateName] = useState('');
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stateChangeInfo, setStateChangeInfo] = useState({ allowed: true, remaining: 2, changesThisMonth: 0 });

  // ─── Initialize ──────────────────────────────────────────────────────

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      setLoading(true);

      // Request notification permission
      await requestNotificationPermission();

      // Check state change quota
      const changeInfo = await canChangeState();
      setStateChangeInfo(changeInfo);

      // Check for saved state
      let stateIso = await getSelectedState();

      if (!stateIso) {
        // Try GPS (first launch — doesn't count as a "change")
        const detected = await detectState();
        if (detected?.stateIso) {
          stateIso = detected.stateIso;
          setStateName(detected.stateName);
          await saveSelectedState(stateIso);
        }
      }

      if (stateIso) {
        setSelectedState(stateIso);
        const stateObj = INDIAN_STATES.find((s) => s.value === stateIso);
        if (stateObj) setStateName(stateObj.label);
        // Track state in analytics
        setUserProperty('user_state', stateIso);
      }

      // Load holidays from persistent cache (API only called on state change)
      let apiHolidays = await getCachedHolidays();
      if (!apiHolidays) {
        // First time ever — fetch from API
        apiHolidays = await fetchHolidaysMultiYear(stateIso);
        await cacheHolidays(apiHolidays);
      }

      // Merge with custom holidays and filter out hidden ones
      const mergedHolidays = await _mergeHolidays(apiHolidays);
      setHolidays(mergedHolidays);

      // Compute long weekends
      _recomputeWeekends(mergedHolidays);

      // Load saved reminders
      const savedReminders = await getReminders();
      setReminders(savedReminders);
    } catch (err) {
      console.error('[AppContext] Init error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Merge Holidays Helper ──────────────────────────────────────────

  async function _mergeHolidays(apiHolidays) {
    const customHolidays = await getCustomHolidays();
    const hiddenDates = await getHiddenHolidays();

    // Filter out hidden holidays from API list
    const visible = apiHolidays.filter(
      (h) => !hiddenDates.includes(h.date.iso.split('T')[0])
    );

    // Add custom holidays
    return [...visible, ...customHolidays];
  }

  function _recomputeWeekends(holidayList) {
    const upcoming = getUpcomingLongWeekends(holidayList);
    setLongWeekends(upcoming);
    const all = detectLongWeekends(holidayList);
    setAllLongWeekends(all);
  }

  // ─── Change State (rate-limited, calls API) ─────────────────────────

  const changeState = useCallback(async (stateIso) => {
    setLoading(true);
    setSelectedState(stateIso);
    await saveSelectedState(stateIso);
    await recordStateChange();

    const stateObj = INDIAN_STATES.find((s) => s.value === stateIso);
    if (stateObj) setStateName(stateObj.label);

    // This is the ONLY place we call the API (state change)
    const apiHolidays = await fetchHolidaysMultiYear(stateIso);
    await cacheHolidays(apiHolidays);

    const mergedHolidays = await _mergeHolidays(apiHolidays);
    setHolidays(mergedHolidays);
    _recomputeWeekends(mergedHolidays);

    // Sync to Firestore
    try {
      const stateObj = INDIAN_STATES.find((s) => s.value === stateIso);
      await saveUserState(stateIso, stateObj?.label || '');
      await saveUserHolidays(stateIso, mergedHolidays);
      logStateChange(stateIso);
      setUserProperty('user_state', stateIso);
    } catch (err) {
      console.warn('[AppContext] Firestore sync error:', err);
    }

    // Update quota
    const changeInfo = await canChangeState();
    setStateChangeInfo(changeInfo);

    setLoading(false);
  }, []);

  /**
   * Check if state change is allowed before calling changeState
   * @returns {{ allowed, remaining, changesThisMonth }}
   */
  const checkStateChangeAllowed = useCallback(async () => {
    const info = await canChangeState();
    setStateChangeInfo(info);
    return info;
  }, []);

  // ─── Holiday Editing ────────────────────────────────────────────────

  const addHoliday = useCallback(async ({ name, dateIso, description }) => {
    const holiday = {
      name,
      date: { iso: dateIso },
      type: ['Custom Holiday'],
      description: description || 'User-added holiday',
      primary_type: 'Custom Holiday',
      isCustom: true,
    };
    await storeCustomHoliday(holiday);

    // Refresh merged list
    const apiHolidays = await getCachedHolidays();
    const mergedHolidays = await _mergeHolidays(apiHolidays || []);
    setHolidays(mergedHolidays);
    _recomputeWeekends(mergedHolidays);

    // Sync custom holidays to Firestore
    try {
      const customHolidays = await getCustomHolidays();
      await saveUserCustomHolidays(customHolidays);
    } catch (err) {
      console.warn('[AppContext] Firestore sync error:', err);
    }

    return holiday;
  }, []);

  const removeHoliday = useCallback(async (dateIso, isCustom) => {
    if (isCustom) {
      await deleteCustomHoliday(dateIso);
    } else {
      await storeHideHoliday(dateIso);
    }

    // Refresh merged list
    const apiHolidays = await getCachedHolidays();
    const mergedHolidays = await _mergeHolidays(apiHolidays || []);
    setHolidays(mergedHolidays);
    _recomputeWeekends(mergedHolidays);
  }, []);

  const restoreHoliday = useCallback(async (dateIso) => {
    await storeUnhideHoliday(dateIso);

    const apiHolidays = await getCachedHolidays();
    const mergedHolidays = await _mergeHolidays(apiHolidays || []);
    setHolidays(mergedHolidays);
    _recomputeWeekends(mergedHolidays);
  }, []);

  // ─── Add Booking Reminder ───────────────────────────────────────────

  const addBookingReminder = useCallback(async (opportunity) => {
    // Duplicate check — same type + travel date
    const duplicate = reminders.find(
      (r) => r.type === 'booking' && r.travelDate === opportunity.startDate,
    );
    if (duplicate) {
      return { duplicate: true, existing: duplicate };
    }

    const notifId = await scheduleBookingReminder({
      holidayName: opportunity.holidayName,
      travelDate: opportunity.startDate,
      reminderDate: opportunity.bookingReminderDate,
    });

    const reminder = {
      id: `booking-${Date.now()}`,
      notificationId: notifId,
      type: 'booking',
      label: `${opportunity.holidayName} Long Weekend`,
      travelDate: opportunity.startDate,
      reminderDate: opportunity.bookingReminderDate,
      createdAt: new Date().toISOString(),
    };

    await storeReminder(reminder);
    setReminders((prev) => [...prev, reminder]);
    logReminderSet('booking', { holidayName: opportunity.holidayName, travelDate: opportunity.startDate });
    return reminder;
  }, [reminders]);

  // ─── Add Tatkal Alarm ──────────────────────────────────────────────

  const addTatkalAlarm = useCallback(async ({ travelDate, classType, label }) => {
    // Duplicate check — same type + travel date + class
    const duplicate = reminders.find(
      (r) => r.type === 'tatkal' && r.travelDate === travelDate && r.classType === classType,
    );
    if (duplicate) {
      return { duplicate: true, existing: duplicate };
    }

    const notifId = await scheduleTatkalAlarm({ travelDate, classType, label });

    const tatkalDate = _addDays(travelDate, -1);
    const reminder = {
      id: `tatkal-${Date.now()}`,
      notificationId: notifId,
      type: 'tatkal',
      label: label || `Tatkal for ${travelDate}`,
      travelDate,
      tatkalDate,
      classType,
      createdAt: new Date().toISOString(),
    };

    await storeReminder(reminder);
    setReminders((prev) => [...prev, reminder]);
    logReminderSet('tatkal', { holidayName: label, travelDate });
    return reminder;
  }, [reminders]);

  // ─── Delete Reminder ───────────────────────────────────────────────

  const deleteReminderById = useCallback(async (id) => {
    const reminder = reminders.find((r) => r.id === id);
    if (reminder?.notificationId) {
      await cancelNotification(reminder.notificationId);
    }
    await removeReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, [reminders]);

  // ─── Refresh (local recompute, NO API call) ───────────────────────

  const refresh = useCallback(async () => {
    setLoading(true);
    const apiHolidays = await getCachedHolidays();
    if (apiHolidays) {
      const mergedHolidays = await _mergeHolidays(apiHolidays);
      setHolidays(mergedHolidays);
      _recomputeWeekends(mergedHolidays);
    }
    setLoading(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        holidays,
        longWeekends,
        allLongWeekends,
        selectedState,
        stateName,
        reminders,
        loading,
        error,
        stateChangeInfo,
        changeState,
        checkStateChangeAllowed,
        addBookingReminder,
        addTatkalAlarm,
        deleteReminderById,
        addHoliday,
        removeHoliday,
        restoreHoliday,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

function _addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
