import { useEffect, useMemo, useRef, useState } from 'react';
import { FiArchive, FiCalendar, FiEdit2, FiExternalLink, FiRotateCcw, FiTrash2, FiUploadCloud, FiUsers, FiX } from 'react-icons/fi';
import { api } from '../../api';
import ConfirmDialog from './ConfirmDialog';
import Feedback from './Feedback';
import MovieBookings from './MovieBookings';
import MovieOverview from './MovieOverview';
import RowMenu from './RowMenu';
import useMovieSummary from './useMovieSummary';
import MovieRemove from './MovieRemove';
import MovieShowingsList from './MovieShowingsList';
import useAdminAction from './useAdminAction';
import { durationText, movieErrors } from '../../utils/movieForm';
import { pesos } from '../../utils/adminTools';
import { today as manilaToday } from '../../utils/manila';
import './adminMovies.css';
import './adminMoviesPanel.css';

const STATUSES = ['draft', 'published', 'archived'];
const RATINGS = ['G', 'PG', 'PG-13', 'R'];
const today = manilaToday; // the cinema's calendar day
const isReleased = (releaseDate) => String(releaseDate).slice(0, 10) <= today();
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
  if (movie.status === 'archived' && movie.autoArchivedAt) {
    const when = new Date(movie.autoArchivedAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'short', year: 'numeric' });
    return { text: 'Archived automatically', hint: `On ${when}, after no showings for a while. Publish it to bring it back.`, tone: 'none' };
  }
  if (movie.status === 'draft') {
    if (count > 0) return { text: `${count} scheduled`, hint: 'Hidden until you publish the movie', tone: 'warn', action: 'publish' };
    return isReleased(movie.releaseDate)
      ? { text: 'None scheduled', hint: 'Schedule showings, then publish', tone: 'warn', action: 'schedule' }
      : { text: '—', tone: 'none' };
  }
  if (movie.status !== 'published') return { text: '—', tone: 'none' };
  if (count > 0) {
    const next = movie.nextShowing ? new Date(movie.nextShowing).toLocaleString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    return { text: `${count} upcoming`, hint: next && `Next: ${next}`, tone: 'ok' };
  }
  return movie.showStatus === 'coming_soon'
    ? { text: 'None scheduled yet', hint: 'Coming soon', tone: 'warn', action: 'schedule' }
    : { text: 'No showings', hint: 'Customers see "No showings". Schedule some, or archive it.', tone: 'warn', action: 'schedule' };
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


const TABS = [['overview', 'Overview'], ['details', 'Details'], ['showings', 'Showings'], ['bookings', 'Bookings'], ['remove', 'Remove']];

function MovieEditor({ draft, setDraft, movie, dirty, startTab, onClose, onSave, busy, error, saved, onSchedule, onPublishNow, onOpenShowing, onChanged }) {
  const dialog = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [errors, setErrors] = useState({});
  const isNew = !draft._id;
  const [tab, setTab] = useState(isNew ? 'details' : startTab || 'overview');
  const summary = useMovieSummary(isNew ? null : draft._id);
  const edit = (field) => (event) => {
    const value = event.target.value;
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setDraft((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (dialog.current?.querySelector(isNew ? 'input' : '[role="tab"][aria-selected="true"]'))?.focus();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const released = isReleased(draft.releaseDate);
  const submit = (mode) => (event) => {
    event?.preventDefault?.();
    const found = movieErrors(draft);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      dialog.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    onSave(mode);
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

  const tabKeys = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const keys = TABS.map(([key]) => key);
    const at = keys.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
    setTab(keys[next]);
    requestAnimationFrame(() => dialog.current?.querySelector(`#movie-tab-${keys[next]}`)?.focus());
  };
  const tabNote = { showings: summary.summary?.showings.upcoming, bookings: summary.summary?.sales.bookings };

  if (saved) {
    return (
      <div className="movie-drawer-layer">
        <button type="button" className="movie-drawer-backdrop" aria-label="Close" onClick={onClose} />
        <aside ref={dialog} className="movie-drawer" role="dialog" aria-modal="true" aria-labelledby="movie-drawer-title">
          <div className="movie-drawer-head">
            <h2 id="movie-drawer-title">{saved.status === 'published' ? 'Movie published' : 'Movie saved'}</h2>
            <button type="button" className="movie-icon-button" onClick={onClose} aria-label="Close"><FiX aria-hidden="true" /></button>
          </div>
          <div className="movie-saved">
            <span className="movie-saved-mark" aria-hidden="true">✓</span>
            <h3>{saved.title}</h3>
            {saved.status === 'published'
              ? <p>It is live. Customers will see it as soon as it has a showing, so schedule some next.</p>
              : isReleased(saved.releaseDate)
                ? <p>It is saved as a draft. It is already released, so schedule at least one showing, then publish it so customers can see it.</p>
                : <p>It is saved as a draft. It is a coming-soon movie, so you can publish it now, or schedule showings first.</p>}
            {error && <p className="movie-field-error" role="alert">{error}</p>}
            <div className="movie-saved-actions">
              <button type="button" className="movie-button movie-button-primary" onClick={() => onSchedule(saved.id)}>Schedule showings →</button>
              {saved.status !== 'published' && !isReleased(saved.releaseDate) && <button type="button" className="movie-button movie-button-outline" disabled={busy} onClick={onPublishNow}>{busy ? 'Publishing…' : 'Publish now'}</button>}
              <button type="button" className="movie-button movie-button-outline" onClick={onClose}>Done</button>
            </div>
          </div>
        </aside>
      </div>
    );
  }

  const showFooter = isNew || tab === 'details';
  return (
    <div className="movie-drawer-layer">
      <button type="button" className="movie-drawer-backdrop" aria-label="Close movie editor" onClick={onClose} />
      <aside ref={dialog} className={`movie-drawer${isNew ? '' : ' movie-drawer-wide'}`} role="dialog" aria-modal="true" aria-labelledby="movie-drawer-title">
        <div className="movie-drawer-head">
          {isNew ? <h2 id="movie-drawer-title">Add movie</h2> : (
            <div className="movie-drawer-title">
              {movie?.posterUrl && <img src={movie.posterUrl} alt="" />}
              <div>
                <h2 id="movie-drawer-title">{draft.title || 'Manage movie'}</h2>
                <span className="movie-drawer-meta">
                  <span className={`movie-status movie-status-${draft.status}`}>{draft.status}</span>
                  {[draft.genre, draft.rating, durationText(draft.duration)].filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>
          )}
          <button type="button" className="movie-icon-button" onClick={onClose} aria-label="Close editor"><FiX aria-hidden="true" /></button>
        </div>
        {!isNew && (
          <div className="movie-tabs" role="tablist" aria-label="Movie sections" onKeyDown={tabKeys}>
            {TABS.map(([key, label]) => (
              <button key={key} id={`movie-tab-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls="movie-tab-panel" tabIndex={tab === key ? 0 : -1}
                className={`${tab === key ? 'is-on' : ''}${key === 'remove' ? ' is-danger' : ''}`} onClick={() => setTab(key)}>
                {label}
                {tabNote[key] > 0 && <span className="movie-tab-count">{tabNote[key]}</span>}
                {key === 'details' && dirty && <span className="movie-tab-dot" role="img" aria-label="Unsaved changes" />}
              </button>
            ))}
          </div>
        )}
        <form id="movie-editor-form" className="movie-editor-form" onSubmit={submit('draft')} noValidate>
          <div className="movie-editor-scroll" id="movie-tab-panel" role={isNew ? undefined : 'tabpanel'} aria-labelledby={isNew ? undefined : `movie-tab-${tab}`}>
            {missing > 0 && <p className="movie-field-error" role="alert">Please fix {missing} {missing === 1 ? 'field' : 'fields'} below.</p>}
            {error && <p className="movie-field-error" role="alert">{error}</p>}

            {!isNew && tab === 'overview' && movie && <MovieOverview movie={movie} state={summary} onTab={setTab} onSchedule={onSchedule} />}

            {(isNew || tab === 'details') && (
              <>
                <section className="movie-section" aria-labelledby="movie-sec-poster">
                  <h3 id="movie-sec-poster">Poster</h3>
                  <div className="movie-poster-row">
                    <PosterPreview url={draft.posterUrl} title={draft.title} genre={draft.genre} rating={draft.rating} minutes={draft.duration} />
                    <div className="movie-poster-fields">
                      {field('posterUrl', <>Poster image link <em>*</em></>, <input type="text" inputMode="url" placeholder="https://example.com/poster.jpg" {...props('posterUrl')} />, 'Find the poster online, right-click it and choose "Copy image address", then paste it here.')}
                      {draft.title.trim() && <a className="movie-find-link" href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${draft.title} movie poster`)}`} target="_blank" rel="noreferrer">Search for a poster of "{draft.title.trim()}" ↗</a>}
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
                  {draft.title.trim() && <a className="movie-find-link" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${draft.title} official trailer`)}`} target="_blank" rel="noreferrer">Find the trailer on YouTube ↗</a>}
                </section>

                {!isNew && (
                  <section className="movie-section" aria-labelledby="movie-sec-status">
                    <h3 id="movie-sec-status">Visibility</h3>
                    <label>
                      <span className="movie-field-label">Status</span>
                      <select value={draft.status} onChange={edit('status')}>{STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select>
                      <span className="movie-field-help">Draft: hidden, but you can already schedule showings for it. Published: customers can see it; a movie that is already released needs at least one upcoming showing first. Archived: hidden and kept for records. A movie with upcoming showings cannot be hidden or have its length changed until they are cancelled.</span>
                    </label>
                  </section>
                )}
              </>
            )}

            {!isNew && tab === 'showings' && movie && <MovieShowingsList movie={movie} onOpen={onOpenShowing} onSchedule={onSchedule} />}
            {!isNew && tab === 'bookings' && movie && <MovieBookings movie={movie} state={summary} />}
            {!isNew && tab === 'remove' && movie && <MovieRemove movie={movie} onChanged={onChanged} />}
          </div>
          {showFooter && (
            <div className="movie-editor-actions">
              <button type="button" className="movie-button movie-button-outline" onClick={onClose}>Cancel</button>
              {isNew ? (
                <>
                  <button type="submit" className="movie-button movie-button-outline" disabled={busy}>{busy ? 'Saving…' : 'Save as draft'}</button>
                  {released
                    ? <button type="button" className="movie-button movie-button-primary" disabled={busy} onClick={submit('schedule')}>{busy ? 'Saving…' : 'Save and schedule showings'}</button>
                    : <button type="button" className="movie-button movie-button-primary" disabled={busy} onClick={submit('publish')}>{busy ? 'Saving…' : 'Save and publish'}</button>}
                </>
              ) : (
                <button type="submit" className="movie-button movie-button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
              )}
            </div>
          )}
        </form>
      </aside>
    </div>
  );
}

const revenueOf = (movie) => movie.sales?.revenue ?? 0;
const hasHistory = (movie) => (movie.sales?.bookings ?? 0) + (movie.sales?.cancelled ?? 0) > 0;

function SalesCell({ movie }) {
  const sales = movie.sales;
  if (!sales || (sales.bookings === 0 && sales.cancelled === 0)) return <span className="movie-sales-none">No sales yet</span>;
  return (
    <span className="movie-sales">
      <strong>{pesos(sales.revenue)}</strong>
      <small>{sales.tickets} {sales.tickets === 1 ? 'ticket' : 'tickets'}{sales.cancelled > 0 && ` · ${sales.cancelled} cancelled`}</small>
    </span>
  );
}

export default function AdminMovieManager({ movies, reload, onSchedule, onOpenShowing, addRequest = 0, onAddHandled }) {
  const { busy, busyAction, error, notice, setNotice, clear, run } = useAdminAction();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [draft, setDraft] = useState(null);
  const [initial, setInitial] = useState(null);
  const [startTab, setStartTab] = useState('overview');
  const [saved, setSaved] = useState(null); // { id, title, status }: the movie just added, while its next steps show
  const [dialog, setDialog] = useState(null); // { kind: 'withdraw' | 'delete', movie, plan, loading }
  const genres = useMemo(() => [...new Set(movies.map((movie) => movie.genre).filter(Boolean))].sort(), [movies]);
  const shown = useMemo(() => movies
    .filter((movie) => movie.title.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((movie) => genre === 'all' || movie.genre === genre)
    .filter((movie) => (status === 'all' ? true : status === 'needs' ? movie.status === 'published' && (movie.upcomingShowings ?? 0) === 0 : movie.status === status))
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'oldest') return new Date(a.releaseDate) - new Date(b.releaseDate);
      if (sort === 'revenue') return revenueOf(b) - revenueOf(a) || a.title.localeCompare(b.title);
      return new Date(b.releaseDate) - new Date(a.releaseDate);
    }), [movies, query, genre, status, sort]);
  const totalRevenue = useMemo(() => shown.reduce((sum, movie) => sum + revenueOf(movie), 0), [shown]);

  useEffect(() => { if (addRequest > 0) { openEditor(null); onAddHandled?.(); } }, [addRequest]); // eslint-disable-line react-hooks/exhaustive-deps
  const openEditor = (movie, tab = 'overview') => {
    const value = movie ? toDraft(movie) : blankMovie();
    setDraft(value); setInitial(value); setSaved(null); setStartTab(tab); setDialog(null); clear();
  };
  const isDirty = !saved && draft && JSON.stringify(draft) !== JSON.stringify(initial);
  const closeEditor = () => {
    if (busy) return;
    if (isDirty && !window.confirm('Discard unsaved movie changes?')) return;
    setDraft(null); setInitial(null); setSaved(null); clear();
  };
  // mode: 'draft' saves a draft, 'publish' saves a coming-soon movie as published, 'schedule' saves a
  // draft and goes straight to scheduling its showings (a released movie is published afterwards).
  const save = async (mode = 'draft') => {
    const { _id, ...fields } = draft;
    const body = { ...fields, duration: Number(fields.duration), ...(mode === 'publish' && !_id ? { status: 'published' } : {}) };
    let result = null;
    const done = await run(async () => {
      result = await (_id
        ? api(`/admin/movies/${_id}`, { method: 'PATCH', body })
        : api('/admin/movies', { method: 'POST', body }));
    }, _id ? 'Movie updated' : '', 'save');
    if (!done) return;
    reload();
    if (_id) { setDraft(null); setInitial(null); return; }
    if (mode === 'schedule') { setDraft(null); setInitial(null); setSaved(null); onSchedule?.(result?._id); return; }
    setSaved({ id: result?._id, title: body.title, status: body.status, releaseDate: body.releaseDate });
  };
  const publishNow = async () => {
    const done = await run(() => api(`/admin/movies/${saved.id}`, { method: 'PATCH', body: { status: 'published' } }), '', 'save');
    if (done) { setSaved({ ...saved, status: 'published' }); reload(); }
  };
  // Leaving the panel for another screen: ask first when there are unsaved changes.
  const leave = (then) => {
    if (isDirty && !window.confirm('Discard unsaved movie changes?')) return;
    setDraft(null); setInitial(null); setSaved(null); clear();
    then();
  };
  const goSchedule = (movieId) => leave(() => onSchedule?.(movieId));
  const openShowing = (showing) => leave(() => onOpenShowing?.(showing));
  const changed = (message) => { setDraft(null); setInitial(null); setSaved(null); setNotice(message); reload(); };

  const setStatusOf = async (movie, next, message, id) => {
    const done = await run(() => api(`/admin/movies/${movie._id}`, { method: 'PATCH', body: { status: next } }), message, id);
    if (done) reload();
    return done;
  };
  const publishRow = (movie) => setStatusOf(movie, 'published', `"${movie.title}" is published and its showings are on sale.`, `publish:${movie._id}`);
  const restoreRow = (movie) => setStatusOf(movie, 'draft', `"${movie.title}" is back as a draft. Schedule showings, then publish it.`, `restore:${movie._id}`);
  const archiveRow = (movie) => setStatusOf(movie, 'archived', `"${movie.title}" is archived and hidden from customers.`, `archive:${movie._id}`);

  // Taking a movie off sale cancels its coming showings and their bookings, so ask first, with numbers.
  const askWithdraw = async (movie) => {
    clear();
    setDialog({ kind: 'withdraw', movie, loading: true });
    let plan = null;
    const done = await run(async () => { plan = await api(`/admin/movies/${movie._id}/withdraw`, { method: 'POST', body: { dryRun: true } }); }, '', `plan:${movie._id}`);
    setDialog(done ? { kind: 'withdraw', movie, plan: { showings: plan.showings, bookings: plan.bookings } } : { kind: 'withdraw', movie, failed: true });
  };
  const confirmWithdraw = async () => {
    const { movie, plan } = dialog;
    const done = await run(
      () => api(`/admin/movies/${movie._id}/withdraw`, { method: 'POST', body: {} }),
      `"${movie.title}" is off sale: ${plan.showings} ${plan.showings === 1 ? 'showing' : 'showings'} and ${plan.bookings} ${plan.bookings === 1 ? 'booking' : 'bookings'} cancelled, movie archived`,
      `withdraw:${movie._id}`,
    );
    if (done) { setDialog(null); reload(); }
  };
  const askDelete = (movie) => { clear(); setDialog({ kind: 'delete', movie }); };
  const confirmDelete = async () => {
    const { movie } = dialog;
    const done = await run(() => api(`/movies/${movie._id}`, { method: 'DELETE' }), `"${movie.title}" was deleted.`, `remove:${movie._id}`);
    if (done) { setDialog(null); reload(); }
  };

  const menuItems = (movie) => {
    const upcoming = movie.upcomingShowings ?? 0;
    const sales = movie.sales;
    return [
      movie.status === 'published' && { key: 'view', label: 'View on site', hint: 'Open the customer page in a new tab', icon: FiExternalLink, href: `/movie/${movie._id}` },
      { key: 'edit', label: 'Edit details', hint: 'Title, poster, trailer, length', icon: FiEdit2, onSelect: () => openEditor(movie, 'details') },
      { key: 'bookings', label: 'Bookings and revenue', hint: hasHistory(movie) ? `${pesos(revenueOf(movie))} from ${sales.bookings} ${sales.bookings === 1 ? 'booking' : 'bookings'}` : 'No bookings yet', icon: FiUsers, onSelect: () => openEditor(movie, 'bookings') },
      movie.status !== 'archived' && { key: 'schedule', label: 'Schedule showings', hint: 'Add times in any room', icon: FiCalendar, onSelect: () => onSchedule?.(movie._id) },
      movie.status === 'draft' && { key: 'publish', label: 'Publish', hint: 'Put it on sale. A released movie needs a showing first.', icon: FiUploadCloud, onSelect: () => publishRow(movie) },
      movie.status === 'archived' && { key: 'restore', label: 'Restore as draft', hint: 'Bring it back so you can schedule showings', icon: FiRotateCcw, onSelect: () => restoreRow(movie) },
      (movie.status === 'published' || upcoming > 0) && { key: 'off', label: 'Take off sale…', hint: 'Cancels coming showings, refunds, and archives', icon: FiArchive, divider: true, onSelect: () => askWithdraw(movie) },
      movie.status === 'draft' && upcoming === 0 && { key: 'archive', label: 'Archive', hint: 'Hide it and keep it for the records', icon: FiArchive, divider: true, onSelect: () => archiveRow(movie) },
      { key: 'delete', label: 'Delete…', hint: hasHistory(movie) ? 'Not possible: it has bookings' : 'Remove it for good', icon: FiTrash2, danger: true, divider: true, onSelect: () => askDelete(movie) },
    ];
  };

  const withdrawDialog = dialog?.kind === 'withdraw' && (
    <ConfirmDialog
      title="Take this movie off sale?" tone="danger" loading={dialog.loading} busy={busy && busyAction.startsWith('withdraw')}
      confirmLabel="Take off sale" onConfirm={dialog.plan ? confirmWithdraw : undefined} onClose={() => setDialog(null)} error={error}
    >
      <p><b>{dialog.movie.title}</b> will be archived and hidden from customers.</p>
      {dialog.loading && <p>Checking what this affects…</p>}
      {dialog.failed && <p>Something went wrong while checking. Close this and try again.</p>}
      {dialog.plan && (dialog.plan.showings === 0
        ? <p>It has no coming showings, so nobody is affected.</p>
        : (
          <ul className="movie-dialog-list">
            <li><b>{dialog.plan.showings}</b> coming {dialog.plan.showings === 1 ? 'showing is' : 'showings are'} cancelled</li>
            <li><b>{dialog.plan.bookings}</b> {dialog.plan.bookings === 1 ? 'booking is' : 'bookings are'} cancelled and refunded in full</li>
          </ul>
        ))}
    </ConfirmDialog>
  );

  const deleteDialog = dialog?.kind === 'delete' && (() => {
    const { movie } = dialog;
    if (hasHistory(movie)) {
      const sales = movie.sales;
      const needsOff = movie.status === 'published' || (movie.upcomingShowings ?? 0) > 0;
      return (
        <ConfirmDialog title="This movie can't be deleted" tone="info" cancelLabel="Close" onClose={() => setDialog(null)} error={error}
          extraAction={movie.status !== 'archived' && (
            <button type="button" className="movie-button movie-button-primary" disabled={busy}
              onClick={() => (needsOff ? askWithdraw(movie) : archiveRow(movie).then((ok) => ok && setDialog(null)))}>
              {needsOff ? 'Take off sale…' : 'Archive it'}
            </button>
          )}>
          <p><b>{movie.title}</b> has {sales.bookings} paid {sales.bookings === 1 ? 'booking' : 'bookings'} ({pesos(sales.revenue)}){sales.cancelled > 0 && <> and {sales.cancelled} cancelled</>}. It has to stay in the records, so customers keep their ticket history and your revenue stays correct.</p>
          <p>{movie.status === 'archived' ? 'It is already archived, so customers cannot see it.' : 'Archiving hides it from customers.'}</p>
        </ConfirmDialog>
      );
    }
    return (
      <ConfirmDialog title="Delete this movie?" tone="danger" busy={busy && busyAction.startsWith('remove')} confirmLabel="Delete movie" onConfirm={confirmDelete} onClose={() => setDialog(null)} error={error}>
        <p><b>{movie.title}</b> will be deleted for good. This cannot be undone.</p>
        <p>Old showings nobody booked are deleted with it. If it has coming showings, take it off sale first.</p>
      </ConfirmDialog>
    );
  })();

  return (
    <section className="movie-manager" aria-label="Movie management">
      <Feedback error={draft || dialog ? '' : error} notice={notice} />
      <div className="movie-manager-toolbar">
        <label className="movie-search"><span className="visually-hidden">Search movies</span><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies..." /></label>
        <label className="movie-filter"><span className="visually-hidden">Filter by genre</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">All genres</option>{genres.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className="movie-filter"><span className="visually-hidden">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="needs">Needs showings</option>{STATUSES.map((name) => <option key={name} value={name}>{name[0].toUpperCase() + name.slice(1)}</option>)}</select></label>
        <label className="movie-sort"><span className="visually-hidden">Sort movies</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="revenue">Top revenue</option></select></label>
        <span className="movie-count">{shown.length} {shown.length === 1 ? 'movie' : 'movies'} · <b>{pesos(totalRevenue)}</b> revenue</span>
        <button type="button" className="movie-button movie-button-primary movie-add" onClick={() => openEditor(null)}><span aria-hidden="true">＋</span> Add movie</button>
      </div>
      <div className="movie-table-shell">
        <table className="movie-table movie-table-2">
          <thead><tr><th>Poster</th><th>Movie</th><th>Status</th><th>Showings</th><th>Sales</th><th>Actions</th></tr></thead>
          <tbody>
            {shown.map((movie) => (
              <tr key={movie._id}>
                <td><img className="movie-table-poster" src={movie.posterUrl} alt="" /></td>
                <td>
                  <button type="button" className="movie-title-link" onClick={() => openEditor(movie)}><strong>{movie.title}</strong></button>
                  <small>{[dateYear(movie.releaseDate), movie.genre, movie.rating, durationLabel(movie.duration)].filter(Boolean).join(' · ')}</small>
                </td>
                <td><span className={`movie-status movie-status-${movie.status}`}>{movie.status}</span></td>
                <td>{(() => { const info = showingsSummary(movie); return <span className={`movie-showings movie-showings-${info.tone}`}>{info.text}{info.hint && <small>{info.hint}</small>}{info.action === 'schedule' && onSchedule && <button type="button" className="movie-schedule-link" onClick={() => onSchedule(movie._id)}>Schedule showings →</button>}{info.action === 'publish' && <button type="button" className="movie-schedule-link" disabled={busy} onClick={() => publishRow(movie)}>Publish now →</button>}</span>; })()}</td>
                <td><SalesCell movie={movie} /></td>
                <td><div className="movie-row-actions"><button type="button" className="movie-button movie-button-outline" onClick={() => openEditor(movie)}>Manage</button><RowMenu label={`More actions for ${movie.title}`} items={menuItems(movie)} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="movie-empty">{movies.length ? 'No movies match these filters.' : 'No movies yet. Add your first movie.'}</p>}
        <div className="movie-mobile-list">
          {shown.map((movie) => (
            <article className="movie-mobile-card" key={movie._id}>
              <img src={movie.posterUrl} alt="" />
              <div>
                <strong>{movie.title}</strong>
                <small>{dateYear(movie.releaseDate)} · {movie.genre} · {movie.rating}</small>
                <span>{durationLabel(movie.duration)} <span className={`movie-status movie-status-${movie.status}`}>{movie.status}</span></span>
                {(() => { const info = showingsSummary(movie); return info.tone === 'none' ? null : <span className={`movie-showings movie-showings-${info.tone}`}>{info.text}{info.action === 'schedule' && onSchedule && <button type="button" className="movie-schedule-link" onClick={() => onSchedule(movie._id)}>Schedule showings →</button>}{info.action === 'publish' && <button type="button" className="movie-schedule-link" disabled={busy} onClick={() => publishRow(movie)}>Publish now →</button>}</span>; })()}
                <SalesCell movie={movie} />
              </div>
              <div className="movie-mobile-actions">
                <button type="button" className="movie-button movie-button-outline" onClick={() => openEditor(movie)}>Manage</button>
                <RowMenu label={`More actions for ${movie.title}`} items={menuItems(movie)} />
              </div>
            </article>
          ))}
        </div>
        <div className="movie-table-footer">Showing {shown.length} of {movies.length} movies</div>
      </div>
      {draft && <MovieEditor key={`${draft._id || 'new'}`} draft={draft} setDraft={setDraft} movie={movies.find((item) => item._id === draft._id)} dirty={isDirty} startTab={startTab} onOpenShowing={openShowing} onChanged={changed} onClose={closeEditor} onSave={save} busy={busy} error={error} saved={saved} onSchedule={goSchedule} onPublishNow={publishNow} />}
      {withdrawDialog}
      {deleteDialog}
    </section>
  );
}
