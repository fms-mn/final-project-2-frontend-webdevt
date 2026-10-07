import { useMemo, useState } from 'react';
import {
  FiCalendar, FiClock, FiDollarSign, FiFilm,
  FiSearch, FiTrendingUp, FiUserCheck, FiUsers,
} from 'react-icons/fi';
import { demoMovies } from '../data/demoMovies';

const TABS = ['overview', 'movies', 'users'];
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
const initialUsers = [
  { id: 'usr-1024', name: 'Mika Santos', email: 'mika@example.com', role: 'Customer', active: true },
  { id: 'usr-1025', name: 'Andre Cruz', email: 'andre@example.com', role: 'Customer', active: true },
  { id: 'usr-1026', name: 'Lena Reyes', email: 'lena@example.com', role: 'Customer', active: false },
  { id: 'usr-1027', name: 'Noah Garcia', email: 'noah@example.com', role: 'Customer', active: true },
];
const recentBookings = [
  { id: 'BK-1048', customer: 'Mika Santos', movie: 'Midnight Signal', seats: 'D5, D6', total: 560, status: 'Confirmed' },
  { id: 'BK-1047', customer: 'Andre Cruz', movie: 'Beyond the Tide', seats: 'F8', total: 280, status: 'Confirmed' },
  { id: 'BK-1046', customer: 'Lena Reyes', movie: 'Midnight Signal', seats: 'C3, C4', total: 560, status: 'Pending' },
  { id: 'BK-1045', customer: 'Noah Garcia', movie: 'Oppenheimer: The Aftermath', seats: 'E10', total: 320, status: 'Confirmed' },
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
  const filteredMovies = useMemo(() => movies.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase())), [movies, query]);
  const filteredUsers = useMemo(() => users.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const dashboardData = useMemo(() => period === 'custom' ? buildCustomRange(customFrom, customTo) : RANGE_DATA[period], [period, customFrom, customTo]);
  const totalRevenue = dashboardData.values.reduce((total, value) => total + value, 0);
  const toggleMovie = (id) => setMovies((items) => items.map((movie) => movie._id === id ? { ...movie, status: movie.status === 'published' ? 'draft' : 'published' } : movie));
  const toggleUser = (id) => setUsers((items) => items.map((item) => item.id === id ? { ...item, active: !item.active } : item));

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
            <div className="booking-table-wrap"><table className="admin-table"><thead><tr><th>Booking</th><th>Customer</th><th>Movie / seats</th><th>Total</th><th>Status</th></tr></thead><tbody>{recentBookings.map((booking) => <tr key={booking.id}><td>{booking.id}</td><td>{booking.customer}</td><td><strong>{booking.movie}</strong><small>{booking.seats}</small></td><td>₱{booking.total}</td><td><span className={`status-pill ${booking.status.toLowerCase()}`}>{booking.status}</span></td></tr>)}</tbody></table></div>
          </article>
        </section>
      </>}

      {tab !== 'overview' && <section className="admin-panel admin-management">
        <div className="admin-card-heading"><div><span className="home-section-eyebrow">MANAGEMENT</span><h2>{tab === 'movies' ? 'Movie catalog' : 'Customer accounts'}</h2></div><label className="admin-search"><FiSearch aria-hidden="true" /><span className="sr-only">Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab}...`} /></label></div>
        <div className="admin-list">
          {tab === 'movies' && filteredMovies.map((movie) => <div className="admin-row" key={movie._id}><div><strong>{movie.title}</strong><small>{movie.genre} · {movie.rating} · {movie.duration} min</small></div><button type="button" className={`status-pill status-button ${movie.status}`} onClick={() => toggleMovie(movie._id)}>{movie.status}</button></div>)}
          {tab === 'users' && filteredUsers.map((item) => <div className="admin-row" key={item.id}><div><strong>{item.name}</strong><small>{item.email} · {item.role}</small></div><button type="button" className={`status-pill status-button ${item.active ? 'confirmed' : 'inactive'}`} onClick={() => toggleUser(item.id)}>{item.active ? 'Active' : 'Disabled'}</button></div>)}
        </div>
        <p className="admin-local-note">Changes in this preview stay on the current page. Connect these controls to your API when the backend is ready.</p>
      </section>}
    </div>
  );
}
