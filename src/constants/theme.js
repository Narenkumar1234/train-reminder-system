export const COLORS = {
  primary: '#1a237e',       // Deep Railway Blue
  primaryLight: '#534bae',
  primaryDark: '#000051',
  accent: '#ff6f00',        // IRCTC Orange
  accentLight: '#ffa040',
  success: '#2e7d32',       // Green for long weekends
  successLight: '#c8e6c9',
  error: '#c62828',         // Red for holidays
  errorLight: '#ffcdd2',
  warning: '#f57f17',
  warningLight: '#fff9c4',
  background: '#f5f5f5',
  surface: '#ffffff',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#ffffff',
  textOnAccent: '#ffffff',
  border: '#e0e0e0',
  disabled: '#bdbdbd',
  tatkalAC: '#e53935',
  tatkalNonAC: '#1565c0',
};

export const BOOKING_WINDOW_DAYS = 60;  // IRCTC advance booking window (reduced to 60 days)
export const TATKAL_ADVANCE_DAYS = 1;   // Tatkal opens 1 day before travel

export const TATKAL_TIMES = {
  AC: { hour: 10, minute: 0, label: '10:00 AM', alarmHour: 9, alarmMinute: 55 },
  NON_AC: { hour: 11, minute: 0, label: '11:00 AM', alarmHour: 10, alarmMinute: 55 },
};
