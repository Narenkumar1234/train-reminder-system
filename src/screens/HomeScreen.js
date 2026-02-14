/**
 * HomeScreen — Two-tab dashboard
 *   Tab 1: "Booking Available"  — weekends where advance booking is open (≤60 days)
 *          → Set Booking Reminder
 *   Tab 2: "Tatkal Available"   — weekends where Tatkal opens (travel date − 1 = today or future)
 *          → Set Tatkal Reminder
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { COLORS, BOOKING_WINDOW_DAYS, TATKAL_ADVANCE_DAYS } from '../constants/theme';

const TABS = { BOOKING: 'booking', TATKAL: 'tatkal' };

export default function HomeScreen() {
  const {
    longWeekends,
    loading,
    refresh,
    addBookingReminder,
    addTatkalAlarm,
    stateName,
  } = useAppContext();

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(TABS.BOOKING);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Computed lists ────────────────────────────────────────────────

  const todayStr = new Date().toISOString().split('T')[0];

  const currentYear = new Date().getFullYear().toString();

  const bookingAvailable = useMemo(() => {
    // Booking NOT yet opened (bookingReminderDate is today or future), current year, travel upcoming
    return longWeekends.filter((w) => {
      return (
        w.startDate.startsWith(currentYear) &&
        w.startDate >= todayStr &&
        w.bookingReminderDate >= todayStr
      );
    });
  }, [longWeekends, todayStr, currentYear]);

  const tatkalAvailable = useMemo(() => {
    // Booking already opened (bookingReminderDate passed), travel still upcoming, current year
    return longWeekends.filter((w) => {
      return (
        w.startDate.startsWith(currentYear) &&
        w.startDate >= todayStr &&
        w.bookingReminderDate < todayStr
      );
    });
  }, [longWeekends, todayStr, currentYear]);

  const data = activeTab === TABS.BOOKING ? bookingAvailable : tatkalAvailable;

  // ─── Actions ───────────────────────────────────────────────────────

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleSetBookingReminder = async (item) => {
    try {
      const result = await addBookingReminder(item);
      if (result?.duplicate) {
        Alert.alert('Already Scheduled', `A booking reminder for ${item.holidayName} is already set.`);
      } else if (result?.notificationId) {
        Alert.alert(
          '✅ Reminder Set!',
          `You'll be notified on ${formatDate(item.bookingReminderDate)} when booking opens for ${item.holidayName}.`,
        );
      } else {
        Alert.alert('ℹ️ Past Date', 'The booking window for this holiday has already opened.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to set reminder: ' + err.message);
    }
  };

  const handleSetTatkalReminder = (item) => {
    Alert.alert('Set Tatkal Alarm', 'Choose class type:', [
      {
        text: 'AC (10:00 AM)',
        onPress: () => _scheduleTatkal(item, 'AC'),
      },
      {
        text: 'Non-AC (11:00 AM)',
        onPress: () => _scheduleTatkal(item, 'NON_AC'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const _scheduleTatkal = async (item, classType) => {
    try {
      const result = await addTatkalAlarm({
        travelDate: item.startDate,
        classType,
        label: `${item.holidayName} Tatkal`,
      });
      if (result?.duplicate) {
        Alert.alert('Already Scheduled', `A ${classType === 'AC' ? 'AC' : 'Non-AC'} Tatkal alarm for ${item.holidayName} is already set.`);
      } else if (result?.notificationId) {
        const tatkalDate = _addDays(item.startDate, -1);
        Alert.alert(
          '⏰ Tatkal Alarm Set!',
          `Alarm on ${formatDate(tatkalDate)} for ${classType === 'AC' ? 'AC (10:00 AM)' : 'Non-AC (11:00 AM)'}.`,
        );
      } else {
        Alert.alert('ℹ️ Past Date', 'Tatkal date has already passed for this weekend.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to set tatkal alarm: ' + err.message);
    }
  };

  // ─── Card renderer ─────────────────────────────────────────────────

  const renderItem = ({ item }) => {
    const isBookingTab = activeTab === TABS.BOOKING;
    const tatkalDate = _addDays(item.startDate, -TATKAL_ADVANCE_DAYS);

    return (
      <View style={[styles.card, getCardStyle(item.type)]}>
        {/* Badge */}
        <View style={[styles.badge, getBadgeStyle(item.type)]}>
          <Text style={styles.badgeText}>
            {item.totalDays} DAYS
            {item.bridgeLeaves > 0
              ? ` (${item.bridgeLeaves} leave${item.bridgeLeaves > 1 ? 's' : ''})`
              : ''}
          </Text>
        </View>

        {/* Holiday Name & Date */}
        <Text style={styles.holidayName}>{item.holidayName}</Text>
        <Text style={styles.holidayDate}>
          {item.dayName}, {formatDate(item.holidayDate)}
        </Text>

        {/* Trip Range */}
        <View style={styles.rangeRow}>
          <Text style={styles.rangeLabel}>🗓 Trip:</Text>
          <Text style={styles.rangeValue}>
            {formatDate(item.startDate)} → {formatDate(item.endDate)}
          </Text>
        </View>

        {/* Tip */}
        <Text style={styles.tip}>{item.tip}</Text>

        {/* Context row */}
        <View style={styles.bookingRow}>
          {isBookingTab ? (
            <Text style={styles.bookingLabel}>
              📅 Booking opens: {formatDate(item.bookingReminderDate)}
            </Text>
          ) : (
            <Text style={styles.bookingLabel}>
              ⏰ Tatkal opens: {formatDate(tatkalDate)}
            </Text>
          )}
        </View>

        {/* Action Button */}
        {isBookingTab ? (
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={() => handleSetBookingReminder(item)}
          >
            <Text style={styles.reminderButtonText}>🔔 Set Booking Reminder</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.reminderButton, { backgroundColor: COLORS.tatkalAC }]}
            onPress={() => handleSetTatkalReminder(item)}
          >
            <Text style={styles.reminderButtonText}>⏰ Set Tatkal Reminder</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── Loading state ─────────────────────────────────────────────────

  if (loading && longWeekends.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding long weekends...</Text>
      </View>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>🚂 Upcoming Long Weekends</Text>
        {stateName ? (
          <Text style={styles.headerSubtitle}>📍 {stateName}</Text>
        ) : (
          <Text style={styles.headerSubtitle}>📍 Set your state in Settings</Text>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.BOOKING && styles.tabActive]}
          onPress={() => setActiveTab(TABS.BOOKING)}
        >
          <Text
            style={[styles.tabText, activeTab === TABS.BOOKING && styles.tabTextActive]}
          >
            📅 Booking Available ({bookingAvailable.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.TATKAL && styles.tabActive]}
          onPress={() => setActiveTab(TABS.TATKAL)}
        >
          <Text
            style={[styles.tabText, activeTab === TABS.TATKAL && styles.tabTextActive]}
          >
            ⏰ Tatkal Available ({tatkalAvailable.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            {activeTab === TABS.BOOKING
              ? 'No weekends with open booking window'
              : 'No weekends with upcoming Tatkal'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === TABS.BOOKING
              ? `Booking opens ${BOOKING_WINDOW_DAYS} days before travel.`
              : 'Tatkal opens 1 day before travel.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => `${activeTab}-${item.holidayDate}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCardStyle(type) {
  switch (type) {
    case 'natural':
      return { borderLeftColor: COLORS.success };
    case 'bridge':
      return { borderLeftColor: COLORS.accent };
    case 'extended-bridge':
      return { borderLeftColor: COLORS.warning };
    default:
      return { borderLeftColor: COLORS.border };
  }
}

function getBadgeStyle(type) {
  switch (type) {
    case 'natural':
      return { backgroundColor: COLORS.successLight };
    case 'bridge':
      return { backgroundColor: COLORS.warningLight };
    case 'extended-bridge':
      return { backgroundColor: '#ffe0b2' };
    default:
      return { backgroundColor: COLORS.border };
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  // ── List / Card ──
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  holidayName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  holidayDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rangeValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  tip: {
    fontSize: 13,
    color: COLORS.success,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  bookingRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bookingLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  reminderButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
