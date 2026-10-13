// Helpers for the Showings screens: weeks, colours per movie, and turning a click on the day's
// timeline into a start time. The cinema's days are Manila days (see manila.js).
import { shiftDay } from './manila.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// 0 = Sunday ... 6 = Saturday for a 'YYYY-MM-DD' Manila day.
const weekdayIndex = (day) => new Date(`${day}T12:00:00+08:00`).getUTCDay();

// The Monday of the week that holds `day`.
export const weekStart = (day) => shiftDay(day, -((weekdayIndex(day) + 6) % 7));

// The seven days of that week, Monday first.
export const weekDays = (day) => Array.from({ length: 7 }, (_, index) => shiftDay(weekStart(day), index));

// "Oct 12 – 18" or "Sep 28 – Oct 4" for the week heading.
export function weekLabel(day) {
  const days = weekDays(day);
  const format = (value, options) => new Date(`${value}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', ...options });
  const sameMonth = days[0].slice(5, 7) === days[6].slice(5, 7);
  const start = format(days[0], { month: 'short', day: 'numeric' });
  const end = format(days[6], sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
  return `${start} – ${end}`;
}

// The same movie always gets the same colour, so a day or a week can be read at a glance.
const HUES = [222, 168, 28, 330, 262, 188, 8, 96];
export function movieColor(movieId) {
  let hash = 0;
  for (const char of String(movieId ?? '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${HUES[hash % HUES.length]} 42% 34%)`;
}

// Where a click along a room's row lands, as "HH:MM" rounded to `step` minutes.
// `fraction` is how far along the row the click was (0 to 1); the row spans `fromHour` to `toHour`.
export function timeAtFraction(fraction, fromHour, toHour, step = 30) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const minutes = fromHour * 60 + clamped * (toHour - fromHour) * 60;
  const rounded = Math.min(23 * 60 + 30, Math.round(minutes / step) * step);
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}

// Ready-made day ranges for scheduling, as { startDate, endDate } (both included).
export const RANGES = [
  ['next7', 'Next 7 days'], ['next14', 'Next 14 days'], ['thisweek', 'Rest of this week'], ['nextweek', 'Next week'],
];
export function rangeFor(kind, todayDay) {
  const monday = weekStart(todayDay);
  switch (kind) {
    case 'next14': return { startDate: shiftDay(todayDay, 1), endDate: shiftDay(todayDay, 14) };
    case 'thisweek': return { startDate: todayDay, endDate: shiftDay(monday, 6) };
    case 'nextweek': return { startDate: shiftDay(monday, 7), endDate: shiftDay(monday, 13) };
    case 'next7':
    default: return { startDate: shiftDay(todayDay, 1), endDate: shiftDay(todayDay, 7) };
  }
}

export { DAY_MS };
