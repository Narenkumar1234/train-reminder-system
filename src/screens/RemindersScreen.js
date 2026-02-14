/**
 * RemindersScreen — Active Tatkal & Booking Alarms
 *
 * Shows all saved reminders with ability to delete them.
 * Also provides a form to create a new Tatkal alarm.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { COLORS, TATKAL_TIMES } from '../constants/theme';

export default function RemindersScreen() {
  const { reminders, addTatkalAlarm, deleteReminderById } = useAppContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [travelDate, setTravelDate] = useState('');
  const [classType, setClassType] = useState('AC');
  const [label, setLabel] = useState('');

  const handleDelete = (reminder) => {
    Alert.alert(
      'Delete Reminder',
      `Remove "${reminder.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteReminderById(reminder.id),
        },
      ]
    );
  };

  const handleCreateTatkal = async () => {
    // Validate date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(travelDate)) {
      Alert.alert('Invalid Date', 'Please enter the date in YYYY-MM-DD format (e.g. 2026-03-15)');
      return;
    }

    const travelDateObj = new Date(travelDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (travelDateObj <= today) {
      Alert.alert('Invalid Date', 'Travel date must be in the future.');
      return;
    }

    try {
      const reminder = await addTatkalAlarm({
        travelDate,
        classType,
        label: label || `Train to book on ${travelDate}`,
      });

      if (reminder?.notificationId) {
        const config = TATKAL_TIMES[classType];
        Alert.alert(
          '🚨 Tatkal Alarm Set!',
          `Alarm set for ${formatDate(_addDays(travelDate, -1))} at ${config.alarmHour}:${String(config.alarmMinute).padStart(2, '0')} (5 min before ${classType === 'AC' ? 'AC' : 'Non-AC'} Tatkal opens)`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('ℹ️ Past Date', 'The Tatkal date has already passed.');
      }

      setModalVisible(false);
      setTravelDate('');
      setLabel('');
    } catch (err) {
      Alert.alert('Error', 'Failed to set alarm: ' + err.message);
    }
  };

  const renderReminder = ({ item }) => {
    const isTatkal = item.type === 'tatkal';

    return (
      <View style={[styles.card, isTatkal ? styles.tatkalCard : styles.bookingCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardType}>
            {isTatkal ? '🚨 TATKAL ALARM' : '🔔 BOOKING REMINDER'}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardLabel}>{item.label}</Text>
        <Text style={styles.cardDate}>
          🗓 Travel: {formatDate(item.travelDate)}
        </Text>

        {isTatkal && (
          <>
            <Text style={styles.cardDate}>
              ⏰ Alarm: {formatDate(item.tatkalDate)} at{' '}
              {item.classType === 'AC' ? '9:55 AM' : '10:55 AM'}
            </Text>
            <View style={[styles.classBadge, item.classType === 'AC' ? styles.acBadge : styles.nonAcBadge]}>
              <Text style={styles.classBadgeText}>
                {item.classType === 'AC' ? 'AC Class (10:00 AM)' : 'Non-AC Class (11:00 AM)'}
              </Text>
            </View>
          </>
        )}

        {!isTatkal && item.reminderDate && (
          <Text style={styles.cardDate}>
            📅 Reminder: {formatDate(item.reminderDate)}
          </Text>
        )}
      </View>
    );
  };

  // Separate and sort
  const tatkalReminders = reminders
    .filter((r) => r.type === 'tatkal')
    .sort((a, b) => (a.travelDate || '').localeCompare(b.travelDate || ''));
  const bookingReminders = reminders
    .filter((r) => r.type === 'booking')
    .sort((a, b) => (a.travelDate || '').localeCompare(b.travelDate || ''));
  const sortedReminders = [...tatkalReminders, ...bookingReminders];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⏰ My Reminders</Text>
        <Text style={styles.headerSubtitle}>
          {reminders.length} active reminder{reminders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Tatkal FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+ Tatkal Alarm</Text>
      </TouchableOpacity>

      {reminders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔕</Text>
          <Text style={styles.emptyTitle}>No reminders yet</Text>
          <Text style={styles.emptySubtitle}>
            Set booking reminders from the Home tab, or create a Tatkal alarm with the button above.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedReminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Tatkal Alarm Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🚨 Set Tatkal Alarm</Text>
            <Text style={styles.modalDescription}>
              Get alerted 5 minutes before Tatkal booking opens (1 day before your travel date).
            </Text>

            {/* Travel Date */}
            <Text style={styles.inputLabel}>Travel Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g. 2026-03-15)"
              placeholderTextColor={COLORS.disabled}
              value={travelDate}
              onChangeText={setTravelDate}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />

            {/* Class Type */}
            <Text style={styles.inputLabel}>Ticket Class</Text>
            <View style={styles.classRow}>
              <TouchableOpacity
                style={[styles.classOption, classType === 'AC' && styles.classOptionSelected]}
                onPress={() => setClassType('AC')}
              >
                <Text style={[styles.classOptionText, classType === 'AC' && styles.classOptionTextSelected]}>
                  AC{'\n'}
                  <Text style={styles.classOptionSub}>Opens 10:00 AM{'\n'}Alarm at 9:55 AM</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.classOption, classType === 'NON_AC' && styles.classOptionSelectedBlue]}
                onPress={() => setClassType('NON_AC')}
              >
                <Text style={[styles.classOptionText, classType === 'NON_AC' && styles.classOptionTextSelected]}>
                  Non-AC{'\n'}
                  <Text style={styles.classOptionSub}>Opens 11:00 AM{'\n'}Alarm at 10:55 AM</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Label */}
            <Text style={styles.inputLabel}>Label (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chennai → Delhi"
              placeholderTextColor={COLORS.disabled}
              value={label}
              onChangeText={setLabel}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleCreateTatkal}
              >
                <Text style={styles.confirmButtonText}>🔔 Set Alarm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function _addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 16,
    paddingBottom: 16,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 5,
  },
  tatkalCard: {
    borderLeftColor: COLORS.tatkalAC,
  },
  bookingCard: {
    borderLeftColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    fontSize: 18,
    color: COLORS.error,
    padding: 4,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  cardDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  classBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  acBadge: {
    backgroundColor: '#ffebee',
  },
  nonAcBadge: {
    backgroundColor: '#e3f2fd',
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: COLORS.tatkalAC,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 100,
  },
  fabText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  classRow: {
    flexDirection: 'row',
    gap: 12,
  },
  classOption: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  classOptionSelected: {
    borderColor: COLORS.tatkalAC,
    backgroundColor: '#ffebee',
  },
  classOptionSelectedBlue: {
    borderColor: COLORS.tatkalNonAC,
    backgroundColor: '#e3f2fd',
  },
  classOptionText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  classOptionTextSelected: {
    color: COLORS.textPrimary,
  },
  classOptionSub: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.tatkalAC,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
});
