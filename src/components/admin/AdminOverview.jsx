import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  return <small className={`stat-note ${change < 0 ? 'down' : 'up'}`}><span aria-hidden="true">{change < 0 ? '▼' : '▲'} </span>{Math.abs(change)}% vs the period before</small>;
}

export default function AdminOverview({ movies, users, periodControlsTarget, onViewShowings, onQuickAction }) {
  const [period, setPeriod] = useState('7days');
  const [from, setFrom] = useState(shiftDay(today(), -6));
  const [to, setTo] = useState(today());
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState([]);
  const [error, setError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState('');

  const range = period === 'custom'
    ? { from, to }
    : { from: shiftDay(today(), period === '7days' ? -6 : -29), to: today() };

  useEffect(() => {
    if (!range.from || !range.to || range.to < range.from) return undefined;
    const controller = new AbortController();
    setError('');
    setStatsLoading(true);
    api(`/admin/stats?from=${range.from}&to=${range.to}`, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setStats(data); })
      .catch((err) => { if (err.name !== 'AbortError' && !controller.signal.aborted) setError(describeError(err)); })
      .finally(() => { if (!controller.signal.aborted) setStatsLoading(false); });
    return () => controller.abort();
  }, [range.from, range.to]);

  useEffect(() => {
    const controller = new AbortController();
    api(`/admin/showtimes?date=${today()}&limit=200`, { signal: controller.signal })
      .then((rows) => {
        if (!controller.signal.aborted) setBoard(rows.filter((row) => row.status === 'scheduled').sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      })
      .catch((err) => { if (err.name !== 'AbortError' && !controller.signal.aborted) setBoardError(describeError(err)); })
      .finally(() => { if (!controller.signal.aborted) setBoardLoading(false); });
    return () => controller.abort();
  }, []);

  const countMovies = (status) => movies.filter((movie) => movie.status === status).length;
  const badRange = period === 'custom' && (!from || !to || to < from);
  const timeGroups = new Map();
  for (const row of board) {
    const clock = manilaClock(row.startTime);
    if (!timeGroups.has(clock)) timeGroups.set(clock, []);
    timeGroups.get(clock).push(row);
  }

  const periodControls = <div className="overview-period-controls">
    <div className="period-picker" role="group" aria-label="Sales period">
      {PERIODS.map(([value, label]) => (
        <button key={value} type="button" className={`filter-btn ${period === value ? 'active' : ''}`} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>
      ))}
    </div>
    {period === 'custom' && <div className="period-dates">
      <label>From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
    </div>}
  </div>;

  return <div className="admin-overview">
    {periodControlsTarget ? createPortal(periodControls, periodControlsTarget) : periodControls}
    {onQuickAction && <div className="overview-quick" aria-label="Quick actions">
      <button type="button" className="overview-quick-primary" onClick={() => onQuickAction('add-movie')}><span aria-hidden="true">＋</span> Add a movie</button>
      <button type="button" onClick={() => onQuickAction('showings')}>Schedule showings</button>
      <button type="button" onClick={() => onQuickAction('bookings')}>View bookings</button>
    </div>}
    {badRange && <div className="error-message" role="alert">Pick a start date that is not after the end date.</div>}
    {!badRange && error && <div className="error-message" role="alert">{error}</div>}
    {!badRange && statsLoading && <div className="overview-state" role="status">Loading sales for this period…</div>}

    {stats && !badRange && !statsLoading && !error && <>
      <div className="overview-metrics">
        <section className="overview-revenue" aria-label="Revenue chart">
          <h2>Revenue · {period === 'custom' ? `${labelOf(range.from)} – ${labelOf(range.to)}` : PERIODS.find(([value]) => value === period)[1].toLowerCase()}</h2>
          <strong className="overview-revenue-value">{pesos(stats.revenue)}</strong>
          <Change now={stats.revenue} before={stats.previous?.revenue} />
          <LineChart
            points={stats.daily.map((day) => ({ label: labelOf(day.date), value: day.revenue / 100, tip: pesos(day.revenue) }))}
            summary={`Revenue for ${stats.daily.length} days, ${pesos(stats.revenue)} in total`}
          />
          {stats.daily.length === 0 && <p className="overview-chart-empty">No daily revenue data in this period.</p>}
          {stats.tickets === 0 && <p className="overview-revenue-help">No sales in this period yet. Once customers book and pay, revenue shows here.</p>}
          <p className="overview-revenue-help">Sales are counted on the day the booking was made. Cancelled bookings are not counted.</p>
        </section>
        <div className="overview-metric-stack">
          <div className="admin-stat"><strong>{stats.tickets}</strong><span>Tickets sold</span><Change now={stats.tickets} before={stats.previous?.tickets} /></div>
          <div className="admin-stat"><strong>{stats.occupancy === null ? '—' : `${stats.occupancy}%`}</strong><span>Seats filled</span><small className="stat-note">{stats.showings} showing{stats.showings === 1 ? '' : 's'} in this period</small></div>
          <div className="admin-stat"><strong>{stats.customers}</strong><span>Customers</span><small className="stat-note">{stats.cancelled} cancelled booking{stats.cancelled === 1 ? '' : 's'}</small></div>
        </div>
      </div>
      <section className="overview-top-movies overview-card" aria-label="Top movies">
        <h2>Top movies</h2>
        {stats.topMovies.length === 0 && <p className="overview-empty">No sales in this period.</p>}
        <ol className="top-movies">
          {stats.topMovies.map((movie, index) => <li key={movie.title + index}>
            <span>{movie.title}</span><strong>{pesos(movie.revenue)}</strong><small>{movie.tickets} ticket{movie.tickets === 1 ? '' : 's'}</small>
          </li>)}
        </ol>
      </section>
    </>}

    <section className="overview-showings" aria-labelledby="overview-showings-heading">
      <div className="overview-section-heading">
        <h2 id="overview-showings-heading">Today’s showings</h2>
        <button type="button" className="overview-view-all" onClick={onViewShowings}>View all{!boardLoading && !boardError ? ` ${board.length} showing${board.length === 1 ? '' : 's'}` : ' showings'}</button>
      </div>
      {boardLoading && <p className="overview-state" role="status">Loading today’s showings…</p>}
      {boardError && <p className="error-message" role="alert">Could not load today’s showings: {boardError}</p>}
      {!boardLoading && !boardError && board.length === 0 && <p className="overview-card overview-empty">Nothing is scheduled today.</p>}
      {!boardLoading && !boardError && board.length > 0 && <div className="overview-showing-grid">
        {[...timeGroups].map(([clock, rows]) => <section className="overview-showing-group overview-card" key={clock} aria-label={`${clock} showings`}>
          <h3>{clock}</h3>
          <ul>{rows.map((row) => <li key={row._id}>
            <strong>{row.movie?.title}</strong>
            <span className="overview-showing-room">{row.auditorium?.name}</span>
            <span className="overview-seat-count"><span>Seats available:</span> <b>{row.remainingSeats} / {row.totalSeats}</b></span>
          </li>)}</ul>
        </section>)}
      </div>}
    </section>

    <div className="overview-inventory" aria-label="Movies and accounts">
      {[
        ['Published movies', countMovies('published')],
        ['Draft movies', countMovies('draft')],
        ['Archived movies', countMovies('archived')],
        ['Accounts', users.length],
        ['Active accounts', users.filter((user) => user.isActive).length],
      ].map(([label, value]) => <div className="admin-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}
    </div>
  </div>;
}
