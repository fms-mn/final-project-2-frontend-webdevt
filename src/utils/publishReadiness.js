// Is a movie ready to publish, and what will customers see once it is? The server enforces the
// same rule when publishing; this shows it earlier, as a checklist the admin can act on.
import { validDay } from './calendar.js';
import { manilaDay, today as manilaToday } from './manila.js';

const dayOf = (value) => (validDay(value) ? value : manilaDay(value));
const DAY = 24 * 60 * 60 * 1000;
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const dayName = (day) => new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });

// What the release date means, in plain words.
export function releaseNote(releaseDate, current = manilaToday()) {
  if (!releaseDate) return { released: false, tone: 'warn', text: 'Choose the day the movie opens.' };
  const day = dayOf(releaseDate);
  const ahead = daysBetween(current, day);
  if (ahead > 0) {
    return {
      released: false, daysAhead: ahead, tone: 'info',
      text: `Opens ${dayName(day)}, in ${ahead} ${ahead === 1 ? 'day' : 'days'}. You can publish it right away as Coming soon and add showings later. Showings can be sold early as advance tickets.`,
    };
  }
  return {
    released: true, daysAhead: 0, tone: 'warn',
    text: ahead === 0
      ? 'Opens today. It can only be published once it has at least one showing customers can book.'
      : `Released ${dayName(day)}. It can only be published once it has at least one showing customers can book.`,
  };
}

// The label customers will see, and the pages it appears on. `bookable` is the number of showings
// customers can still book.
export function predictOutcome({ releaseDate, bookable = 0 }, current = manilaToday()) {
  const note = releaseNote(releaseDate, current);
  if (!releaseDate) return { label: 'Not set', tone: 'muted', line: 'Choose a release date', where: [] };
  if (!note.released) {
    return {
      label: 'Coming soon', tone: 'soon', line: `Opens ${dayName(dayOf(releaseDate))}`,
      where: [
        ['Home · Coming soon', true, `with a ${note.daysAhead} day countdown`],
        ['Movies · Coming soon', true, ''],
        ['Booking', bookable > 0, bookable > 0 ? 'advance tickets' : 'until you add showings'],
      ],
    };
  }
  if (bookable > 0) {
    return {
      label: 'Now showing', tone: 'live', line: `${bookable} ${bookable === 1 ? 'showing' : 'showings'} to book`,
      where: [['Home · schedule board', true, ''], ['Movies · Now showing', true, ''], ['Landing page ticket', true, ''], ['Booking', true, '']],
    };
  }
  return {
    label: 'No showings', tone: 'none', line: 'Nothing to book yet',
    where: [['Home · schedule board', false, ''], ['Movies · Now showing', false, ''], ['Booking', false, 'until you add showings']],
  };
}

const present = (value) => String(value ?? '').trim().length > 0;

// The checklist. `required` rows must be done to publish; `optional` rows are advice.
// `bookable` is the number of showings customers could book today.
export function readiness(movie, { bookable = 0 } = {}, current = manilaToday()) {
  const note = releaseNote(movie.releaseDate, current);
  const missing = ['title', 'synopsis', 'genre', 'rating'].filter((field) => !present(movie[field]));
  if (!(Number(movie.duration) > 0)) missing.push('length');
  const labels = { title: 'title', synopsis: 'description', genre: 'genre', rating: 'age rating', length: 'length' };

  const items = [
    {
      key: 'details', state: missing.length ? 'blocked' : 'ok', title: 'Details complete',
      text: missing.length ? `Still missing: ${missing.map((field) => labels[field]).join(', ')}.` : 'Title, description, genre, age rating and length are filled in.',
      action: missing.length ? { label: 'Edit details', tab: 'details' } : null,
    },
    {
      key: 'poster', state: present(movie.posterUrl) ? 'ok' : 'blocked', title: 'Poster added',
      text: present(movie.posterUrl) ? 'Customers see it on every card.' : 'Add a poster so the movie looks right on the site.',
      action: present(movie.posterUrl) ? null : { label: 'Add poster', tab: 'details' },
    },
    {
      key: 'release', state: movie.releaseDate ? 'ok' : 'blocked', title: 'Release date set',
      text: note.released ? (note.daysAhead === 0 ? 'Opens today, so it needs a showing.' : 'Already released, so it needs a showing.') : `Opens ${dayName(dayOf(movie.releaseDate))}.`,
      action: movie.releaseDate ? null : { label: 'Set date', tab: 'details' },
    },
  ];
  if (note.released) {
    items.push({
      key: 'showings', state: bookable > 0 ? 'ok' : 'blocked',
      title: bookable > 0 ? `${bookable} ${bookable === 1 ? 'showing' : 'showings'} customers can book` : 'Needs at least one showing',
      text: bookable > 0 ? 'The movie will show as Now showing.' : 'A released movie with nothing to book would show "No showings".',
      action: { label: bookable > 0 ? 'View showings' : 'Add showings', tab: bookable > 0 ? 'showings' : null, schedule: bookable === 0 },
    });
  } else {
    items.push({
      key: 'showings', state: bookable > 0 ? 'ok' : 'optional',
      title: bookable > 0 ? `${bookable} ${bookable === 1 ? 'showing' : 'showings'} on sale early` : 'No showings yet',
      text: bookable > 0 ? 'Customers can buy advance tickets.' : 'Not required. Customers see Coming soon until you add showings.',
      action: { label: bookable > 0 ? 'View showings' : 'Add showings', tab: bookable > 0 ? 'showings' : null, schedule: bookable === 0 },
    });
  }
  const required = items.filter((item) => item.state !== 'optional');
  const done = required.filter((item) => item.state === 'ok').length;
  const blocker = items.find((item) => item.state === 'blocked');
  return { items, required: required.length, done, ready: !blocker, blocker: blocker ? blocker.title : '', note };
}
