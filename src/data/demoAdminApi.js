import { demoMovies } from './demoMovies.js';

const SESSION_KEY = 'filme_preview_user';
const OFFSET = '+08:00';

const day = (value = new Date()) => value.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const instant = (date, clock) => new Date(`${date}T${clock}:00${OFFSET}`).toISOString();
const addMinutes = (value, minutes) => new Date(new Date(value).getTime() + minutes * 60000).toISOString();

const seedMovies = [
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

const MOVIES_KEY = 'filme_preview_admin_movies_v1';
const readMovies = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(MOVIES_KEY));
    if (Array.isArray(saved)) {
      const ids = new Set(saved.map((movie) => movie._id));
      return [...saved, ...demoMovies.slice(1, 4).filter((movie) => !ids.has(movie._id))];
    }
  } catch { /* Use the bundled catalog if storage is unavailable. */ }
  return structuredClone(seedMovies);
};
const writeMovies = (catalog) => {
  localStorage.setItem(MOVIES_KEY, JSON.stringify(catalog));
  return structuredClone(catalog);
};
const movieError = (message) => { throw new Error(message); };
const movieFields = ['title', 'synopsis', 'genre', 'rating', 'posterUrl', 'trailerUrl', 'duration', 'releaseDate', 'status'];
const validateMovie = (movie) => {
  for (const field of ['title', 'synopsis', 'genre', 'rating', 'posterUrl', 'releaseDate']) {
    if (!String(movie[field] ?? '').trim()) movieError(`${field} is required.`);
  }
  if (!Number.isInteger(Number(movie.duration)) || Number(movie.duration) < 1) movieError('Duration must be a positive number of minutes.');
  if (!['draft', 'published', 'archived'].includes(movie.status)) movieError('Choose a valid status.');
  if (!/^(https?:\/\/|\/)[^\s]+$/i.test(movie.posterUrl)) movieError('Enter a valid poster URL.');
  if (Number.isNaN(Date.parse(movie.releaseDate))) movieError('Choose a valid release date.');
  if (movie.trailerUrl && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(movie.trailerUrl)) movieError('Enter a YouTube trailer link.');
};
const hasUpcomingShowtime = (id) => seedMovies.slice(0, 4).some((movie) => movie._id === id);

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
  const catalog = readMovies();
  const slots = [
    ['demo-show-1', 0, 0, '10:30', 40000, 12, true, 'scheduled'],
    ['demo-show-2', 1, 1, '13:30', 45000, 19, true, 'scheduled'],
    ['demo-show-3', 2, 0, '16:45', 40000, 31, true, 'scheduled'],
    ['demo-show-4', 0, 1, '20:45', 50000, 0, false, 'scheduled'],
    ['demo-show-5', 3, 1, '18:45', 40000, 8, true, 'scheduled'],
  ];
  return slots.map(([id, movieIndex, roomIndex, clock, ticketPrice, sold, published, status]) => {
    const movie = catalog.find((item) => item._id === seedMovies[movieIndex]._id) || seedMovies[movieIndex];
    const auditorium = rooms[roomIndex];
    const startTime = instant(date, clock);
    const totalSeats = auditorium.rows * auditorium.seatsPerRow - new Set([...auditorium.blockedSeats, ...(id === 'demo-show-3' ? ['B2'] : [])]).size;
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

export function demoAdminRequest(path, { method = 'GET', body } = {}) {
  const pathname = path.split('?')[0];
  if (method === 'GET' && pathname === '/movies') {
    return Promise.resolve(structuredClone(readMovies().filter((movie) => movie.status === 'published')));
  }
  const publicMovieId = pathname.match(/^\/movies\/(.+)$/)?.[1];
  if (method === 'GET' && publicMovieId) {
    const movie = readMovies().find((item) => item._id === publicMovieId && item.status === 'published');
    return movie ? Promise.resolve(structuredClone(movie)) : Promise.reject(Object.assign(new Error('Movie not found'), { status: 404 }));
  }
  if (method === 'GET' && pathname === '/showtimes') {
    const params = new URLSearchParams(path.split('?')[1] || '');
    const dates = params.get('date') ? [params.get('date')]
      : Array.from({ length: 5 }, (_, index) => day(new Date(Date.now() + index * 86400000)));
    const showings = dates.flatMap(showingsFor)
      .filter((showing) => showing.status === 'scheduled' && showing.published && showing.movie.status === 'published'
        && new Date(showing.startTime).getTime() > Date.now() + 15 * 60000
        && (!params.get('movie') || showing.movie._id === params.get('movie')))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const limit = Math.min(200, Math.max(1, Number(params.get('limit')) || 100));
    const page = Math.max(1, Number(params.get('page')) || 1);
    return Promise.resolve(structuredClone(showings.slice((page - 1) * limit, page * limit)));
  }
  if (pathname === '/admin/movies' && method === 'GET') return Promise.resolve(structuredClone(readMovies()));
  if (pathname === '/admin/movies' && method === 'POST') {
    const movie = Object.fromEntries(movieFields.map((field) => [field, body?.[field]]));
    movie._id = `demo-movie-${crypto.randomUUID()}`;
    movie.duration = Number(movie.duration);
    validateMovie(movie);
    writeMovies([movie, ...readMovies()]);
    return Promise.resolve(structuredClone(movie));
  }
  const editId = pathname.match(/^\/admin\/movies\/(.+)$/)?.[1];
  if (editId && method === 'PATCH') {
    const catalog = readMovies();
    const index = catalog.findIndex((movie) => movie._id === editId);
    if (index < 0) movieError('Movie not found.');
    const changes = Object.fromEntries(movieFields.filter((field) => body?.[field] !== undefined).map((field) => [field, body[field]]));
    const next = { ...catalog[index], ...changes, duration: Number(changes.duration ?? catalog[index].duration) };
    validateMovie(next);
    if (hasUpcomingShowtime(editId) && catalog[index].status === 'published' && next.status !== 'published') movieError('This movie has upcoming showtimes. Cancel them before archiving or unpublishing it.');
    if (hasUpcomingShowtime(editId) && next.duration !== catalog[index].duration) movieError('The duration cannot change while the movie has upcoming showtimes.');
    catalog[index] = next;
    writeMovies(catalog);
    return Promise.resolve(structuredClone(next));
  }
  const removeId = pathname.match(/^\/movies\/(.+)$/)?.[1];
  if (removeId && method === 'DELETE') {
    if (hasUpcomingShowtime(removeId)) movieError('This movie has showtimes, so it cannot be deleted. Archive it instead.');
    const catalog = readMovies();
    if (!catalog.some((movie) => movie._id === removeId)) movieError('Movie not found.');
    writeMovies(catalog.filter((movie) => movie._id !== removeId));
    return Promise.resolve({ message: 'Movie deleted' });
  }
  if (method !== 'GET' && method !== 'HEAD') throw new Error('This action is not available in the demo preview.');
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
