import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ActionPending from '../components/ActionPending';

const TABS = ['overview', 'movies', 'users'];
const STATUSES = ['draft', 'published', 'archived'];
const RATINGS = ['G', 'PG', 'PG-13', 'R'];

const blankMovie = {
  title: '', synopsis: '', genre: '', rating: 'PG-13', posterUrl: '', trailerUrl: '', duration: 120,
  releaseDate: new Date().toISOString().slice(0, 10), status: 'draft',
};

const toDraft = (movie) => ({
  _id: movie._id,
  title: movie.title,
  synopsis: movie.synopsis,
  genre: movie.genre,
  rating: movie.rating,
  posterUrl: movie.posterUrl,
  trailerUrl: movie.trailerUrl || '',
  duration: movie.duration,
  releaseDate: String(movie.releaseDate).slice(0, 10),
  status: movie.status,
});

// Server validation messages arrive as { message, errors: { field: text } }.
function describe(error) {
  const details = error.errors ? Object.values(error.errors).join(' ') : '';
  return details ? `${error.message} ${details}` : error.message || 'Something went wrong';
}

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const [movies, setMovies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [movieDraft, setMovieDraft] = useState(blankMovie);
  const [confirmRemove, setConfirmRemove] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    Promise.all([
      api('/admin/movies', { signal: controller.signal }),
      api('/users?limit=200', { signal: controller.signal }),
    ])
      .then(([movieList, userList]) => {
        setMovies(movieList);
        setUsers(userList.users);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setLoadError(describe(err));
        setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  // Runs one write, then shows the outcome and refreshes the lists from the server.
  const act = async (action, message, actionId) => {
    setBusy(true);
    setBusyAction(actionId);
    try {
      await action();
      setError('');
      setNotice(message);
      reload();
    } catch (err) {
      setError(describe(err));
      setNotice('');
    } finally {
      setBusy(false);
      setBusyAction('');
    }
  };

  const saveMovie = (event) => {
    event.preventDefault();
    const { _id, ...fields } = movieDraft;
    const body = { ...fields, duration: Number(fields.duration) };
    act(async () => {
      if (_id) await api(`/admin/movies/${_id}`, { method: 'PATCH', body });
      else await api('/admin/movies', { method: 'POST', body });
      setMovieDraft(blankMovie);
    }, _id ? 'Movie updated' : 'Movie added', 'save');
  };

  const removeMovie = (movie) => {
    if (confirmRemove !== movie._id) {
      setConfirmRemove(movie._id);
      return;
    }
    setConfirmRemove('');
    act(() => api(`/movies/${movie._id}`, { method: 'DELETE' }), 'Movie removed', `remove:${movie._id}`);
  };

  const setActive = (user, isActive) => act(
    () => api(`/users/${user._id}/status`, { method: 'PATCH', body: { isActive } }),
    isActive ? 'Account enabled' : 'Account disabled', `user:${user._id}`,
  );

  const edit = (field) => (event) => setMovieDraft({ ...movieDraft, [field]: event.target.value });
  const changeTab = (next) => { setTab(next); setError(''); setNotice(''); setConfirmRemove(''); };
  const countByStatus = (status) => movies.filter((movie) => movie.status === status).length;

  return (
    <div className="admin-page fade-in">
      <div className="admin-heading">
        <div>
          <span className="home-section-eyebrow">FILME operations</span>
          <h1>Admin dashboard</h1>
          <p>Manage the live movie catalog and customer accounts.</p>
        </div>
      </div>
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} className={`filter-btn ${tab === item ? 'active' : ''}`} onClick={() => changeTab(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {error && <div className="error-message" role="alert">{error}</div>}
      {notice && <div className="admin-notice" role="status">{notice}</div>}

      {loading && <div className="loading"><div className="spinner" /></div>}
      {!loading && loadError && (
        <div className="admin-panel">
          <p>We couldn&apos;t load the dashboard: {loadError}</p>
          <button type="button" className="btn btn-primary btn-small" onClick={reload}>Try again</button>
        </div>
      )}

      {!loading && !loadError && tab === 'overview' && (
        <>
          <div className="admin-stats">
            {[
              ['Published movies', countByStatus('published')],
              ['Draft movies', countByStatus('draft')],
              ['Archived movies', countByStatus('archived')],
              ['Accounts', users.length],
              ['Active accounts', users.filter((user) => user.isActive).length],
            ].map(([label, value]) => (
              <div className="admin-stat" key={label}><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>
          <div className="admin-panel">
            <h2>Coming next</h2>
            <p>Auditoriums, showtimes and bookings are managed here once the backend for them is ready.</p>
          </div>
        </>
      )}

      {!loading && !loadError && tab === 'movies' && (
        <>
          <form className="admin-panel admin-form" onSubmit={saveMovie}>
            <h2>{movieDraft._id ? 'Edit movie' : 'Add movie'}</h2>
            <label>Title<input required value={movieDraft.title} onChange={edit('title')} /></label>
            <label>Synopsis<textarea required value={movieDraft.synopsis} onChange={edit('synopsis')} /></label>
            <label>Genre<input required value={movieDraft.genre} onChange={edit('genre')} placeholder="e.g. Sci-Fi" /></label>
            <label>Rating
              <select value={movieDraft.rating} onChange={edit('rating')}>
                {RATINGS.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            </label>
            <label>Poster URL<input required type="url" value={movieDraft.posterUrl} onChange={edit('posterUrl')} placeholder="https://..." /></label>
            <label>Trailer link (optional)<input type="url" value={movieDraft.trailerUrl} onChange={edit('trailerUrl')} placeholder="https://www.youtube.com/watch?v=..." /></label>
            <label>Duration (minutes)<input required type="number" min="1" step="1" value={movieDraft.duration} onChange={edit('duration')} /></label>
            <label>Release date<input required type="date" value={movieDraft.releaseDate} onChange={edit('releaseDate')} /></label>
            <label>Status
              <select value={movieDraft.status} onChange={edit('status')}>
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <p className="profile-help">Only published movies appear on the public website. A YouTube trailer link plays by itself (muted) in the home page banner when this is the featured movie, the newest one that is now showing. Clear the box to remove it.</p>
            <div className="admin-actions">
              <button className="btn btn-primary btn-small" type="submit" disabled={busy} aria-busy={busyAction === 'save'}><ActionPending pending={busyAction === 'save'}>{busyAction === 'save' ? 'Saving...' : 'Save movie'}</ActionPending></button>
              {movieDraft._id && <button className="btn btn-secondary btn-small" type="button" onClick={() => setMovieDraft(blankMovie)}>Cancel edit</button>}
            </div>
          </form>
          <div className="admin-list">
            {movies.length === 0 && <div className="admin-panel">No movies yet.</div>}
            {movies.map((movie) => (
              <div className="admin-row" key={movie._id}>
                <div>
                  <strong>{movie.title}</strong>
                  <small>{movie.status} · {movie.genre} · {movie.rating} · {movie.duration} min</small>
                </div>
                <div className="admin-actions">
                  {movie.status === 'published' && <Link className="btn btn-secondary btn-small" to={`/movie/${movie._id}`}>View</Link>}
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => { setMovieDraft(toDraft(movie)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                  <button type="button" className="btn btn-danger btn-small" disabled={busy} aria-busy={busyAction === `remove:${movie._id}`} onClick={() => removeMovie(movie)}>
                    <ActionPending pending={busyAction === `remove:${movie._id}`}>{busyAction === `remove:${movie._id}` ? 'Removing...' : confirmRemove === movie._id ? 'Confirm remove' : 'Remove'}</ActionPending>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !loadError && tab === 'users' && (
        <div className="admin-list">
          {users.map((user) => (
            <div className="admin-row" key={user._id}>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email} · {user.role} · {user.isActive ? 'active' : 'disabled'}</small>
              </div>
              {user.role === 'user' && (
                <button type="button" className="btn btn-secondary btn-small" disabled={busy} aria-busy={busyAction === `user:${user._id}`} onClick={() => setActive(user, !user.isActive)}>
                  <ActionPending pending={busyAction === `user:${user._id}`}>{busyAction === `user:${user._id}` ? 'Updating...' : user.isActive ? 'Disable' : 'Enable'}</ActionPending>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
