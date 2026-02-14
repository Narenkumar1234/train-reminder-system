/**
 * Long Weekend Detection Algorithm
 *
 * Analyzes holidays to find long-weekend opportunities:
 *   - Holiday on Friday  → Fri-Sat-Sun (3-day weekend)
 *   - Holiday on Monday  → Sat-Sun-Mon (3-day weekend)
 *   - Holiday on Thursday → Take Fri off for Thu-Fri-Sat-Sun (4-day, bridge)
 *   - Holiday on Tuesday  → Take Mon off for Sat-Sun-Mon-Tue (4-day, bridge)
 *   - Holiday on Wednesday → Take Mon+Tue or Thu+Fri off (5-day, 2 bridge leaves)
 */
import { BOOKING_WINDOW_DAYS } from '../constants/theme';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Analyze a list of holidays and produce long weekend opportunities
 * @param {Array} holidays - Array of holiday objects with date.iso
 * @returns {Array} sorted list of long-weekend opportunity objects
 */
export function detectLongWeekends(holidays) {
  const opportunities = [];

  for (const holiday of holidays) {
    const dateStr = holiday.date.iso.split('T')[0]; // handle any time component
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const dayName = DAY_NAMES[dayOfWeek];

    let opportunity = null;

    switch (dayOfWeek) {
      case 1: // Monday
        opportunity = {
          holidayName: holiday.name,
          holidayDate: dateStr,
          dayName,
          type: 'natural',
          totalDays: 3,
          startDate: _addDays(dateStr, -2), // Saturday
          endDate: dateStr, // Monday
          bridgeLeaves: 0,
          tip: '3-day weekend! Sat-Sun-Mon',
        };
        break;

      case 5: // Friday
        opportunity = {
          holidayName: holiday.name,
          holidayDate: dateStr,
          dayName,
          type: 'natural',
          totalDays: 3,
          startDate: dateStr, // Friday
          endDate: _addDays(dateStr, 2), // Sunday
          bridgeLeaves: 0,
          tip: '3-day weekend! Fri-Sat-Sun',
        };
        break;

      case 4: // Thursday — take Friday off
        opportunity = {
          holidayName: holiday.name,
          holidayDate: dateStr,
          dayName,
          type: 'bridge',
          totalDays: 4,
          startDate: dateStr, // Thursday
          endDate: _addDays(dateStr, 2), // Sunday (Fri bridge + Sat-Sun)
          bridgeLeaves: 1,
          tip: 'Take Friday off → 4-day weekend! Thu-Fri-Sat-Sun',
        };
        break;

      case 2: // Tuesday — take Monday off
        opportunity = {
          holidayName: holiday.name,
          holidayDate: dateStr,
          dayName,
          type: 'bridge',
          totalDays: 4,
          startDate: _addDays(dateStr, -2), // Saturday
          endDate: dateStr, // Tuesday (Sat-Sun + Mon bridge + Tue)
          bridgeLeaves: 1,
          tip: 'Take Monday off → 4-day weekend! Sat-Sun-Mon-Tue',
        };
        break;

      case 3: // Wednesday — take Thu+Fri or Mon+Tue
        opportunity = {
          holidayName: holiday.name,
          holidayDate: dateStr,
          dayName,
          type: 'extended-bridge',
          totalDays: 5,
          startDate: dateStr, // Wednesday
          endDate: _addDays(dateStr, 4), // Sunday (Wed + Thu-Fri bridge + Sat-Sun)
          bridgeLeaves: 2,
          tip: 'Take Thu + Fri off → 5-day break! Wed-Thu-Fri-Sat-Sun',
        };
        break;

      default:
        // Saturday or Sunday holiday — already a weekend, less interesting
        // Still include as a note
        opportunity = {
          holidayName: holiday.name,
          holidayDate: dateStr,
          dayName,
          type: 'weekend',
          totalDays: 2,
          startDate: dayOfWeek === 6 ? dateStr : _addDays(dateStr, -1),
          endDate: dayOfWeek === 0 ? dateStr : _addDays(dateStr, 1),
          bridgeLeaves: 0,
          tip: 'Holiday falls on the weekend.',
        };
        break;
    }

    if (opportunity) {
      // Calculate booking reminder date (60 days before travel start)
      const bookingReminderDate = _addDays(opportunity.startDate, -BOOKING_WINDOW_DAYS);
      opportunity.bookingReminderDate = bookingReminderDate;
      opportunity.description = holiday.description || '';
      opportunities.push(opportunity);
    }
  }

  // Sort by holiday date ascending
  opportunities.sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));

  return opportunities;
}

/**
 * Filter to only future long weekends (3+ days, and start date is in the future)
 */
export function getUpcomingLongWeekends(holidays) {
  const today = new Date().toISOString().split('T')[0];
  const all = detectLongWeekends(holidays);
  return all.filter((opp) => opp.totalDays >= 3 && opp.startDate >= today);
}

/**
 * Helper: add days to a date string
 */
function _addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
