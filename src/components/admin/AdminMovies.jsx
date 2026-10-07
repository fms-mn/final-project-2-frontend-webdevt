import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

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

export default function AdminMovies({ movies, reload }) {
  const { busy, busyAction, error, notice, clear, run } = useAdminAction();
  const [draft, setDraft] = useState(blankMovie);
  const [confirmRemove, setConfirmRemove] = useState('');
  const [query, setQuery] = useState('');

  const shown = movies.filter((movie) => movie.title.toLowerCase().includes(query.trim().toLowerCase()));
  const edit = (field) => (event) => setDraft({ ...draft, [field]: event.target.value });

  const save = async (event) => {
    event.preventDefault();
    const { _id, ...fields } = draft;
    const body = { ...fields, duration: Number(fields.duration) };
    const done = await run(async () => {
      if (_id) await api(`/admin/movies/${_id}`, { method: 'PATCH', body });
      else await api('/admin/movies', { method: 'POST', body });
    }, _id ? 'Movie updated' : 'Movie added', 'save');
    if (done) { setDraft(blankMovie); reload(); }
  };

  const remove = async (movie) => {
    if (confirmRemove !== movie._id) { setConfirmRemove(movie._id); return; }
    setConfirmRemove('');
    if (await run(() => api(`/movies/${movie._id}`, { method: 'DELETE' }), 'Movie removed', `remove:${movie._id}`)) reload();
  };

  return (
    <>
      <Feedback error={error} notice={notice} />
      <form className="admin-panel admin-form" onSubmit={save}>
        <h2>{draft._id ? 'Edit movie' : 'Add movie'}</h2>
        <label>Title<input required value={draft.title} onChange={edit('title')} /></label>
        <label>Synopsis<textarea required value={draft.synopsis} onChange={edit('synopsis')} /></label>
        <label>Genre<input required value={draft.genre} onChange={edit('genre')} placeholder="e.g. Sci-Fi" /></label>
        <label>Rating
          <select value={draft.rating} onChange={edit('rating')}>
            {RATINGS.map((rating) => <option key={rating} value={rating}>{rating}</option>)}
          </select>
        </label>
        <label>Poster URL<input required type="url" value={draft.posterUrl} onChange={edit('posterUrl')} placeholder="https://..." /></label>
        <label>Trailer link (optional)<input type="url" value={draft.trailerUrl} onChange={edit('trailerUrl')} placeholder="https://www.youtube.com/watch?v=..." /></label>
        <label>Duration (minutes)<input required type="number" min="1" step="1" value={draft.duration} onChange={edit('duration')} /></label>
        <label>Release date<input required type="date" value={draft.releaseDate} onChange={edit('releaseDate')} /></label>
        <label>Status
          <select value={draft.status} onChange={edit('status')}>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <p className="profile-help">Only published movies appear on the public website. A YouTube trailer link plays by itself (muted) in the home page banner when this is the featured movie, the newest one that is now showing. Clear the box to remove it. A movie with upcoming showings cannot be unpublished or change its length until they are cancelled.</p>
        <div className="admin-actions">
          <button className="btn btn-primary btn-small" type="submit" disabled={busy} aria-busy={busyAction === 'save'}><ActionPending pending={busyAction === 'save'}>{busyAction === 'save' ? 'Saving...' : 'Save movie'}</ActionPending></button>
          {draft._id && <button className="btn btn-secondary btn-small" type="button" onClick={() => { setDraft(blankMovie); clear(); }}>Cancel edit</button>}
        </div>
      </form>

      <div className="admin-panel admin-toolbar">
        <label className="admin-search">Search movies<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title" /></label>
        <span className="admin-count">{shown.length} of {movies.length}</span>
      </div>
      <div className="admin-list">
        {movies.length === 0 && <div className="admin-panel">No movies yet.</div>}
        {movies.length > 0 && shown.length === 0 && <div className="admin-panel">No movie matches that title.</div>}
        {shown.map((movie) => (
          <div className="admin-row" key={movie._id}>
            <div>
              <strong>{movie.title}</strong>
              <small>{movie.status} · {movie.genre} · {movie.rating} · {movie.duration} min</small>
            </div>
            <div className="admin-actions">
              {movie.status === 'published' && <Link className="btn btn-secondary btn-small" to={`/movie/${movie._id}`}>View</Link>}
              <button type="button" className="btn btn-secondary btn-small" onClick={() => { setDraft(toDraft(movie)); clear(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
              <button type="button" className="btn btn-danger btn-small" disabled={busy} aria-busy={busyAction === `remove:${movie._id}`} onClick={() => remove(movie)}>
                <ActionPending pending={busyAction === `remove:${movie._id}`}>{busyAction === `remove:${movie._id}` ? 'Removing...' : confirmRemove === movie._id ? 'Confirm remove' : 'Remove'}</ActionPending>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
