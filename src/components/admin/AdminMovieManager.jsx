import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';
import './adminMovies.css';

const STATUSES = ['draft', 'published', 'archived'];
const RATINGS = ['G', 'PG', 'PG-13', 'R'];
const today = () => new Date().toISOString().slice(0, 10);
const blankMovie = () => ({
  title: '', synopsis: '', genre: '', rating: 'PG-13', posterUrl: '', trailerUrl: '',
  duration: 120, releaseDate: today(), status: 'draft',
});
const toDraft = (movie) => ({
  _id: movie._id, title: movie.title, synopsis: movie.synopsis, genre: movie.genre,
  rating: movie.rating, posterUrl: movie.posterUrl, trailerUrl: movie.trailerUrl || '',
  duration: movie.duration, releaseDate: String(movie.releaseDate).slice(0, 10), status: movie.status,
});
// What the admin should know about a movie's showings at a glance.
function showingsSummary(movie) {
  const count = movie.upcomingShowings ?? 0;
  if (movie.status !== 'published') return { text: '—', tone: 'none' };
  if (count > 0) {
    const next = movie.nextShowing ? new Date(movie.nextShowing).toLocaleString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    return { text: `${count} upcoming`, hint: next && `Next: ${next}`, tone: 'ok' };
  }
  return movie.showStatus === 'coming_soon'
    ? { text: 'None scheduled yet', hint: 'Coming soon', tone: 'warn' }
    : { text: 'No showings', hint: 'Customers see "No showings". Schedule some, or archive it.', tone: 'warn' };
}
const dateYear = (value) => value ? String(value).slice(0, 4) : '—';
const durationLabel = (minutes) => `${Math.floor(Number(minutes) / 60)}h ${String(Number(minutes) % 60).padStart(2, '0')}m`;

function MovieEditor({ draft, setDraft, tab, setTab, onClose, onSave, busy, error }) {
  const dialog = useRef(null);
  const firstField = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [fieldError, setFieldError] = useState('');
  const edit = (field) => (event) => {
    setFieldError('');
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstField.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')].filter((item) => item.offsetParent !== null);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oldOverflow;
      previous?.focus?.();
    };
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const required = [
      ['title', 'Details'], ['synopsis', 'Details'], ['genre', 'Details'],
      ['releaseDate', 'Details'], ['posterUrl', 'Media'],
    ];
    const missing = required.find(([field]) => !String(draft[field] ?? '').trim());
    if (missing) {
      setTab(missing[1]);
      setFieldError(`${missing[0] === 'posterUrl' ? 'Poster URL' : missing[0]} is required.`);
      return;
    }
    if (!Number.isInteger(Number(draft.duration)) || Number(draft.duration) < 1) {
      setTab('Details'); setFieldError('Enter a positive duration in minutes.'); return;
    }
    if (!/^(https?:\/\/|\/)[^\s]+$/i.test(draft.posterUrl)) {
      setTab('Media'); setFieldError('Enter a valid poster URL.'); return;
    }
    onSave(event);
  };
  const onTabKeyDown = (event) => {
    const names = ['Details', 'Media', 'Publishing'];
    const next = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!next) return;
    event.preventDefault();
    const name = names[(names.indexOf(tab) + next + names.length) % names.length];
    setTab(name);
    event.currentTarget.parentElement.querySelector(`[data-movie-tab="${name}"]`)?.focus();
  };

  return (
    <div className="movie-drawer-layer">
      <button type="button" className="movie-drawer-backdrop" aria-label="Close movie editor" onClick={onClose} />
      <aside ref={dialog} className="movie-drawer" role="dialog" aria-modal="true" aria-labelledby="movie-drawer-title">
        <div className="movie-drawer-head">
          <h2 id="movie-drawer-title">{draft._id ? 'Edit Movie' : 'Add Movie'}</h2>
          <button type="button" className="movie-icon-button" onClick={onClose} aria-label="Close editor">×</button>
        </div>
        <div className="movie-editor-tabs" role="tablist" aria-label="Movie fields">
          {['Details', 'Media', 'Publishing'].map((name) => (
            <button key={name} type="button" role="tab" data-movie-tab={name} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} onKeyDown={onTabKeyDown} onClick={() => setTab(name)}>{name}</button>
          ))}
        </div>
        <form id="movie-editor-form" className="movie-editor-form" onSubmit={submit} noValidate>
          <div className="movie-editor-scroll">
            {fieldError && <p className="movie-field-error" role="alert">{fieldError}</p>}
            {error && <p className="movie-field-error" role="alert">{error}</p>}
            {tab === 'Details' && (
              <div className="movie-editor-fields">
                <label>Title <em>*</em><input ref={firstField} value={draft.title} onChange={edit('title')} maxLength="160" /></label>
                <label>Description <em>*</em><textarea rows="5" value={draft.synopsis} onChange={edit('synopsis')} maxLength="500" /></label>
                <div className="movie-character-count">{draft.synopsis.length}/500</div>
                <label>Genre <em>*</em><input value={draft.genre} onChange={edit('genre')} placeholder="e.g. Action" /></label>
                <div className="movie-field-pair">
                  <label>Release date <em>*</em><input type="date" value={draft.releaseDate} onChange={edit('releaseDate')} /></label>
                  <label>Duration (minutes) <em>*</em><input type="number" min="1" step="1" value={draft.duration} onChange={edit('duration')} /></label>
                </div>
                <label>Age classification<select value={draft.rating} onChange={edit('rating')}>{RATINGS.map((rating) => <option key={rating}>{rating}</option>)}</select></label>
                {draft.posterUrl && <div className="movie-details-poster"><span>Poster preview</span><div className="movie-poster-controls"><img src={draft.posterUrl} alt={`${draft.title || 'Movie'} poster preview`} /><button type="button" className="movie-button movie-button-outline" onClick={() => setTab('Media')}>Change Poster</button></div></div>}
              </div>
            )}
            {tab === 'Media' && (
              <div className="movie-editor-fields">
                <label>Poster URL <em>*</em><input ref={firstField} type="text" value={draft.posterUrl} onChange={edit('posterUrl')} placeholder="https://example.com/poster.jpg" /></label>
                <p className="movie-field-help">Use an image URL for the movie poster.</p>
                {draft.posterUrl && <img className="movie-media-preview" src={draft.posterUrl} alt="Poster preview" />}
                <label>Trailer link (optional)<input type="url" value={draft.trailerUrl} onChange={edit('trailerUrl')} placeholder="https://www.youtube.com/watch?v=..." /></label>
                <p className="movie-field-help">A YouTube trailer can play in the home page banner when this movie is featured.</p>
              </div>
            )}
            {tab === 'Publishing' && (
              <div className="movie-editor-fields">
                <label>Status<select ref={firstField} value={draft.status} onChange={edit('status')}>{STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label>
                <p className="movie-field-help">Only published movies appear on the public website. Movies with upcoming showtimes cannot be unpublished or change duration until those showtimes are cancelled.</p>
              </div>
            )}
          </div>
          <div className="movie-editor-actions">
            <button type="button" className="movie-button movie-button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="movie-button movie-button-primary" disabled={busy}>{busy ? 'Saving…' : draft._id ? 'Save Changes' : 'Save Movie'}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default function AdminMovieManager({ movies, reload }) {
  const { busy, busyAction, error, notice, clear, run } = useAdminAction();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [draft, setDraft] = useState(null);
  const [initial, setInitial] = useState(null);
  const [editorTab, setEditorTab] = useState('Details');
  const [openMenu, setOpenMenu] = useState('');
  const [confirmRemove, setConfirmRemove] = useState('');
  const [withdraw, setWithdraw] = useState(null); // { id, showings, bookings }: the plan awaiting a yes
  const genres = useMemo(() => [...new Set(movies.map((movie) => movie.genre).filter(Boolean))].sort(), [movies]);
  const shown = useMemo(() => movies
    .filter((movie) => movie.title.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((movie) => genre === 'all' || movie.genre === genre)
    .filter((movie) => status === 'all' || movie.status === status)
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'oldest') return new Date(a.releaseDate) - new Date(b.releaseDate);
      return new Date(b.releaseDate) - new Date(a.releaseDate);
    }), [movies, query, genre, status, sort]);

  const openEditor = (movie) => {
    const value = movie ? toDraft(movie) : blankMovie();
    setDraft(value); setInitial(value); setEditorTab('Details'); setOpenMenu(''); clear();
  };
  const closeEditor = () => {
    if (busy) return;
    if (draft && JSON.stringify(draft) !== JSON.stringify(initial) && !window.confirm('Discard unsaved movie changes?')) return;
    setDraft(null); setInitial(null); clear();
  };
  const save = async () => {
    const { _id, ...fields } = draft;
    const body = { ...fields, duration: Number(fields.duration) };
    const done = await run(() => _id
      ? api(`/admin/movies/${_id}`, { method: 'PATCH', body })
      : api('/admin/movies', { method: 'POST', body }), _id ? 'Movie updated' : 'Movie added', 'save');
    if (done) { setDraft(null); setInitial(null); reload(); }
  };
  const remove = async (movie) => {
    if (confirmRemove !== movie._id) { setConfirmRemove(movie._id); return; }
    const done = await run(() => api(`/movies/${movie._id}`, { method: 'DELETE' }), 'Movie removed', `remove:${movie._id}`);
    setConfirmRemove(''); setOpenMenu('');
    if (done) reload();
  };

  // Taking a movie off sale cancels its coming showings and their bookings, so ask first, with numbers.
  const planWithdraw = async (movie) => {
    let plan = null;
    const done = await run(async () => { plan = await api(`/admin/movies/${movie._id}/withdraw`, { method: 'POST', body: { dryRun: true } }); }, '', `plan:${movie._id}`);
    if (done) setWithdraw({ id: movie._id, showings: plan.showings, bookings: plan.bookings });
  };
  const confirmWithdraw = async (movie) => {
    const plan = withdraw;
    const done = await run(
      () => api(`/admin/movies/${movie._id}/withdraw`, { method: 'POST', body: {} }),
      `"${movie.title}" is off sale: ${plan.showings} ${plan.showings === 1 ? 'showing' : 'showings'} and ${plan.bookings} ${plan.bookings === 1 ? 'booking' : 'bookings'} cancelled, movie archived`,
      `withdraw:${movie._id}`,
    );
    setWithdraw(null); setOpenMenu('');
    if (done) reload();
  };

  return (
    <section className="movie-manager" aria-label="Movie management">
      <Feedback error={draft ? '' : error} notice={notice} />
      <div className="movie-manager-toolbar">
        <label className="movie-search"><span className="visually-hidden">Search movies</span><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies..." /></label>
        <label className="movie-filter"><span className="visually-hidden">Filter by genre</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">All genres</option>{genres.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className="movie-filter"><span className="visually-hidden">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{STATUSES.map((name) => <option key={name} value={name}>{name[0].toUpperCase() + name.slice(1)}</option>)}</select></label>
        <label className="movie-sort"><span className="visually-hidden">Sort movies</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label>
        <span className="movie-count">{shown.length} {shown.length === 1 ? 'movie' : 'movies'}</span>
        <button type="button" className="movie-button movie-button-primary movie-add" onClick={() => openEditor(null)}><span aria-hidden="true">＋</span> Add Movie</button>
      </div>
      <div className="movie-table-shell">
        <table className="movie-table">
          <thead><tr><th>Poster</th><th>Title</th><th>Genre</th><th>Classification</th><th>Duration</th><th>Status</th><th>Showings</th><th>Actions</th></tr></thead>
          <tbody>
            {shown.map((movie) => (
              <tr key={movie._id}>
                <td><img className="movie-table-poster" src={movie.posterUrl} alt="" /></td>
                <td><strong>{movie.title}</strong><small>{dateYear(movie.releaseDate)}</small></td>
                <td><span className="movie-genre-pill">{movie.genre}</span></td>
                <td>{movie.rating}</td>
                <td><span className="movie-duration">◷&nbsp; {durationLabel(movie.duration)}</span></td>
                <td><span className={`movie-status movie-status-${movie.status}`}>{movie.status}</span></td>
                <td>{(() => { const info = showingsSummary(movie); return <span className={`movie-showings movie-showings-${info.tone}`}>{info.text}{info.hint && <small>{info.hint}</small>}</span>; })()}</td>
                <td><div className="movie-row-actions"><button type="button" className="movie-button movie-button-outline" onClick={() => openEditor(movie)}>Edit</button><div className="movie-menu-wrap"><button type="button" className="movie-button movie-button-outline movie-more" aria-label={`More actions for ${movie.title}`} aria-expanded={openMenu === movie._id} onClick={() => { setOpenMenu(openMenu === movie._id ? '' : movie._id); setConfirmRemove(''); setWithdraw(null); }}>⋯</button>{openMenu === movie._id && <div className="movie-menu">{movie.status === 'published' && <Link to={`/movie/${movie._id}`}>View movie</Link>}{(movie.status === 'published' || movie.upcomingShowings > 0) && (withdraw?.id === movie._id
              ? <div className="movie-withdraw-confirm" role="alert">
                <p>{withdraw.showings === 0 ? 'No coming showings. This archives the movie.' : `This cancels ${withdraw.showings} ${withdraw.showings === 1 ? 'showing' : 'showings'} and ${withdraw.bookings} ${withdraw.bookings === 1 ? 'booking' : 'bookings'}, then archives the movie.`}</p>
                <button type="button" className="movie-button movie-button-primary" disabled={busy} onClick={() => confirmWithdraw(movie)}>{busyAction === `withdraw:${movie._id}` ? 'Working…' : 'Yes, take off sale'}</button>
                <button type="button" disabled={busy} onClick={() => setWithdraw(null)}>Keep it</button>
              </div>
              : <button type="button" disabled={busy} onClick={() => planWithdraw(movie)}>{busyAction === `plan:${movie._id}` ? 'Checking…' : 'Take off sale…'}</button>)}<button type="button" disabled={busy} onClick={() => remove(movie)}>{busyAction === `remove:${movie._id}` ? 'Removing…' : confirmRemove === movie._id ? 'Confirm remove' : 'Remove movie'}</button></div>}</div></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="movie-empty">{movies.length ? 'No movies match these filters.' : 'No movies yet. Add your first movie.'}</p>}
        <div className="movie-mobile-list">
          {shown.map((movie) => <article className="movie-mobile-card" key={movie._id}><img src={movie.posterUrl} alt="" /><div><strong>{movie.title}</strong><small>{dateYear(movie.releaseDate)} · {movie.genre} · {movie.rating}</small><span>{durationLabel(movie.duration)} <span className={`movie-status movie-status-${movie.status}`}>{movie.status}</span></span></div><button type="button" className="movie-button movie-button-outline" onClick={() => openEditor(movie)}>Edit</button><button type="button" className="movie-mobile-remove" disabled={busy} onClick={() => remove(movie)}>{confirmRemove === movie._id ? 'Confirm remove' : 'Remove'}</button></article>)}
        </div>
        <div className="movie-table-footer">Showing {shown.length} of {movies.length} movies</div>
      </div>
      {draft && <MovieEditor draft={draft} setDraft={setDraft} tab={editorTab} setTab={setEditorTab} onClose={closeEditor} onSave={save} busy={busy} error={error} />}
    </section>
  );
}
