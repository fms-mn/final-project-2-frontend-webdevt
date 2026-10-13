// Helpers for picking a date and a time without typing them: 12-hour labels, a list of start
// times in 15-minute steps, "ends at" for a movie length, and quick day choices.
import { shiftDay } from './manila.js';

// "16:00" -> "4:00 PM"
export function clock12(clock) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(clock));
  if (!match) return '';
  const hours = Number(match[1]);
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${hours < 12 ? 'AM' : 'PM'}`;
}

// Start times offered in the picker: every 15 minutes from 08:00 to 23:45.
export const TIME_OPTIONS = Array.from({ length: 64 }, (_, index) => {
  const minutes = 8 * 60 + index * 15;
  const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return { value, label: clock12(value) };
});

// Times that most cinemas start shows; one tap each.
export const COMMON_TIMES = ['10:00', '13:00', '16:00', '19:00', '21:30'];

// When a show that starts at `clock` and runs `minutes` ends: { clock: '18:05', nextDay: false }.
export function endOf(clock, minutes) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(clock));
  const length = Number(minutes);
  if (!match || !Number.isFinite(length) || length <= 0) return null;
  const total = Number(match[1]) * 60 + Number(match[2]) + Math.round(length);
  const within = total % (24 * 60);
  return {
    clock: `${String(Math.floor(within / 60)).padStart(2, '0')}:${String(within % 60).padStart(2, '0')}`,
    nextDay: total >= 24 * 60,
  };
}

// "Ends 6:05 PM" or "Ends 1:10 AM (next day)".
export function endsText(clock, minutes) {
  const end = endOf(clock, minutes);
  return end ? `Ends ${clock12(end.clock)}${end.nextDay ? ' (next day)' : ''}` : '';
}

const WEEKDAY = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' });
const DAY_NUMBER = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' });

// The days an admin most often wants, as buttons: Today, Tomorrow, then the next few days by name.
export function quickDays(today, count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const day = shiftDay(today, index);
    const label = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `${WEEKDAY(day)} ${DAY_NUMBER(day)}`;
    return { day, label };
  });
}

// Where a new showing starts by default on `day`: the first of the usual start times that is still
// at least half an hour away, or the next day at 4:00 PM when today has run out of them.
export function defaultStart(day, nowMs = Date.now()) {
  const pick = ['16:00', '19:00', '21:30', '13:00', '10:00'].find((clock) => new Date(`${day}T${clock}:00+08:00`).getTime() > nowMs + 30 * 60 * 1000);
  return pick ? `${day}T${pick}` : `${shiftDay(day, 1)}T16:00`;
}

// Has "YYYY-MM-DDTHH:MM" (cinema time) already passed?
export const hasPassed = (value, nowMs = Date.now()) => Boolean(value) && new Date(`${value}:00+08:00`).getTime() <= nowMs;
