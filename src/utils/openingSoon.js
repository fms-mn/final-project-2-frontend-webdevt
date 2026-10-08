import { manilaDay, shiftDay, today } from './manila.js';

export function openingDate(movie) {
  const value = movie?.releaseDate;
  if (!value) return null;
  const calendarDay = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (calendarDay) {
    const [, year, month, day] = calendarDay.map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
    if (value.length === 10) return value;
  }
  const release = new Date(value);
  return Number.isNaN(release.getTime()) ? null : manilaDay(release);
}

export function daysUntilOpening(day, currentDay = today()) {
  const stamp = value => Date.parse(`${value}T00:00:00Z`);
  return Math.max(0, Math.round((stamp(day) - stamp(currentDay)) / 86400000));
}

export function googleCalendarLink(movie, day, origin) {
  const start = day.replaceAll('-', '');
  const end = shiftDay(day, 1).replaceAll('-', '');
  const movieUrl = new URL(`/movie/${encodeURIComponent(movie._id)}`, origin).href;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${movie.title} releases today.`,
    dates: `${start}/${end}`,
    details: `Release reminder for ${movie.title} at FILME.\nMovie details: ${movieUrl}\nRelease dates may change. Check FILME for updates.`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
