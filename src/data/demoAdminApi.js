import { demoMovies } from './demoMovies.js';

const SESSION_KEY = 'filme_preview_user';
const OFFSET = '+08:00';

const day = (value = new Date()) => value.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const instant = (date, clock) => new Date(`${date}T${clock}:00${OFFSET}`).toISOString();
const addMinutes = (value, minutes) => new Date(new Date(value).getTime() + minutes * 60000).toISOString();

const movies = [
  ...demoMovies,
  {
    _id: 'demo-neon-harbor', title: 'Neon Harbor', synopsis: 'A courier uncovers a secret beneath a rain-soaked city.',
    genre: 'Sci-Fi', duration: 104, rating: 'PG-13', posterUrl: '/demo-posters/midnight-signal.svg',
    releaseDate: new Date().toISOString(), status: 'draft', trailerUrl: '',
  },
  {
    _id: 'demo-last-matinee', title: 'The Last Matinee', synopsis: 'A projectionist prepares an old cinema for its final screening.',
    genre: 'Drama', duration: 96, rating: 'PG', posterUrl: '/demo-posters/beyond-the-tide.svg',
    releaseDate: new Date(Date.now() - 120 * 86400000).toISOString(), status: 'archived', trailerUrl: '',
  },
];

const rooms = [
  { _id: 'demo-room-1', name: 'Cinema One', rows: 8, seatsPerRow: 10, isActive: true, blockedSeats: ['C5', 'C6'] },
  { _id: 'demo-room-2', name: 'Premiere Hall', rows: 6, seatsPerRow: 8, isActive: true, blockedSeats: ['A1'] },
  { _id: 'demo-room-3', name: 'Studio Three', rows: 5, seatsPerRow: 8, isActive: false, blockedSeats: [] },
];

const users = [
  { _id: 'demo-admin', name: 'Preview Admin', email: 'admin@filme.local', role: 'admin', isActive: true, createdAt: '2026-01-05T04:00:00.000Z' },
  { _id: 'demo-customer-1', name: 'Mia Santos', email: 'mia@example.com', role: 'user', isActive: true, createdAt: '2026-07-12T04:00:00.000Z' },
  { _id: 'demo-customer-2', name: 'Gab Reyes', email: 'gab@example.com', role: 'user', isActive: true, createdAt: '2026-08-03T04:00:00.000Z' },
  { _id: 'demo-customer-3', name: 'Sam Cruz', email: 'sam@example.com', role: 'user', isActive: false, createdAt: '2026-09-18T04:00:00.000Z' },
];

function showingsFor(date) {
  const slots = [
    ['demo-show-1', 0, 0, '10:30', 40000, 12, true, 'scheduled'],
    ['demo-show-2', 1, 1, '13:30', 45000, 19, true, 'scheduled'],
    ['demo-show-3', 2, 0, '16:45', 40000, 31, true, 'scheduled'],
    ['demo-show-4', 0, 1, '20:00', 50000, 0, false, 'scheduled'],
  ];
  return slots.map(([id, movieIndex, roomIndex, clock, ticketPrice, sold, published, status]) => {
    const movie = movies[movieIndex];
    const auditorium = rooms[roomIndex];
    const startTime = instant(date, clock);
    const totalSeats = auditorium.rows * auditorium.seatsPerRow - auditorium.blockedSeats.length;
    return {
      _id: `${id}-${date}`, movie, auditorium, startTime, endTime: addMinutes(startTime, movie.duration),
      ticketPrice, totalSeats, remainingSeats: totalSeats - sold, status, published, blockedSeats: id === 'demo-show-3' ? ['B2'] : [],
    };
  });
}

function bookings() {
  const date = day(new Date(Date.now() + 86400000));
  const shows = showingsFor(date);
  const rows = [
    ['demo-book-1', 'FLM-DEMO101', 1, 0, ['A3', 'A4'], 'confirmed', 2],
    ['demo-book-2', 'FLM-DEMO202', 2, 1, ['C2'], 'confirmed', 1],
    ['demo-book-3', 'FLM-DEMO303', 3, 2, ['D6', 'D7', 'D8'], 'cancelled', 5],
  ];
  return rows.map(([id, bookingCode, userIndex, showIndex, seats, status, age]) => {
    const showtime = shows[showIndex];
    const bookedAt = new Date(Date.now() - age * 86400000).toISOString();
    return {
      _id: id, bookingCode, user: users[userIndex], movie: showtime.movie, auditorium: showtime.auditorium,
      showtime: { _id: showtime._id, startTime: showtime.startTime, endTime: showtime.endTime }, seats,
      unitPrice: showtime.ticketPrice, totalAmount: showtime.ticketPrice * seats.length, status, bookedAt,
      cancelledAt: status === 'cancelled' ? new Date(Date.now() - 4 * 86400000).toISOString() : null,
    };
  });
}

function stats(path) {
  const params = new URLSearchParams(path.split('?')[1] || '');
  const from = params.get('from') || day();
  const to = params.get('to') || day();
  const dates = [];
  for (let current = new Date(`${from}T12:00:00${OFFSET}`), end = new Date(`${to}T12:00:00${OFFSET}`); current <= end && dates.length < 92; current = new Date(current.getTime() + 86400000)) dates.push(day(current));
  const daily = dates.map((date, index) => ({ date, revenue: [1240000, 1680000, 990000, 2140000, 1870000, 2310000, 1960000][index % 7] }));
  const revenue = daily.reduce((sum, row) => sum + row.revenue, 0);
  return {
    revenue, tickets: Math.round(revenue / 42000), customers: 86, bookings: 112, cancelled: 7,
    occupancy: 68.4, showings: Math.max(4, dates.length * 4), previous: { revenue: Math.round(revenue * 0.88), tickets: Math.round((revenue / 42000) * 0.91) }, daily,
    topMovies: [
      { title: 'Midnight Signal', tickets: 94, revenue: 3948000 },
      { title: 'Oppenheimer: The Aftermath', tickets: 71, revenue: 3195000 },
      { title: 'Beyond the Tide', tickets: 53, revenue: 2120000 },
    ],
  };
}

export function isDemoAdminSession() {
  if (typeof localStorage === 'undefined') return false;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY))?.account === 'admin'; } catch { return false; }
}

export function demoAdminRequest(path, { method = 'GET' } = {}) {
  if (method !== 'GET' && method !== 'HEAD') throw new Error('Demo admin is a read-only preview. Sign in with a real admin account to save changes.');
  const pathname = path.split('?')[0];
  if (pathname === '/admin/movies') return Promise.resolve(structuredClone(movies));
  if (pathname === '/users') return Promise.resolve({ users: structuredClone(users), total: users.length });
  if (pathname === '/auditoriums') return Promise.resolve(structuredClone(rooms));
  if (pathname === '/admin/settings') return Promise.resolve({ turnaroundMinutes: 15, salesCutoffMinutes: 15 });
  if (pathname === '/admin/stats') return Promise.resolve(stats(path));
  if (pathname === '/admin/showtimes') {
    const date = new URLSearchParams(path.split('?')[1] || '').get('date') || day();
    return Promise.resolve(showingsFor(date));
  }
  if (pathname === '/bookings') {
    const params = new URLSearchParams(path.split('?')[1] || '');
    let rows = bookings();
    if (params.get('status')) rows = rows.filter((row) => row.status === params.get('status'));
    if (params.get('date')) rows = rows.filter((row) => day(new Date(row.showtime.startTime)) === params.get('date'));
    return Promise.resolve(rows);
  }
  return Promise.reject(new Error('This screen is not available in the demo admin preview.'));
}
