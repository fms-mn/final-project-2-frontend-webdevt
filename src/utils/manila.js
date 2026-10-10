// The cinema runs on Philippine time (UTC+8, no daylight saving). The admin screens show and
// type times in that zone whatever the browser's own timezone is, so a showtime means the same
// thing to every admin.
const ZONE = 'Asia/Manila';
const OFFSET = '+08:00';
const DAY_MS = 24 * 60 * 60 * 1000;

export const manilaDay = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: ZONE });

export const manilaClock = (value) => new Date(value).toLocaleTimeString('en-GB', {
  timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// Value for <input type="datetime-local">: "2026-10-08T16:00".
export const toInputValue = (value) => `${manilaDay(value)}T${manilaClock(value)}`;

// What the input holds back to an instant: "2026-10-08T16:00" is 16:00 in Manila.
export const fromInputValue = (text) => {
  const date = new Date(`${text}:00${OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const today = () => manilaDay(new Date());

export const shiftDay = (day, offset) => manilaDay(new Date(new Date(`${day}T12:00:00${OFFSET}`).getTime() + offset * DAY_MS));

export const dayHeading = (day) => new Date(`${day}T12:00:00${OFFSET}`).toLocaleDateString('en-PH', {
  timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long',
});

export const shortDate = (value) => new Date(value).toLocaleDateString('en-PH', {
  timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short',
});

// Minutes after midnight in Manila, for placing a showing on a timeline.
export const minutesOfDay = (value) => {
  const [hours, minutes] = manilaClock(value).split(':').map(Number);
  return hours * 60 + minutes;
};

// Every day from `from` to `to`, both included, as 'YYYY-MM-DD'. Empty when `to` is before `from`.
export function daysBetween(from, to) {
  const days = [];
  for (let day = from; day && day <= to && days.length < 400; day = shiftDay(day, 1)) days.push(day);
  return days;
}

export const displayTime = value => new Date(value).toLocaleTimeString('en-PH', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', hour12: true });
export const displayClock = clock => displayTime('2000-01-01T' + clock + ':00' + OFFSET);
