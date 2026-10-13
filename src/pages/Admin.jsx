import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import AdminBookings from '../components/admin/AdminBookings';
import AdminMovieManager from '../components/admin/AdminMovieManager';
import AdminOverview from '../components/admin/AdminOverview';
import AdminRooms from '../components/admin/AdminRooms';
import AdminShowings from '../components/admin/AdminShowings';
import AdminUsers from '../components/admin/AdminUsers';
import { describeError } from '../utils/adminTools';
import { useAuth } from '../context/AuthContext';
import '../admin.css';
import '../components/admin/adminOverview.css';

const TABS = [
  ['overview', 'Overview'], ['movies', 'Movies'], ['showings', 'Showings'],
  ['bookings', 'Bookings'], ['rooms', 'Rooms'], ['users', 'Users'],
];
const SUBTITLES = {
  overview: 'Sales, showings, bookings, and activity at a glance.',
  movies: "Manage your movie catalog, add new titles, and control what's published on your site.",
  showings: 'Plan showtimes and manage the screening schedule.',
  bookings: 'Review ticket bookings and their current status.',
  rooms: 'Manage cinema rooms and seating layouts.',
  users: 'Review customer and administrator accounts.',
};

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [movies, setMovies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [periodControlsTarget, setPeriodControlsTarget] = useState(null);

  // Movies and accounts are shared by several tabs. They are loaded once, and again after a
  // change, without blanking the screen the admin is working on.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api('/admin/movies', { signal: controller.signal }),
      api('/users?limit=200', { signal: controller.signal }),
    ])
      .then(([movieList, userList]) => {
        setMovies(movieList);
        setUsers(userList.users);
        setLoadError('');
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setLoadError(describeError(err));
        setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  const retry = () => { setLoading(true); reload(); };
  const viewShowings = () => {
    setTab('showings');
    document.getElementById('admin-tab-showings')?.focus();
  };

  return (
    <div className={`admin-page admin-workspace fade-in${tab === 'overview' ? ' admin-overview-page' : ''}`}>
      <div className="admin-heading">
        <h1>{TABS.find(([id]) => id === tab)[1]}</h1>
        <p>{SUBTITLES[tab]}</p>
        {user?.isDemo && <span className="admin-demo-badge">Demo preview</span>}
        {tab === 'overview' && <div className="overview-period-slot" ref={setPeriodControlsTarget} />}
      </div>
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" id={`admin-tab-${id}`} aria-selected={tab === id} aria-controls="admin-panel" className={`filter-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spinner" /></div>}
      {!loading && loadError && (
        <div className="admin-panel">
          <p>We couldn&apos;t load the dashboard: {loadError}</p>
          <button type="button" className="btn btn-primary btn-small" onClick={retry}>Try again</button>
        </div>
      )}

      {!loading && !loadError && (
        <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`} className="admin-tab-body">
          {tab === 'overview' && <AdminOverview movies={movies} users={users} periodControlsTarget={periodControlsTarget} onViewShowings={viewShowings} />}
          {tab === 'movies' && <AdminMovieManager movies={movies} reload={reload} />}
          {tab === 'showings' && <AdminShowings movies={movies} />}
          {tab === 'bookings' && <AdminBookings />}
          {tab === 'rooms' && <AdminRooms />}
          {tab === 'users' && <AdminUsers users={users} reload={reload} />}
        </div>
      )}
    </div>
  );
}
