import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';
import { durationText, movieErrors } from '../../utils/movieForm';
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

function PosterPreview({ url, title, genre, rating, minutes }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  const link = url.trim();
  return (
    <div className="movie-live-preview" aria-label="How this movie will look to customers">
      <div className="movie-live-poster">
        {link && !failed ? <img src={link} alt="" onError={() => setFailed(true)} /> : <span>{failed ? "We couldn't load that image" : 'Poster preview'}</span>}
      </div>
      <div className="movie-live-card">
        <strong>{title.trim() || 'Movie title'}</strong>
        <small>{[genre.trim(), rating, durationText(minutes)].filter(Boolean).join(' · ') || 'Genre · rating · length'}</small>
      </div>
    </div>
  );
}

function MovieEditor({ draft, setDraft, onClose, onSave, busy, error, saved, onSchedule, onPublishNow }) {
  const dialog = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [errors, setErrors] = useState({});
  const isNew = !draft._id;
  const edit = (field) => (event) => {
    const value = event.target.value;
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setDraft((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('input')?.focus();
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

  const submit = (publish) => (event) => {
    event?.preventDefault?.();
    const found = movieErrors(draft);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      dialog.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    onSave(publish);
  };

  const field = (name, label, control, hint) => (
    <label className={errors[name] ? 'has-error' : ''}>
      <span className="movie-field-label">{label}</span>
      {control}
      {errors[name] ? <span className="movie-field-message" id={`movie-${name}-error`}>{errors[name]}</span> : hint && <span className="movie-field-help">{hint}</span>}
    </label>
  );
  const props = (name) => ({ name, value: draft[name], onChange: edit(name), 'aria-invalid': errors[name] ? 'true' : undefined, 'aria-describedby': errors[name] ? `movie-${name}-error` : undefined });
  const missing = Object.values(errors).filter(Boolean).length;

  if (saved) {
    return (
      <div className="movie-drawer-layer">
        <button type="button" className="movie-drawer-backdrop" aria-label="Close" onClick={onClose} />
        <aside ref={dialog} className="movie-drawer" role="dialog" aria-modal="true" aria-labelledby="movie-drawer-title">
          <div className="movie-drawer-head">
            <h2 id="movie-drawer-title">{saved.status === 'published' ? 'Movie published' : 'Movie saved'}</h2>
            <button type="button" className="movie-icon-button" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="movie-saved">
            <span className="movie-saved-mark" aria-hidden="true">✓</span>
            <h3>{saved.title}</h3>
            {saved.status === 'published'
              ? <p>It is live. Customers will see it as soon as it has a showing, so schedule some next.</p>
              : <p>It is saved as a draft, so customers cannot see it yet. Publish it when you are ready.</p>}
            {error && <p className="movie-field-error" role="alert">{error}</p>}
            <div className="movie-saved-actions">
              {saved.status === 'published'
                ? <button type="button" className="movie-button movie-button-primary" onClick={() => onSchedule(saved.id)}>Schedule showings →</button>
                : <button type="button" className="movie-button movie-button-primary" disabled={busy} onClick={onPublishNow}>{busy ? 'Publishing…' : 'Publish now'}</button>}
              <button type="button" className="movie-button movie-button-outline" onClick={onClose}>Done</button>
            </div>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="movie-drawer-layer">
      <button type="button" className="movie-drawer-backdrop" aria-label="Close movie editor" onClick={onClose} />
      <aside ref={dialog} className="movie-drawer" role="dialog" aria-modal="true" aria-labelledby="movie-drawer-title">
        <div className="movie-drawer-head">
          <h2 id="movie-drawer-title">{isNew ? 'Add movie' : 'Edit movie'}</h2>
          <button type="button" className="movie-icon-button" onClick={onClose} aria-label="Close editor">×</button>
        </div>
        <form id="movie-editor-form" className="movie-editor-form" onSubmit={submit(false)} noValidate>
          <div className="movie-editor-scroll">
            {missing > 0 && <p className="movie-field-error" role="alert">Please fix {missing} {missing === 1 ? 'field' : 'fields'} below.</p>}
            {error && <p className="movie-field-error" role="alert">{error}</p>}

            <section className="movie-section" aria-labelledby="movie-sec-poster">
              <h3 id="movie-sec-poster">Poster</h3>
              <div className="movie-poster-row">
                <PosterPreview url={draft.posterUrl} title={draft.title} genre={draft.genre} rating={draft.rating} minutes={draft.duration} />
                <div className="movie-poster-fields">
                  {field('posterUrl', <>Poster image link <em>*</em></>, <input type="text" inputMode="url" placeholder="https://example.com/poster.jpg" {...props('posterUrl')} />, 'Find the poster online, right-click it and choose "Copy image address", then paste it here.')}
                </div>
              </div>
            </section>

            <section className="movie-section" aria-labelledby="movie-sec-details">
              <h3 id="movie-sec-details">Details</h3>
              {field('title', <>Title <em>*</em></>, <input maxLength="160" {...props('title')} />)}
              {field('synopsis', <>Description <em>*</em></>, <textarea rows="4" maxLength="500" {...props('synopsis')} />, `${draft.synopsis.length}/500`)}
              <div className="movie-field-pair">
                {field('genre', <>Genre <em>*</em></>, <input placeholder="e.g. Action" {...props('genre')} />)}
                <label>
                  <span className="movie-field-label">Age rating</span>
                  <select value={draft.rating} onChange={edit('rating')}>{RATINGS.map((rating) => <option key={rating}>{rating}</option>)}</select>
                </label>
              </div>
              <div className="movie-field-pair">
                {field('releaseDate', <>Release date <em>*</em></>, <input type="date" {...props('releaseDate')} />)}
                {field('duration', <>Length (minutes) <em>*</em></>, <input type="number" min="1" step="1" {...props('duration')} />)}
              </div>
              {field('trailerUrl', 'Trailer (optional)', <input type="text" inputMode="url" placeholder="https://www.youtube.com/watch?v=..." {...props('trailerUrl')} />, 'A YouTube link. It plays in the home page banner and when customers hover over the movie.')}
            </section>

            {!isNew && (
              <section className="movie-section" aria-labelledby="movie-sec-status">
                <h3 id="movie-sec-status">Visibility</h3>
                <label>
                  <span className="movie-field-label">Status</span>
                  <select value={draft.status} onChange={edit('status')}>{STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select>
                  <span className="movie-field-help">Draft: hidden. Published: customers can see it when it has showings. Archived: hidden and kept for records. A movie with upcoming showings cannot be hidden or have its length changed until they are cancelled.</span>
                </label>
              </section>
            )}
          </div>
          <div className="movie-editor-actions">
            <button type="button" className="movie-button movie-button-outline" onClick={onClose}>Cancel</button>
            {isNew ? (
              <>
                <button type="submit" className="movie-button movie-button-outline" disabled={busy}>{busy ? 'Saving…' : 'Save as draft'}</button>
                <button type="button" className="movie-button movie-button-primary" disabled={busy} onClick={submit(true)}>{busy ? 'Saving…' : 'Save and publish'}</button>
              </>
            ) : (
              <button type="submit" className="movie-button movie-button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}

export default function AdminMovieManager({ movies, reload, onSchedule, addRequest = 0, onAddHandled }) {
  const { busy, busyAction, error, notice, clear, run } = useAdminAction();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [draft, setDraft] = useState(null);
  const [initial, setInitial] = useState(null);
  const [saved, setSaved] = useState(null); // { id, title, status }: the movie just added, while its next steps show
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

  useEffect(() => { if (addRequest > 0) { openEditor(null); onAddHandled?.(); } }, [addRequest]); // eslint-disable-line react-hooks/exhaustive-deps
  const openEditor = (movie) => {
    const value = movie ? toDraft(movie) : blankMovie();
    setDraft(value); setInitial(value); setSaved(null); setOpenMenu(''); clear();
  };
  const closeEditor = () => {
    if (busy) return;
    if (!saved && draft && JSON.stringify(draft) !== JSON.stringify(initial) && !window.confirm('Discard unsaved movie changes?')) return;
    setDraft(null); setInitial(null); setSaved(null); clear();
  };
  // `publish` saves a new movie as published straight away (the "Save and publish" button).
  const save = async (publish = false) => {
    const { _id, ...fields } = draft;
    const body = { ...fields, duration: Number(fields.duration), ...(publish && !_id ? { status: 'published' } : {}) };
    let result = null;
    const done = await run(async () => {
      result = await (_id
        ? api(`/admin/movies/${_id}`, { method: 'PATCH', body })
        : api('/admin/movies', { method: 'POST', body }));
    }, _id ? 'Movie updated' : '', 'save');
    if (!done) return;
    reload();
    if (_id) { setDraft(null); setInitial(null); return; }
    setSaved({ id: result?._id, title: body.title, status: body.status });
  };
  const publishNow = async () => {
    const done = await run(() => api(`/admin/movies/${saved.id}`, { method: 'PATCH', body: { status: 'published' } }), '', 'save');
    if (done) { setSaved({ ...saved, status: 'published' }); reload(); }
  };
  const goSchedule = (movieId) => {
    setDraft(null); setInitial(null); setSaved(null); clear();
    onSchedule?.(movieId);
  };
  const remove = async (movie) => {
    if (confirmRemove !== movie._id) { setConfirmRemove(movie._id); return; }
    const done = await run(() => api(`/movies/${movie._id}`, { method: 'DELETE' }), 'Movie deleted', `remove:${movie._id}`);
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
        <button type="button" className="movie-button movie-button-primary movie-add" onClick={() => openEditor(null)}><span aria-hidden="true">＋</span> Add movie</button>
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
                <td>{(() => { const info = showingsSummary(movie); return <span className={`movie-showings movie-showings-${info.tone}`}>{info.text}{info.hint && <small>{info.hint}</small>}{info.tone === 'warn' && onSchedule && <button type="button" className="movie-schedule-link" onClick={() => onSchedule(movie._id)}>Schedule showings →</button>}</span>; })()}</td>
                <td><div className="movie-row-actions"><button type="button" className="movie-button movie-button-outline" onClick={() => openEditor(movie)}>Edit</button><div className="movie-menu-wrap"><button type="button" className="movie-button movie-button-outline movie-more" aria-label={`More actions for ${movie.title}`} aria-expanded={openMenu === movie._id} onClick={() => { setOpenMenu(openMenu === movie._id ? '' : movie._id); setConfirmRemove(''); setWithdraw(null); }}>⋯</button>{openMenu === movie._id && <div className="movie-menu">{movie.status === 'published' && <Link to={`/movie/${movie._id}`}>View movie</Link>}{(movie.status === 'published' || movie.upcomingShowings > 0) && (withdraw?.id === movie._id
              ? <div className="movie-withdraw-confirm" role="alert">
                <p>{withdraw.showings === 0 ? 'No coming showings. This archives the movie.' : `This cancels ${withdraw.showings} ${withdraw.showings === 1 ? 'showing' : 'showings'} and ${withdraw.bookings} ${withdraw.bookings === 1 ? 'booking' : 'bookings'}, then archives the movie.`}</p>
                <button type="button" className="movie-button movie-button-primary" disabled={busy} onClick={() => confirmWithdraw(movie)}>{busyAction === `withdraw:${movie._id}` ? 'Working…' : 'Yes, take off sale'}</button>
                <button type="button" disabled={busy} onClick={() => setWithdraw(null)}>Keep it</button>
              </div>
              : <button type="button" disabled={busy} onClick={() => planWithdraw(movie)}>{busyAction === `plan:${movie._id}` ? 'Checking…' : 'Take off sale…'}</button>)}<button type="button" disabled={busy} onClick={() => remove(movie)}>{busyAction === `remove:${movie._id}` ? 'Deleting…' : confirmRemove === movie._id ? 'Confirm delete' : 'Delete movie'}</button></div>}</div></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="movie-empty">{movies.length ? 'No movies match these filters.' : 'No movies yet. Add your first movie.'}</p>}
        <div className="movie-mobile-list">
          {shown.map((movie) => <article className="movie-mobile-card" key={movie._id}><img src={movie.posterUrl} alt="" /><div><strong>{movie.title}</strong><small>{dateYear(movie.releaseDate)} · {movie.genre} · {movie.rating}</small><span>{durationLabel(movie.duration)} <span className={`movie-status movie-status-${movie.status}`}>{movie.status}</span></span>{(() => { const info = showingsSummary(movie); return info.tone === 'none' ? null : <span className={`movie-showings movie-showings-${info.tone}`}>{info.text}{info.tone === 'warn' && onSchedule && <button type="button" className="movie-schedule-link" onClick={() => onSchedule(movie._id)}>Schedule showings →</button>}</span>; })()}</div><button type="button" className="movie-button movie-button-outline" onClick={() => openEditor(movie)}>Edit</button><button type="button" className="movie-mobile-remove" disabled={busy} onClick={() => remove(movie)}>{confirmRemove === movie._id ? 'Confirm delete' : 'Delete'}</button></article>)}
        </div>
        <div className="movie-table-footer">Showing {shown.length} of {movies.length} movies</div>
      </div>
      {draft && <MovieEditor draft={draft} setDraft={setDraft} onClose={closeEditor} onSave={save} busy={busy} error={error} saved={saved} onSchedule={goSchedule} onPublishNow={publishNow} />}
    </section>
  );
}
