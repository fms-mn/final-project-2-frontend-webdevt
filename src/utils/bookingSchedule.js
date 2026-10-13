import { manilaClock, manilaDay } from './manila.js';

export function bookingSchedule(slots, movieId, from, through, now = Date.now()) {
  const upcoming = slots.filter(slot => {
    const owner = String(slot.movie?._id ?? slot.movie ?? movieId);
    const day = manilaDay(slot.startTime);
    return owner === String(movieId) && Number.isFinite(Date.parse(slot.startTime)) && Date.parse(slot.startTime) > now &&
      day >= from && day <= through && slot.status !== 'cancelled' && slot.published !== false && slot.isPublished !== false;
  }).map(slot => ({ ...slot, id: slot.id || slot._id, date: manilaDay(slot.startTime), time: manilaClock(slot.startTime) }))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return { slots: upcoming, dates: [...new Set(upcoming.map(slot => slot.date))] };
}

export const isScheduleSlotBookable = slot => slot.bookable !== false && slot.remainingSeats > 0;

export function chooseScheduleSelection(schedule, { date, showtimeId, time, preserveDate = false, autoSelect = true }) {
  const direct = schedule.slots.find(slot => (showtimeId ? slot.id === showtimeId && (!date || slot.date === date) && (!time || slot.time === time) : slot.date === date && slot.time === time) && isScheduleSlotBookable(slot));
  if (direct) return { date: direct.date, slot: direct };
  if (showtimeId || !autoSelect) return { date: date || '', slot: null };
  const firstAvailable = schedule.slots.find(isScheduleSlotBookable);
  const nextDate = preserveDate && schedule.dates.includes(date) ? date : firstAvailable?.date || schedule.dates[0] || '';
  return { date: nextDate, slot: schedule.slots.find(slot => slot.date === nextDate && isScheduleSlotBookable(slot)) || null };
}

export async function loadMovieSchedule(api, movieId, through, signal) {
  const slots = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/showtimes?movie=${encodeURIComponent(movieId)}&limit=200&page=${page}`, { signal });
    if (!Array.isArray(batch) || batch.some(slot => !slot._id || !Number.isFinite(Date.parse(slot.startTime)) || !Number.isInteger(slot.remainingSeats) || slot.remainingSeats < 0)) throw new Error('Invalid showing service response');
    slots.push(...batch);
    if (batch.length < 200 || batch.some(slot => manilaDay(slot.startTime) > through)) return slots;
  }
}
