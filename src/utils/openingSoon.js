import { manilaDay, shiftDay, today } from './manila.js';

export function openingDate(movie) {
  const release = new Date(movie.releaseDate);
  return Number.isNaN(release.getTime()) ? null : manilaDay(release);
}

export function daysUntilOpening(day, currentDay = today()) {
  const stamp = value => Date.parse(`${value}T00:00:00Z`);
  return Math.max(0, Math.round((stamp(day) - stamp(currentDay)) / 86400000));
}

const escapeCalendarText = value => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export function calendarReminder(movie, day, createdAt = new Date()) {
  const start = day.replaceAll('-', '');
  const end = shiftDay(day, 1).replaceAll('-', '');
  const stamp = createdAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FILME//Opening Soon//EN',
    'BEGIN:VEVENT', `UID:${encodeURIComponent(movie._id)}-${start}@filme.local`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeCalendarText(movie.title)} opens at FILME`,
    `DESCRIPTION:${escapeCalendarText(`See ${movie.title} at FILME.`)}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY',
    `DESCRIPTION:${escapeCalendarText(`${movie.title} opens tomorrow at FILME.`)}`,
    'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
