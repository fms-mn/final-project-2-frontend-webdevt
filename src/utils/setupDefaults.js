// What the "Showings" step of adding a movie starts with, so the usual case is one click: the
// biggest room, the first week from opening day, usual showtimes that fit the movie's length, and
// the price and times used last time. It also remembers those choices in this browser.
import { shiftDay } from './manila.js';
import { COMMON_TIMES, clock12 } from './timeSlots.js';

const KEY = 'filme.setupPrefs';

// How many days of showings to create, counted from the first day.
export const DAY_CHOICES = [[1, 'Opening day only'], [3, 'First 3 days'], [7, 'First week'], [14, 'First 2 weeks']];

const seatsOf = (room) => (room.rows || 0) * (room.seatsPerRow || 0);

// The room the admin used last if it is still active, otherwise the one with the most seats.
export function defaultRoomId(rooms = [], preferred = '') {
  const active = rooms.filter((room) => room.isActive);
  if (!active.length) return '';
  if (preferred && active.some((room) => room._id === preferred)) return preferred;
  return [...active].sort((a, b) => seatsOf(b) - seatsOf(a) || a.name.localeCompare(b.name))[0]._id;
}

// A movie that opens later starts on its release day; a released one starts tomorrow.
export function defaultStartDay(releaseDay, todayDay) {
  return releaseDay > todayDay ? releaseDay : shiftDay(todayDay, 1);
}

const minutesOf = (clock) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));

// The usual times, minus any that would start before the movie before it (plus the room's reset
// time) is over, so the first plan never clashes with itself.
export function defaultTimes(durationMinutes, gapMinutes = 15, candidates = COMMON_TIMES) {
  const length = Number(durationMinutes) > 0 ? Number(durationMinutes) : 120;
  const chosen = [];
  let freeFrom = -Infinity;
  for (const clock of [...candidates].sort()) {
    if (minutesOf(clock) >= freeFrom) {
      chosen.push(clock);
      freeFrom = minutesOf(clock) + length + gapMinutes;
    }
  }
  return chosen.length ? chosen : [candidates[0]];
}

// "10:00 AM, 1:00 PM and 4:00 PM"
export function listTimes(times = []) {
  const labels = [...times].sort().map(clock12);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
}

const dayLabel = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });

// One plain sentence about what is about to be created.
export function describeSetup({ roomName, days, startDay, times, price }) {
  const when = days === 1 ? `on ${dayLabel(startDay)}` : `for ${days} days from ${dayLabel(startDay)}`;
  const where = roomName ? `In ${roomName}` : 'No room';
  const money = Number.isFinite(Number(price)) && price !== '' ? `₱${Number(price).toLocaleString('en-PH', { minimumFractionDigits: Number(price) % 1 ? 2 : 0 })} a seat` : 'price not set';
  return `${where}, ${when}, at ${listTimes(times) || 'no times'}, ${money}.`;
}

export function recallSetup() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      room: typeof saved.room === 'string' ? saved.room : '',
      times: Array.isArray(saved.times) && saved.times.every((time) => /^\d{2}:\d{2}$/.test(time)) ? saved.times : null,
      price: typeof saved.price === 'string' && saved.price !== '' ? saved.price : '',
      days: DAY_CHOICES.some(([count]) => count === saved.days) ? saved.days : null,
    };
  } catch {
    return { room: '', times: null, price: '', days: null };
  }
}

export function rememberSetup({ room, times, price, days }) {
  try { localStorage.setItem(KEY, JSON.stringify({ room, times, price, days })); } catch { /* storage is blocked */ }
}
