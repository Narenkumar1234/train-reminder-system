/**
 * SettingsScreen — Manual state selection and app info
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { INDIAN_STATES } from '../constants/states';
import { COLORS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cancelAllNotifications } from '../services/NotificationManager';
import { clearAllReminders } from '../services/storageService';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    selectedState,
    stateName,
    changeState,
    checkStateChangeAllowed,
    stateChangeInfo,
    reminders,
  } = useAppContext();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStates = INDIAN_STATES.filter((s) =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStateSelect = async (stateIso) => {
    setPickerVisible(false);
    setSearchQuery('');

    // Rate-limit check
    const info = await checkStateChangeAllowed();
    if (!info.allowed) {
      Alert.alert(
        '⚠️ Limit Reached',
        `You've used your 2 state changes this month (API has a 1,000 request limit). Try again next month.`,
      );
      return;
    }

    // Confirm with remaining count
    Alert.alert(
      'Change State?',
      `You can only change your state 2 times per month. You have ${info.remaining} change${info.remaining > 1 ? 's' : ''} remaining.\n\nProceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            await changeState(stateIso);
            Alert.alert('✅ State Updated', 'Holidays have been refreshed for your new state.');
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Reminders',
      'This will cancel all notifications and delete all saved reminders. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            await clearAllReminders();
            Alert.alert('Done', 'All reminders cleared. Restart the app to refresh.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
      </View>

      {/* State Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your State</Text>
        <Text style={styles.sectionDescription}>
          Holidays vary by state. Select your state to see relevant holidays and long weekends.
        </Text>

        <TouchableOpacity
          style={styles.stateSelector}
          onPress={() => setPickerVisible(true)}
        >
          <View>
            <Text style={styles.stateSelectorLabel}>
              {stateName || 'Select your state'}
            </Text>
            {selectedState && (
              <Text style={styles.stateSelectorCode}>{selectedState.toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.stateSelectorArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App</Text>
          <Text style={styles.infoValue}>Train Booking Reminder</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Active Reminders</Text>
          <Text style={styles.infoValue}>{reminders.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Booking Window</Text>
          <Text style={styles.infoValue}>60 days advance</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>State Changes Left</Text>
          <Text style={[styles.infoValue, stateChangeInfo.remaining === 0 && { color: COLORS.error }]}>
            {stateChangeInfo.remaining} / 2 this month
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tatkal AC</Text>
          <Text style={styles.infoValue}>Opens 10:00 AM (D-1)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tatkal Non-AC</Text>
          <Text style={styles.infoValue}>Opens 11:00 AM (D-1)</Text>
        </View>
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.howItWorksItem}>
          <Text style={styles.howItWorksIcon}>1️⃣</Text>
          <Text style={styles.howItWorksText}>
            We fetch holidays for your state and detect long-weekend opportunities.
          </Text>
        </View>
        <View style={styles.howItWorksItem}>
          <Text style={styles.howItWorksIcon}>2️⃣</Text>
          <Text style={styles.howItWorksText}>
            Set a <Text style={{ fontWeight: '700' }}>Booking Reminder</Text> — we'll notify you when the 60-day booking window opens.
          </Text>
        </View>
        <View style={styles.howItWorksItem}>
          <Text style={styles.howItWorksIcon}>3️⃣</Text>
          <Text style={styles.howItWorksText}>
            Set a <Text style={{ fontWeight: '700' }}>Tatkal Alarm</Text> — a high-priority alert 5 minutes before Tatkal opens.
          </Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearAll}>
          <Text style={styles.dangerButtonText}>🗑 Clear All Reminders & Notifications</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* State Picker Modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your State</Text>
              <TouchableOpacity onPress={() => { setPickerVisible(false); setSearchQuery(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search state..."
              placeholderTextColor={COLORS.disabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stateItem,
                    item.value === selectedState && styles.stateItemSelected,
                  ]}
                  onPress={() => handleStateSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.stateItemText,
                      item.value === selectedState && styles.stateItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={styles.stateItemCode}>{item.value.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

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
  section: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  stateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    backgroundColor: COLORS.background,
  },
  stateSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stateSelectorCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stateSelectorArrow: {
    fontSize: 16,
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  howItWorksIcon: {
    fontSize: 18,
  },
  howItWorksText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  dangerButton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
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
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    marginBottom: 12,
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderRadius: 8,
  },
  stateItemSelected: {
    backgroundColor: '#e8eaf6',
  },
  stateItemText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  stateItemTextSelected: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  stateItemCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
