import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import AdminBookings from '../components/admin/AdminBookings';
import AdminMovieManager from '../components/admin/AdminMovieManager';
import AdminOverview from '../components/admin/AdminOverview';
import AdminRooms from '../components/admin/AdminRooms';
import AdminRules from '../components/admin/AdminRules';
import AdminShowings from '../components/admin/AdminShowings';
import AdminSidebar, { ALL_ITEMS } from '../components/admin/AdminSidebar';
import AdminUsers from '../components/admin/AdminUsers';
import { describeError } from '../utils/adminTools';
import { useAuth } from '../context/AuthContext';
import '../admin.css';
import '../components/admin/adminOverview.css';
import '../components/admin/adminShell.css';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [movies, setMovies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [periodControlsTarget, setPeriodControlsTarget] = useState(null);
  const [addRequest, setAddRequest] = useState(0);
  const [scheduleFor, setScheduleFor] = useState(null); // { movieId, at }: a movie just added, to schedule next

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
    document.getElementById('admin-nav-showings')?.focus();
  };
  // "Schedule showings" after adding a movie: open Showings with that movie ready in the scheduler.
  const scheduleMovie = (movieId) => {
    setScheduleFor({ movieId, at: Date.now() });
    setTab('showings');
  };
  const quickAction = (action) => {
    if (action === 'add-movie') { setTab('movies'); setAddRequest((count) => count + 1); } else setTab(action);
  };
  const section = ALL_ITEMS.find((item) => item.id === tab);

  return (
    <div className="admin-shell">
      <AdminSidebar current={tab} onSelect={setTab} />
      <div className={`admin-page admin-workspace fade-in${tab === 'overview' ? ' admin-overview-page' : ''}`}>
        <header className="admin-topbar">
          <div>
            <h1 id="admin-page-title">{section.title}</h1>
            <p>{section.subtitle}</p>
          </div>
          {user?.isDemo && <span className="admin-demo-badge">Demo preview</span>}
          {tab === 'overview' && <div className="overview-period-slot" ref={setPeriodControlsTarget} />}
        </header>

        {loading && <div className="loading"><div className="spinner" /></div>}
        {!loading && loadError && (
          <div className="admin-panel">
            <p>We couldn&apos;t load the dashboard: {loadError}</p>
            <button type="button" className="btn btn-primary btn-small" onClick={retry}>Try again</button>
          </div>
        )}

        {!loading && !loadError && (
          <div id="admin-panel" role="region" aria-labelledby="admin-page-title" className="admin-tab-body">
            {tab === 'overview' && <AdminOverview movies={movies} users={users} periodControlsTarget={periodControlsTarget} onViewShowings={viewShowings} onQuickAction={quickAction} />}
            {tab === 'movies' && <AdminMovieManager movies={movies} reload={reload} onSchedule={scheduleMovie} addRequest={addRequest} onAddHandled={() => setAddRequest(0)} />}
            {tab === 'showings' && <AdminShowings movies={movies} scheduleFor={scheduleFor} />}
            {tab === 'bookings' && <AdminBookings />}
            {tab === 'rooms' && <AdminRooms />}
            {tab === 'users' && <AdminUsers users={users} reload={reload} />}
            {tab === 'settings' && <AdminRules standalone />}
          </div>
        )}
      </div>
    </div>
  );
}
