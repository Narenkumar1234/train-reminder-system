/**
 * CalendarScreen — Calendar view with holidays and long weekends highlighted.
 *
 * Now supports:
 *  - Add custom holiday (name + date)
 *  - Remove / hide existing holidays
 *  - Changes automatically recompute long weekends
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAppContext } from '../context/AppContext';
import { COLORS } from '../constants/theme';

export default function CalendarScreen() {
  const {
    holidays,
    allLongWeekends,
    stateName,
    addHoliday,
    removeHoliday,
  } = useAppContext();

  const [selectedDay, setSelectedDay] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // ─── Add-holiday modal state ────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // ─── Marked Dates ──────────────────────────────────────────────────

  const markedDates = useMemo(() => {
    const marks = {};

    // Red dots for holidays
    for (const h of holidays) {
      const dateStr = h.date.iso.split('T')[0];
      marks[dateStr] = {
        ...(marks[dateStr] || {}),
        marked: true,
        dotColor: h.isCustom ? COLORS.accent : COLORS.error,
        customStyles: {
          container: { borderWidth: 1, borderColor: h.isCustom ? COLORS.accent : COLORS.error },
        },
      };
    }

    // Green ranges for long weekends
    for (const lw of allLongWeekends) {
      if (lw.totalDays < 3) continue;
      const start = new Date(lw.startDate + 'T00:00:00');
      const end = new Date(lw.endDate + 'T00:00:00');
      const current = new Date(start);

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const isStart = dateStr === lw.startDate;
        const isEnd = dateStr === lw.endDate;
        const isHoliday = holidays.some((h) => h.date.iso.split('T')[0] === dateStr);

        marks[dateStr] = {
          ...(marks[dateStr] || {}),
          color: isHoliday ? COLORS.errorLight : COLORS.successLight,
          textColor: COLORS.textPrimary,
          startingDay: isStart,
          endingDay: isEnd,
          marked: marks[dateStr]?.marked || false,
          dotColor: marks[dateStr]?.dotColor || undefined,
        };
        current.setDate(current.getDate() + 1);
      }
    }

    // Highlight selected day
    if (selectedDay) {
      marks[selectedDay] = {
        ...(marks[selectedDay] || {}),
        selected: true,
        selectedColor: COLORS.primary,
        selectedTextColor: COLORS.textOnPrimary,
      };
    }

    return marks;
  }, [holidays, allLongWeekends, selectedDay]);

  // ─── Selected day info ─────────────────────────────────────────────

  const selectedInfo = useMemo(() => {
    if (!selectedDay) return null;

    const holiday = holidays.find((h) => h.date.iso.split('T')[0] === selectedDay);
    const longWeekend = allLongWeekends.find(
      (lw) => selectedDay >= lw.startDate && selectedDay <= lw.endDate && lw.totalDays >= 3,
    );

    return { holiday, longWeekend };
  }, [selectedDay, holidays, allLongWeekends]);

  // ─── Actions ───────────────────────────────────────────────────────

  const openAddModal = () => {
    // Pre-fill date with selected day (if any)
    setNewHolidayDate(selectedDay || new Date().toISOString().split('T')[0]);
    setNewHolidayName('');
    setModalVisible(true);
  };

  const handleAddHoliday = async () => {
    const name = newHolidayName.trim();
    if (!name) {
      Alert.alert('Missing Name', 'Please enter a holiday name.');
      return;
    }
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newHolidayDate)) {
      Alert.alert('Invalid Date', 'Date must be in YYYY-MM-DD format.');
      return;
    }

    try {
      await addHoliday({ name, dateIso: newHolidayDate });
      setModalVisible(false);
      Alert.alert('✅ Holiday Added', `${name} on ${formatDate(newHolidayDate)} added. Long weekends have been recalculated.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleRemoveHoliday = (holiday) => {
    const dateStr = holiday.date.iso.split('T')[0];
    const label = holiday.isCustom ? 'Delete' : 'Hide';
    Alert.alert(
      `${label} Holiday`,
      `${label} "${holiday.name}" (${formatDate(dateStr)})? ${holiday.isCustom ? 'This will permanently remove it.' : 'It will be hidden. You can restore it later.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: 'destructive',
          onPress: async () => {
            await removeHoliday(dateStr, holiday.isCustom);
            Alert.alert('Done', `${holiday.name} has been ${holiday.isCustom ? 'deleted' : 'hidden'}. Long weekends updated.`);
          },
        },
      ],
    );
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Holiday Calendar</Text>
        {stateName ? (
          <Text style={styles.headerSubtitle}>📍 {stateName}</Text>
        ) : null}
      </View>

      <ScrollView>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
            <Text style={styles.legendText}>Holiday</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.legendText}>Custom</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.successLight }]} />
            <Text style={styles.legendText}>Long Weekend</Text>
          </View>
        </View>

        <Calendar
          markedDates={markedDates}
          markingType="period"
          onDayPress={(day) => setSelectedDay(day.dateString)}
          theme={{
            calendarBackground: COLORS.surface,
            todayTextColor: COLORS.primary,
            arrowColor: COLORS.primary,
            monthTextColor: COLORS.primary,
            textMonthFontWeight: '700',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            'stylesheet.calendar.header': {
              week: {
                marginTop: 5,
                flexDirection: 'row',
                justifyContent: 'space-between',
              },
            },
          }}
          style={styles.calendar}
        />

        {/* Selected Day Info */}
        {selectedInfo && (
          <View style={styles.infoCard}>
            <Text style={styles.infoDate}>
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>

            {selectedInfo.holiday && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>
                  {selectedInfo.holiday.isCustom ? '⭐ Custom Holiday' : '🎉 Holiday'}
                </Text>
                <Text style={styles.infoValue}>{selectedInfo.holiday.name}</Text>
                {selectedInfo.holiday.description ? (
                  <Text style={styles.infoDescription}>
                    {selectedInfo.holiday.description}
                  </Text>
                ) : null}
              </View>
            )}

            {selectedInfo.longWeekend && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>🏖 Long Weekend</Text>
                <Text style={styles.infoValue}>{selectedInfo.longWeekend.tip}</Text>
                <Text style={styles.infoDescription}>
                  {selectedInfo.longWeekend.totalDays} days off
                  {selectedInfo.longWeekend.bridgeLeaves > 0
                    ? ` (${selectedInfo.longWeekend.bridgeLeaves} bridge leave${
                        selectedInfo.longWeekend.bridgeLeaves > 1 ? 's' : ''
                      } needed)`
                    : ' — no extra leave needed!'}
                </Text>
              </View>
            )}

            {!selectedInfo.holiday && !selectedInfo.longWeekend && (
              <Text style={styles.infoDescription}>Regular day — no holidays.</Text>
            )}
          </View>
        )}

        {/* Holiday List (Editable) */}
        <View style={styles.holidayList}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Holidays ({holidays.length})</Text>
            <TouchableOpacity
              style={[styles.editToggle, editMode && styles.editToggleActive]}
              onPress={() => setEditMode(!editMode)}
            >
              <Text style={[styles.editToggleText, editMode && styles.editToggleTextActive]}>
                {editMode ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {editMode && (
            <TouchableOpacity style={styles.addHolidayRow} onPress={openAddModal}>
              <Text style={styles.addHolidayIcon}>＋</Text>
              <Text style={styles.addHolidayText}>Add Custom Holiday</Text>
            </TouchableOpacity>
          )}

          {[...holidays]
            .sort((a, b) => a.date.iso.localeCompare(b.date.iso))
            .map((h, i) => {
              const dateStr = h.date.iso.split('T')[0];
              const d = new Date(dateStr + 'T00:00:00');
              return (
                <View key={`${dateStr}-${i}`} style={styles.holidayRow}>
                  {editMode && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleRemoveHoliday(h)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.deleteBtnText}>−</Text>
                    </TouchableOpacity>
                  )}
                  <View
                    style={[
                      styles.holidayDot,
                      { backgroundColor: h.isCustom ? COLORS.accent : COLORS.error },
                    ]}
                  />
                  <Text style={styles.holidayRowDate}>
                    {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                  <Text style={styles.holidayRowName} numberOfLines={1}>
                    {h.name}
                    {h.isCustom ? ' ⭐' : ''}
                  </Text>
                </View>
              );
            })}
        </View>
      </ScrollView>

      {/* ─── Add Holiday Modal ──────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Holiday</Text>

            <Text style={styles.inputLabel}>Holiday Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Company Annual Day"
              placeholderTextColor={COLORS.disabled}
              value={newHolidayName}
              onChangeText={setNewHolidayName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2025-08-15"
              placeholderTextColor={COLORS.disabled}
              value={newHolidayDate}
              onChangeText={setNewHolidayDate}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleAddHoliday}
              >
                <Text style={styles.modalSaveText}>Add Holiday</Text>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  calendar: {
    marginHorizontal: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoDate: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  infoSection: {
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  infoDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  holidayList: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  editToggle: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editToggleActive: {
    backgroundColor: COLORS.primary,
  },
  editToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  editToggleTextActive: {
    color: COLORS.textOnPrimary,
  },
  addHolidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
    gap: 8,
  },
  addHolidayIcon: {
    fontSize: 18,
    color: COLORS.success,
    fontWeight: '700',
  },
  addHolidayText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  holidayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  holidayRowDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    width: 60,
  },
  holidayRowName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCancelBtn: {
    backgroundColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primary,
  },
  modalSaveText: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
});
