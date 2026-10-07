import { useEffect, useState } from 'react';
import { api } from '../../api';
import { describeError, pesos, trend } from '../../utils/adminTools';
import { manilaClock, shiftDay, today } from '../../utils/manila';
import LineChart from './LineChart';

const PERIODS = [['7days', 'Last 7 days'], ['30days', 'Last 30 days'], ['custom', 'Custom']];

const labelOf = (date) => new Date(`${date}T12:00:00+08:00`)
  .toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });

function Change({ now, before }) {
  const change = trend(now, before);
  if (change === null) return <small className="stat-note">No earlier sales to compare</small>;
  return <small className={`stat-note ${change < 0 ? 'down' : 'up'}`}>{change < 0 ? '▼' : '▲'} {Math.abs(change)}% vs the period before</small>;
}

export default function AdminOverview({ movies, users }) {
  const [period, setPeriod] = useState('7days');
  const [from, setFrom] = useState(shiftDay(today(), -6));
  const [to, setTo] = useState(today());
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState([]);
  const [error, setError] = useState('');

  const range = period === 'custom'
    ? { from, to }
    : { from: shiftDay(today(), period === '7days' ? -6 : -29), to: today() };

  useEffect(() => {
    if (!range.from || !range.to || range.to < range.from) return undefined;
    const controller = new AbortController();
    setError('');
    api(`/admin/stats?from=${range.from}&to=${range.to}`, { signal: controller.signal })
      .then(setStats)
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [range.from, range.to]);

  useEffect(() => {
    const controller = new AbortController();
    api(`/admin/showtimes?date=${today()}&limit=200`, { signal: controller.signal })
      .then((rows) => setBoard(rows.filter((row) => row.status === 'scheduled').sort((a, b) => new Date(a.startTime) - new Date(b.startTime))))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const countMovies = (status) => movies.filter((movie) => movie.status === status).length;
  const badRange = period === 'custom' && (!from || !to || to < from);

  return (
    <>
      <div className="admin-panel admin-toolbar">
        <div className="period-picker" role="group" aria-label="Sales period">
          {PERIODS.map(([value, label]) => (
            <button key={value} type="button" className={`filter-btn ${period === value ? 'active' : ''}`} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="period-dates">
            <label>From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
            <label>To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
          </div>
        )}
      </div>
      {badRange && <div className="error-message" role="alert">Pick a start date that is not after the end date.</div>}
      {error && <div className="error-message" role="alert">{error}</div>}

      {stats && !badRange && (
        <>
          <div className="admin-stats">
            <div className="admin-stat"><strong>{pesos(stats.revenue)}</strong><span>Revenue</span><Change now={stats.revenue} before={stats.previous.revenue} /></div>
            <div className="admin-stat"><strong>{stats.tickets}</strong><span>Tickets sold</span><Change now={stats.tickets} before={stats.previous.tickets} /></div>
            <div className="admin-stat"><strong>{stats.occupancy === null ? '—' : `${stats.occupancy}%`}</strong><span>Seats filled</span><small className="stat-note">{stats.showings} showing{stats.showings === 1 ? '' : 's'} in this period</small></div>
            <div className="admin-stat"><strong>{stats.customers}</strong><span>Customers</span><small className="stat-note">{stats.cancelled} cancelled booking{stats.cancelled === 1 ? '' : 's'}</small></div>
          </div>
          <div className="admin-grid-two">
            <section className="admin-panel" aria-label="Revenue chart">
              <h2>Revenue by day</h2>
              <LineChart
                points={stats.daily.map((day) => ({ label: labelOf(day.date), value: day.revenue / 100, tip: pesos(day.revenue) }))}
                summary={`Revenue for ${stats.daily.length} days, ${pesos(stats.revenue)} in total`}
              />
              <p className="profile-help">Sales are counted on the day the booking was made. Cancelled bookings are not counted.</p>
            </section>
            <section className="admin-panel" aria-label="Top movies">
              <h2>Top movies</h2>
              {stats.topMovies.length === 0 && <p>No sales in this period.</p>}
              <ol className="top-movies">
                {stats.topMovies.map((movie) => (
                  <li key={movie.title}><span>{movie.title}</span><strong>{pesos(movie.revenue)}</strong><small>{movie.tickets} ticket{movie.tickets === 1 ? '' : 's'}</small></li>
                ))}
              </ol>
            </section>
          </div>
        </>
      )}

      <section className="admin-panel" aria-label="Today's showings">
        <h2>Today&apos;s showings</h2>
        {board.length === 0 && <p>Nothing is scheduled today.</p>}
        {board.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">Time</th><th scope="col">Movie</th><th scope="col">Room</th><th scope="col">Seats left</th></tr></thead>
              <tbody>
                {board.map((row) => (
                  <tr key={row._id}>
                    <td className="mono">{manilaClock(row.startTime)}</td>
                    <td>{row.movie?.title}</td>
                    <td>{row.auditorium?.name}</td>
                    <td className="mono">{row.remainingSeats} / {row.totalSeats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-stats">
        {[
          ['Published movies', countMovies('published')],
          ['Draft movies', countMovies('draft')],
          ['Archived movies', countMovies('archived')],
          ['Accounts', users.length],
          ['Active accounts', users.filter((user) => user.isActive).length],
        ].map(([label, value]) => (
          <div className="admin-stat" key={label}><strong>{value}</strong><span>{label}</span></div>
        ))}
      </div>
    </>
  );
}
