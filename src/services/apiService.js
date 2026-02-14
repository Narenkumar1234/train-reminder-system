/**
 * Holiday API Service
 * Uses Calendarific API with fallback to mock data
 */
import { MOCK_HOLIDAYS_2025 } from '../constants/mockHolidays';

const CALENDARIFIC_API_KEY = process.env.EXPO_PUBLIC_CALENDARIFIC_API_KEY || '';
const BASE_URL = 'https://calendarific.com/api/v2/holidays';

/**
 * Fetch holidays from the Calendarific API
 * @param {number} year - e.g. 2025
 * @param {string|null} stateIso - e.g. "in-tn" for Tamil Nadu (optional)
 * @returns {Promise<Array>} List of holiday objects
 */
export async function fetchHolidays(year, stateIso = null) {
  // If no API key, go straight to mock
  if (!CALENDARIFIC_API_KEY || CALENDARIFIC_API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('[HolidayService] No API key — returning mock data');
    return getMockHolidays(year);
  }

  try {
    let url = `${BASE_URL}?api_key=${CALENDARIFIC_API_KEY}&country=IN&year=${year}`;
    if (stateIso) {
      url += `&location=${stateIso}`;
    }

    console.log('[HolidayService] Fetching:', url.replace(CALENDARIFIC_API_KEY, '***'));

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data?.meta?.code !== 200) {
      throw new Error(data?.meta?.error_detail || 'API error');
    }

    const holidays = data.response.holidays;

    // Filter to only gazetted / national holidays (skip observances etc.)
    return holidays.filter(
      (h) =>
        h.type.includes('National holiday') ||
        h.type.includes('Gazetted Holiday') ||
        h.primary_type === 'National holiday' ||
        h.primary_type === 'Gazetted Holiday'
    );
  } catch (error) {
    console.warn('[HolidayService] API failed, using mock data:', error.message);
    return getMockHolidays(year);
  }
}

/**
 * Return mock holidays filtered by year
 */
function getMockHolidays(year) {
  return MOCK_HOLIDAYS_2025.filter((h) => h.date.iso.startsWith(String(year)));
}

/**
 * Fetch holidays for the current year and next year (for planning ahead)
 */
export async function fetchHolidaysMultiYear(stateIso = null) {
  const currentYear = new Date().getFullYear();
  const [thisYear, nextYear] = await Promise.all([
    fetchHolidays(currentYear, stateIso),
    fetchHolidays(currentYear + 1, stateIso),
  ]);
  return [...thisYear, ...nextYear];
}
