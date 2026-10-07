import { useMemo, useState } from 'react';
import {
  FiCalendar, FiClock, FiDollarSign, FiDownload, FiEdit2, FiEye, FiFilm, FiPlus,
  FiSearch, FiShield, FiTrash2, FiTrendingUp, FiUpload, FiUserCheck, FiUsers, FiX,
} from 'react-icons/fi';
import { demoMovies } from '../data/demoMovies';

const TABS = ['overview', 'movies', 'bookings', 'users'];
const RATINGS = ['G', 'PG', 'R'];
const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'];
const RANGE_DATA = {
  today: { values: [2100, 2850, 3200, 4150, 4980, 5670], labels: ['10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'], tickets: 91, occupancy: 78.4, customers: 74, revenueTrend: '+12.4%', ticketTrend: '+8.7%', occupancyTrend: '+5.2%' },
  '7days': { values: [12400, 15800, 13200, 18600, 17400, 22100, 22950], labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], tickets: 486, occupancy: 76.8, customers: 392, revenueTrend: '+14.2%', ticketTrend: '+9.1%', occupancyTrend: '+4.8%' },
  '30days': { values: [38600, 42100, 39900, 46800, 49200, 44500, 52800, 56100, 58300, 61900], labels: ['1', '4', '7', '10', '13', '16', '19', '22', '25', '30'], tickets: 1942, occupancy: 74.6, customers: 1248, revenueTrend: '+11.8%', ticketTrend: '+7.4%', occupancyTrend: '+3.1%' },
};
const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const inputDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const shiftDate = (days) => { const date = new Date(); date.setDate(date.getDate() + days); return inputDate(date); };
const blankMovie = {
  title: '', synopsis: '', genre: '', rating: 'PG', duration: 120,
  releaseDate: inputDate(), status: 'draft', posterUrl: '',
};
const initialUsers = [
  { id: 'usr-1024', name: 'Mika Santos', email: 'mika@example.com', phone: '0917 123 4567', role: 'Customer', active: true, joined: '2026-08-14', bookings: 12 },
  { id: 'usr-1025', name: 'Andre Cruz', email: 'andre@example.com', phone: '0918 234 5678', role: 'Customer', active: true, joined: '2026-08-28', bookings: 8 },
  { id: 'usr-1026', name: 'Lena Reyes', email: 'lena@example.com', phone: '0919 345 6789', role: 'Customer', active: false, joined: '2026-09-03', bookings: 4 },
  { id: 'usr-1027', name: 'Noah Garcia', email: 'noah@example.com', phone: '0920 456 7890', role: 'Staff', active: true, joined: '2026-09-19', bookings: 6 },
];
const recentBookings = [
  { id: 'BK-1048', customer: 'Mika Santos', email: 'mika@example.com', movie: 'Midnight Signal', date: inputDate(), showtime: '6:30 PM', seats: 'D5, D6', total: 560, status: 'Confirmed', payment: 'GCash' },
  { id: 'BK-1047', customer: 'Andre Cruz', email: 'andre@example.com', movie: 'Beyond the Tide', date: inputDate(), showtime: '3:45 PM', seats: 'F8', total: 280, status: 'Confirmed', payment: 'Card' },
  { id: 'BK-1046', customer: 'Lena Reyes', email: 'lena@example.com', movie: 'Midnight Signal', date: inputDate(), showtime: '8:15 PM', seats: 'C3, C4', total: 560, status: 'Pending', payment: 'GCash' },
  { id: 'BK-1045', customer: 'Noah Garcia', email: 'noah@example.com', movie: 'Oppenheimer: The Aftermath', date: shiftDate(-1), showtime: '5:00 PM', seats: 'E10', total: 320, status: 'Confirmed', payment: 'Card' },
  { id: 'BK-1044', customer: 'Sofia Lim', email: 'sofia@example.com', movie: 'Beyond the Tide', date: shiftDate(-1), showtime: '1:15 PM', seats: 'A7, A8', total: 560, status: 'Cancelled', payment: 'Maya' },
  { id: 'BK-1043', customer: 'Ethan Tan', email: 'ethan@example.com', movie: 'Midnight Signal', date: shiftDate(-2), showtime: '10:30 AM', seats: 'B2', total: 280, status: 'Confirmed', payment: 'Cash' },
  { id: 'BK-1042', customer: 'Isla Ramos', email: 'isla@example.com', movie: 'Oppenheimer: The Aftermath', date: shiftDate(-3), showtime: '6:30 PM', seats: 'G4, G5', total: 640, status: 'Refunded', payment: 'Card' },
  { id: 'BK-1041', customer: 'Lucas Chua', email: 'lucas@example.com', movie: 'Beyond the Tide', date: shiftDate(-4), showtime: '3:45 PM', seats: 'H9', total: 280, status: 'Confirmed', payment: 'GCash' },
];
const schedule = [
  { time: '10:30 AM', movie: 'Midnight Signal', room: 'Cinema 1', sold: 64, capacity: 80 },
  { time: '1:15 PM', movie: 'Beyond the Tide', room: 'Cinema 3', sold: 51, capacity: 70 },
  { time: '3:45 PM', movie: 'Midnight Signal', room: 'Cinema 1', sold: 72, capacity: 80 },
  { time: '6:30 PM', movie: 'Oppenheimer: The Aftermath', room: 'Cinema 2', sold: 76, capacity: 90 },
];

function buildCustomRange(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (!from || !to || Number.isNaN(start.getTime()) || end < start) return RANGE_DATA['7days'];
  const days = Math.floor((end - start) / 86400000) + 1;
  const pointCount = Math.min(days, 12);
  const values = Array.from({ length: pointCount }, (_, index) => 13800 + ((index * 3700 + days * 530) % 9400));
  const labels = Array.from({ length: pointCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + Math.round(index * (days - 1) / Math.max(pointCount - 1, 1)));
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(date);
  });
  return { values, labels, tickets: Math.round(days * 70.5), occupancy: 75.3, customers: Math.round(days * 43.2), revenueTrend: '+9.6%', ticketTrend: '+6.8%', occupancyTrend: '+2.9%' };
}

function LineChart({ values, labels }) {
  const width = 620;
  const height = 210;
  const padding = 20;
  const minimum = Math.min(...values) * 0.9;
  const maximum = Math.max(...values) * 1.05;
  const spread = Math.max(maximum - minimum, 1);
  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
    const y = height - padding - ((value - minimum) / spread) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="admin-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Revenue chart with ${values.length} data points`}>
        {[0, 1, 2, 3].map((line) => <line key={line} x1="20" x2="600" y1={25 + line * 48} y2={25 + line * 48} className="chart-grid-line" />)}
        <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-primary)" stopOpacity=".35" /><stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" /></linearGradient></defs>
        <polygon points={`20,190 ${points} 600,190`} fill="url(#revenueFill)" />
        <polyline points={points} className="chart-line" />
        {points.split(' ').map((point) => { const [cx, cy] = point.split(','); return <circle key={point} cx={cx} cy={cy} r="4" className="chart-dot" />; })}
      </svg>
      <div className="chart-labels" style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('7days');
  const [customFrom, setCustomFrom] = useState(shiftDate(-6));
  const [customTo, setCustomTo] = useState(inputDate());
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState(() => demoMovies.map((movie) => ({ ...movie })));
  const [users, setUsers] = useState(initialUsers);
  const [movieDraft, setMovieDraft] = useState(null);
  const [deleteMovieId, setDeleteMovieId] = useState('');
  const [movieNotice, setMovieNotice] = useState('');
  const [posterError, setPosterError] = useState('');
  const [movieFormError, setMovieFormError] = useState('');
  const [bookingStatus, setBookingStatus] = useState('all');
  const [bookingMovie, setBookingMovie] = useState('all');
  const [bookingDate, setBookingDate] = useState('');
  const [userDialog, setUserDialog] = useState(null);
  const [userDraft, setUserDraft] = useState(null);
  const [userNotice, setUserNotice] = useState('');
  const [userActionHistory, setUserActionHistory] = useState([]);
  const filteredMovies = useMemo(() => movies.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase())), [movies, query]);
  const filteredUsers = useMemo(() => users.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const filteredBookings = useMemo(() => recentBookings.filter((booking) => {
    const matchesSearch = `${booking.id} ${booking.customer} ${booking.email} ${booking.movie} ${booking.seats}`.toLowerCase().includes(query.toLowerCase());
    return matchesSearch && (bookingStatus === 'all' || booking.status === bookingStatus) && (bookingMovie === 'all' || booking.movie === bookingMovie) && (!bookingDate || booking.date === bookingDate);
  }), [query, bookingStatus, bookingMovie, bookingDate]);
  const dashboardData = useMemo(() => period === 'custom' ? buildCustomRange(customFrom, customTo) : RANGE_DATA[period], [period, customFrom, customTo]);
  const totalRevenue = dashboardData.values.reduce((total, value) => total + value, 0);
  const dialogUser = userDialog ? users.find((item) => item.id === userDialog.id) : null;
  const recordUserAction = (description) => setUserActionHistory((items) => [{ id: `${Date.now()}-${items.length}`, description, time: new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date()) }, ...items]);
  const toggleUser = (id) => {
    const target = users.find((item) => item.id === id);
    if (!target) return;
    setUsers((items) => items.map((item) => item.id === id ? { ...item, active: !item.active } : item));
    setUserNotice(`${target.name} was ${target.active ? 'disabled' : 'enabled'}.`);
    recordUserAction(`${target.active ? 'Disabled' : 'Enabled'} ${target.name}'s account`);
  };
  const openUserDetails = (user) => { setUserDialog({ type: 'view', id: user.id }); setUserNotice(''); };
  const openUserEdit = (user) => { setUserDraft({ ...user }); setUserDialog({ type: 'edit', id: user.id }); setUserNotice(''); };
  const saveUser = (event) => {
    event.preventDefault();
    setUsers((items) => items.map((item) => item.id === userDraft.id ? { ...userDraft } : item));
    setUserNotice(`${userDraft.name}'s account was updated.`);
    recordUserAction(`Updated ${userDraft.name}'s details and role to ${userDraft.role}`);
    setUserDialog(null); setUserDraft(null);
  };
  const deleteUser = (user) => {
    setUsers((items) => items.filter((item) => item.id !== user.id));
    setUserNotice(`${user.name} was deleted from this preview.`);
    recordUserAction(`Deleted ${user.name}'s account`);
    setUserDialog(null);
  };
  const editMovieField = (field) => (event) => setMovieDraft((draft) => ({ ...draft, [field]: event.target.value }));
  const openAddMovie = () => { setMovieDraft({ ...blankMovie }); setDeleteMovieId(''); setMovieNotice(''); setPosterError(''); setMovieFormError(''); };
  const openEditMovie = (movie) => {
    setMovieDraft({ ...movie, rating: RATINGS.includes(movie.rating) ? movie.rating : 'PG', releaseDate: String(movie.releaseDate).slice(0, 10) });
    setDeleteMovieId(''); setMovieNotice(''); setPosterError(''); setMovieFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleGenre = (genre) => {
    const selected = movieDraft.genre.split(',').map((item) => item.trim()).filter(Boolean);
    const next = selected.includes(genre) ? selected.filter((item) => item !== genre) : [...selected, genre];
    setMovieFormError('');
    setMovieDraft((draft) => ({ ...draft, genre: next.join(', ') }));
  };
  const uploadPoster = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPosterError('Choose a valid image file.'); return; }
    if (file.size > 3 * 1024 * 1024) { setPosterError('Poster must be 3 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setMovieDraft((draft) => ({ ...draft, posterUrl: reader.result })); setPosterError(''); };
    reader.onerror = () => setPosterError('The poster could not be read. Try another image.');
    reader.readAsDataURL(file);
  };
  const saveMovie = (event) => {
    event.preventDefault();
    if (!movieDraft.genre.trim()) { setMovieFormError('Select at least one genre.'); return; }
    const saved = { ...movieDraft, duration: Number(movieDraft.duration) };
    if (saved._id) {
      setMovies((items) => items.map((movie) => movie._id === saved._id ? saved : movie));
      setMovieNotice(`${saved.title} was updated in this preview.`);
    } else {
      saved._id = `local-${Date.now()}`;
      setMovies((items) => [saved, ...items]);
      setMovieNotice(`${saved.title} was added to this preview.`);
    }
    setMovieDraft(null);
  };
  const removeMovie = (movie) => {
    if (deleteMovieId !== movie._id) { setDeleteMovieId(movie._id); return; }
    setMovies((items) => items.filter((item) => item._id !== movie._id));
    setDeleteMovieId('');
    setMovieNotice(`${movie.title} was deleted from this preview.`);
  };
  const exportBookings = () => {
    const safeCell = (value) => {
      const text = String(value ?? '');
      const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${protectedText.replaceAll('"', '""')}"`;
    };
    const headings = ['Booking ID', 'Customer', 'Email', 'Movie', 'Date', 'Showtime', 'Seats', 'Total PHP', 'Status', 'Payment'];
    const rows = filteredBookings.map((booking) => [booking.id, booking.customer, booking.email, booking.movie, booking.date, booking.showtime, booking.seats, booking.total, booking.status, booking.payment]);
    const csv = [headings, ...rows].map((row) => row.map(safeCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `filme-bookings-${inputDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page admin-dashboard fade-in">
      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((item) => <button key={item} type="button" className={`admin-tab ${tab === item ? 'active' : ''}`} onClick={() => { setTab(item); setQuery(''); }}>{item[0].toUpperCase() + item.slice(1)}</button>)}
      </nav>

      {tab === 'overview' && <>
        <section className="admin-date-filter" aria-label="Dashboard date range">
          <div className="admin-period-buttons">
            {[['today', 'Today'], ['7days', 'Last 7 days'], ['30days', 'Last 30 days'], ['custom', 'Custom dates']].map(([value, label]) => (
              <button key={value} type="button" className={period === value ? 'active' : ''} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>
            ))}
          </div>
          {period === 'custom' && <div className="admin-custom-dates">
            <label>From<input type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} /></label>
            <span aria-hidden="true">to</span>
            <label>To<input type="date" value={customTo} min={customFrom} max={inputDate()} onChange={(event) => setCustomTo(event.target.value)} /></label>
          </div>}
        </section>
        <section className="admin-stats" aria-label="Dashboard statistics">
          {[
            { label: 'Revenue', value: currency.format(totalRevenue), trend: dashboardData.revenueTrend, icon: FiDollarSign, tone: 'red' },
            { label: 'Tickets sold', value: dashboardData.tickets.toLocaleString(), trend: dashboardData.ticketTrend, icon: FiTrendingUp, tone: 'gold' },
            { label: 'Avg. occupancy', value: `${dashboardData.occupancy}%`, trend: dashboardData.occupancyTrend, icon: FiFilm, tone: 'purple' },
            { label: 'Active customers', value: dashboardData.customers.toLocaleString(), trend: `+${Math.max(6, Math.round(dashboardData.customers * .04))}`, icon: FiUsers, tone: 'blue' },
          ].map(({ label, value, trend, icon: Icon, tone }) => <article className="admin-stat" key={label}><div className={`admin-stat-icon ${tone}`}><Icon aria-hidden="true" /></div><span>{label}</span><strong>{value}</strong><small><FiTrendingUp aria-hidden="true" /> {trend} <em>vs previous period</em></small></article>)}
        </section>
        <section className="admin-dashboard-grid admin-chart-grid">
          <article className="admin-panel admin-revenue-card">
            <div className="admin-card-heading"><div><span className="home-section-eyebrow">PERFORMANCE</span><h2>Revenue overview</h2></div></div>
            <div className="revenue-summary"><strong>{currency.format(totalRevenue)}</strong><span>{dashboardData.revenueTrend} from previous period</span></div><LineChart values={dashboardData.values} labels={dashboardData.labels} />
          </article>
        </section>
        <section className="admin-dashboard-grid admin-dashboard-lower">
          <article className="admin-panel">
            <div className="admin-card-heading"><div><span className="home-section-eyebrow">LIVE OPERATIONS</span><h2>Today&apos;s screenings</h2></div><FiCalendar /></div>
            <div className="schedule-list">{schedule.map((show) => <div className="schedule-item" key={`${show.time}-${show.movie}`}><div className="schedule-time"><FiClock /><strong>{show.time}</strong></div><div className="schedule-info"><strong>{show.movie}</strong><span>{show.room}</span></div><div className="occupancy"><span>{show.sold}/{show.capacity} seats</span><div><i style={{ width: `${(show.sold / show.capacity) * 100}%` }} /></div></div></div>)}</div>
          </article>
          <article className="admin-panel">
            <div className="admin-card-heading"><div><span className="home-section-eyebrow">LATEST</span><h2>Recent bookings</h2></div><FiUserCheck /></div>
            <div className="booking-table-wrap"><table className="admin-table"><thead><tr><th>Booking</th><th>Customer</th><th>Movie / seats</th><th>Total</th><th>Status</th></tr></thead><tbody>{recentBookings.slice(0, 4).map((booking) => <tr key={booking.id}><td>{booking.id}</td><td>{booking.customer}</td><td><strong>{booking.movie}</strong><small>{booking.seats}</small></td><td>₱{booking.total}</td><td><span className={`status-pill ${booking.status.toLowerCase()}`}>{booking.status}</span></td></tr>)}</tbody></table></div>
          </article>
        </section>
      </>}

      {tab === 'movies' && <>
        {movieDraft && <form className="admin-panel movie-editor" onSubmit={saveMovie}>
          <div className="admin-card-heading">
            <div><span className="home-section-eyebrow">{movieDraft._id ? 'EDIT MOVIE' : 'ADD MOVIE'}</span><h2>{movieDraft._id ? `Update ${movieDraft.title}` : 'Create a movie'}</h2></div>
            <button type="button" className="icon-button" aria-label="Close movie form" onClick={() => setMovieDraft(null)}><FiX /></button>
          </div>
          <div className="movie-editor-layout">
            <div className="poster-upload-field">
              <div className="poster-preview">{movieDraft.posterUrl ? <img src={movieDraft.posterUrl} alt="Movie poster preview" /> : <div><FiFilm /><span>No poster selected</span></div>}</div>
              <label className="btn btn-secondary btn-small poster-upload-button"><FiUpload /> Upload poster<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPoster} /></label>
              {posterError && <span className="profile-field-error" role="alert">{posterError}</span>}
            </div>
            <div className="movie-fields">
              <label>Movie title<input required value={movieDraft.title} onChange={editMovieField('title')} placeholder="Enter the movie title" /></label>
              <label className="movie-field-wide">Synopsis<textarea required value={movieDraft.synopsis} onChange={editMovieField('synopsis')} placeholder="Write a short movie description" /></label>
              <fieldset className="movie-genre-field movie-field-wide">
                <legend>Genres <span>Select one or more</span></legend>
                <div className="movie-genre-options">{GENRES.map((genre) => {
                  const selected = movieDraft.genre.split(',').map((item) => item.trim()).includes(genre);
                  return <button key={genre} type="button" className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => toggleGenre(genre)}>{genre}</button>;
                })}</div>
                {movieFormError && <span className="profile-field-error" role="alert">{movieFormError}</span>}
              </fieldset>
              <label>Rating<select value={movieDraft.rating} onChange={editMovieField('rating')}>{RATINGS.map((rating) => <option value={rating} key={rating}>{rating}</option>)}</select></label>
              <label>Duration (minutes)<input required type="number" min="1" max="500" value={movieDraft.duration} onChange={editMovieField('duration')} /></label>
              <label>Release date<input required type="date" value={movieDraft.releaseDate} onChange={editMovieField('releaseDate')} /></label>
              <label>Status<select value={movieDraft.status} onChange={editMovieField('status')}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              <div className="movie-form-actions movie-field-wide"><button type="button" className="btn btn-secondary btn-small" onClick={() => setMovieDraft(null)}>Cancel</button><button type="submit" className="btn btn-primary btn-small">{movieDraft._id ? 'Save changes' : 'Add movie'}</button></div>
            </div>
          </div>
        </form>}

        <section className="admin-panel admin-management movie-management">
          <div className="admin-card-heading">
            <div><span className="home-section-eyebrow">MOVIE MANAGEMENT</span><h2>Movie catalog</h2><p>{movies.length} movies in this frontend preview</p></div>
            <div className="movie-toolbar"><label className="admin-search"><FiSearch aria-hidden="true" /><span className="sr-only">Search movies</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies..." /></label><button type="button" className="btn btn-primary btn-small" onClick={openAddMovie}><FiPlus /> Add movie</button></div>
          </div>
          {movieNotice && <div className="admin-notice" role="status">{movieNotice}</div>}
          <div className="movie-admin-list">
            {filteredMovies.map((movie) => <article className="movie-admin-row" key={movie._id}>
              <div className="movie-admin-poster">{movie.posterUrl ? <img src={movie.posterUrl} alt="" /> : <FiFilm />}</div>
              <div className="movie-admin-info"><div><strong>{movie.title}</strong><span className={`status-pill ${movie.status}`}>{movie.status}</span></div><p>{movie.synopsis}</p><small>{movie.genre} · {movie.rating} · {movie.duration} min · {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(movie.releaseDate))}</small></div>
              <div className="movie-admin-actions"><button type="button" className="btn btn-secondary btn-small" onClick={() => openEditMovie(movie)}><FiEdit2 /> Edit</button><button type="button" className="btn btn-danger btn-small" onClick={() => removeMovie(movie)}><FiTrash2 /> {deleteMovieId === movie._id ? 'Confirm delete' : 'Delete'}</button>{deleteMovieId === movie._id && <button type="button" className="movie-delete-cancel" onClick={() => setDeleteMovieId('')}>Cancel</button>}</div>
            </article>)}
            {filteredMovies.length === 0 && <div className="admin-empty"><FiFilm /><strong>No movies found</strong><span>Try another search or add a new movie.</span></div>}
          </div>
          <p className="admin-local-note">Add, edit, delete and poster upload actions are frontend-only and reset when the page is refreshed.</p>
        </section>
      </>}

      {tab === 'bookings' && <section className="admin-panel admin-management booking-management">
        <div className="admin-card-heading booking-heading-row">
          <div><span className="home-section-eyebrow">BOOKING MANAGEMENT</span><h2>Bookings</h2><p>{filteredBookings.length} of {recentBookings.length} bookings shown</p></div>
          <button type="button" className="btn btn-primary btn-small" onClick={exportBookings} disabled={filteredBookings.length === 0}><FiDownload /> Export CSV</button>
        </div>
        <div className="booking-admin-filters" aria-label="Booking filters">
          <label className="admin-search"><FiSearch aria-hidden="true" /><span className="sr-only">Search bookings</span><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search bookings" /></label>
          <label>Status<select value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)}><option value="all">All statuses</option><option>Confirmed</option><option>Pending</option><option>Cancelled</option><option>Refunded</option></select></label>
          <label>Movie<select value={bookingMovie} onChange={(event) => setBookingMovie(event.target.value)}><option value="all">All movies</option>{[...new Set(recentBookings.map((booking) => booking.movie))].map((movie) => <option key={movie}>{movie}</option>)}</select></label>
          <label>Screening date<input type="date" value={bookingDate} max={inputDate()} onChange={(event) => setBookingDate(event.target.value)} /></label>
          <button type="button" className="booking-clear-filters" onClick={() => { setQuery(''); setBookingStatus('all'); setBookingMovie('all'); setBookingDate(''); }}>Clear filters</button>
        </div>
        <div className="booking-table-wrap booking-management-table">
          <table className="admin-table">
            <thead><tr><th>Booking</th><th>Customer</th><th>Movie</th><th>Schedule</th><th>Seats</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{filteredBookings.map((booking) => <tr key={booking.id}>
              <td><strong>{booking.id}</strong></td>
              <td><strong>{booking.customer}</strong><small>{booking.email}</small></td>
              <td><strong>{booking.movie}</strong></td>
              <td>{new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${booking.date}T00:00:00`))}<small>{booking.showtime}</small></td>
              <td>{booking.seats}</td><td>{booking.payment}</td><td>{currency.format(booking.total)}</td>
              <td><span className={`status-pill ${booking.status.toLowerCase()}`}>{booking.status}</span></td>
            </tr>)}</tbody>
          </table>
          {filteredBookings.length === 0 && <div className="admin-empty"><FiCalendar /><strong>No bookings found</strong><span>Try changing or clearing the current filters.</span></div>}
        </div>
        <p className="admin-local-note">The booking table and CSV export use frontend mock data only. Exporting downloads the currently filtered rows.</p>
      </section>}

      {tab === 'users' && <>
        <section className="admin-panel admin-management user-management">
          <div className="admin-card-heading"><div><span className="home-section-eyebrow">USER MANAGEMENT</span><h2>User accounts</h2><p>{users.length} accounts in this frontend preview</p></div><label className="admin-search"><FiSearch aria-hidden="true" /><span className="sr-only">Search users</span><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search users" /></label></div>
          {userNotice && <div className="admin-notice" role="status">{userNotice}</div>}
          <div className="user-admin-list">{filteredUsers.map((item) => <article className="user-admin-row" key={item.id}>
            <div className="user-avatar" aria-hidden="true">{item.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
            <div className="user-admin-info"><div><strong>{item.name}</strong><span className={`status-pill ${item.active ? 'confirmed' : 'inactive'}`}>{item.active ? 'Active' : 'Disabled'}</span></div><span>{item.email}</span><small>{item.role} · {item.bookings} bookings · Joined {new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric' }).format(new Date(`${item.joined}T00:00:00`))}</small></div>
            <div className="user-admin-actions"><button type="button" className="btn btn-secondary btn-small" onClick={() => openUserDetails(item)}><FiEye /> View</button><button type="button" className="btn btn-secondary btn-small" onClick={() => openUserEdit(item)}><FiEdit2 /> Edit</button><button type="button" className={`status-pill status-button ${item.active ? 'confirmed' : 'inactive'}`} onClick={() => toggleUser(item.id)}>{item.active ? 'Disable' : 'Enable'}</button><button type="button" className="user-delete-button" aria-label={`Delete ${item.name}`} onClick={() => setUserDialog({ type: 'delete', id: item.id })}><FiTrash2 /></button></div>
          </article>)}</div>
          {filteredUsers.length === 0 && <div className="admin-empty"><FiUsers /><strong>No users found</strong><span>Try another search.</span></div>}
          <p className="admin-local-note">User changes are frontend-only and reset when the page is refreshed.</p>
        </section>

        <section className="admin-panel user-action-history">
          <div className="admin-card-heading"><div><span className="home-section-eyebrow">ADMIN ACTIONS</span><h2>Action history</h2></div><FiShield /></div>
          {userActionHistory.length === 0 ? <div className="history-empty">No user-management actions have been made in this session.</div> : <ol>{userActionHistory.map((entry) => <li key={entry.id}><span>{entry.description}</span><time>{entry.time}</time></li>)}</ol>}
        </section>

        {userDialog && dialogUser && <div className="user-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUserDialog(null); }}>
          <div className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
            <div className="admin-card-heading"><div><span className="home-section-eyebrow">{userDialog.type === 'delete' ? 'CONFIRM ACTION' : userDialog.type === 'edit' ? 'EDIT USER' : 'USER DETAILS'}</span><h2 id="user-dialog-title">{userDialog.type === 'delete' ? 'Delete user?' : dialogUser.name}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={() => setUserDialog(null)}><FiX /></button></div>

            {userDialog.type === 'view' && <div className="user-detail-content">
              <div className="user-detail-identity"><div className="user-avatar large">{dialogUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{dialogUser.name}</strong><span>{dialogUser.role}</span></div></div>
              <dl><div><dt>User ID</dt><dd>{dialogUser.id}</dd></div><div><dt>Email</dt><dd>{dialogUser.email}</dd></div><div><dt>Phone</dt><dd>{dialogUser.phone}</dd></div><div><dt>Status</dt><dd>{dialogUser.active ? 'Active' : 'Disabled'}</dd></div><div><dt>Total bookings</dt><dd>{dialogUser.bookings}</dd></div><div><dt>Joined</dt><dd>{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(`${dialogUser.joined}T00:00:00`))}</dd></div></dl>
              <div className="user-modal-actions"><button type="button" className="btn btn-secondary btn-small" onClick={() => setUserDialog(null)}>Close</button><button type="button" className="btn btn-primary btn-small" onClick={() => openUserEdit(dialogUser)}><FiEdit2 /> Edit user</button></div>
            </div>}

            {userDialog.type === 'edit' && userDraft && <form className="user-edit-form" onSubmit={saveUser}>
              <label>Full name<input required value={userDraft.name} onChange={(event) => setUserDraft({ ...userDraft, name: event.target.value })} /></label>
              <label>Email address<input required type="email" value={userDraft.email} onChange={(event) => setUserDraft({ ...userDraft, email: event.target.value })} /></label>
              <label>Phone number<input required value={userDraft.phone} onChange={(event) => setUserDraft({ ...userDraft, phone: event.target.value })} /></label>
              <label>Role<select value={userDraft.role} onChange={(event) => setUserDraft({ ...userDraft, role: event.target.value })}><option>Customer</option><option>Staff</option><option>Admin</option></select></label>
              <label>Account status<select value={userDraft.active ? 'active' : 'disabled'} onChange={(event) => setUserDraft({ ...userDraft, active: event.target.value === 'active' })}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
              <div className="user-modal-actions"><button type="button" className="btn btn-secondary btn-small" onClick={() => setUserDialog(null)}>Cancel</button><button type="submit" className="btn btn-primary btn-small">Save changes</button></div>
            </form>}

            {userDialog.type === 'delete' && <div className="user-delete-confirmation"><div className="delete-warning-icon"><FiTrash2 /></div><p>This removes <strong>{dialogUser.name}</strong> from the preview user list. This action cannot be undone until the page is refreshed.</p><div className="user-modal-actions"><button type="button" className="btn btn-secondary btn-small" onClick={() => setUserDialog(null)}>Cancel</button><button type="button" className="btn btn-danger btn-small" onClick={() => deleteUser(dialogUser)}>Delete user</button></div></div>}
          </div>
        </div>}
      </>}
    </div>
  );
}
