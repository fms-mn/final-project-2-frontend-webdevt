import { useEffect, useState } from 'react';
import { api } from '../../api';
import { describeError } from '../../utils/adminTools';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';
import './adminGenres.css';

export default function AdminGenres() {
  const [genres, setGenres] = useState(null);
  const [name, setName] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { busy, error, notice, setError, run } = useAdminAction();
  useEffect(() => {
    const controller = new AbortController();
    api('/admin/settings', { signal: controller.signal })
      .then(settings => { setGenres(settings.genres); setError(''); })
      .catch(err => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [attempt, setError]);

  const save = (next, message) => run(async () => {
    const saved = await api('/admin/settings', { method: 'PATCH', body: { genres: next } });
    setGenres(saved.genres);
  }, message);
  const add = async event => {
    event.preventDefault();
    const genre = name.trim();
    if (!genre || genre.length > 40 || /[,/;|\r\n]/.test(genre)) { setError('Enter one genre, up to 40 characters, without separators.'); return; }
    if (genres.some(item => item.toLowerCase() === genre.toLowerCase())) { setError('That genre already exists.'); return; }
    if (await save([...genres, genre], `${genre} added`)) setName('');
  };

  return <section className="admin-panel admin-genres" aria-label="Movie genres">
    <h2>Movie genres</h2>
    <p className="profile-help">Manage the genres available when adding or editing a movie. Deleting a genre keeps it on movies already using it.</p>
    <Feedback error={error} notice={notice} />
    {genres === null ? error
      ? <button type="button" className="btn btn-secondary btn-small" onClick={() => setAttempt(value => value + 1)}>Retry loading genres</button>
      : <p role="status">Loading genres…</p>
      : <>
        <form className="admin-genre-add" onSubmit={add}>
          <label>New genre<input name="newGenre" required maxLength={40} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label>
          <button type="submit" className="btn btn-primary btn-small" disabled={busy || genres.length >= 100}>Add genre</button>
        </form>
        {genres.length === 0 && <p>No genres yet. Add one to make it available in the movie editor.</p>}
        <ul className="admin-genre-list">{genres.map(genre => <li key={genre}>
          <span>{genre}</span>
          <button type="button" className="btn btn-secondary btn-small" aria-label={`Delete ${genre} genre`} disabled={busy}
            onClick={() => save(genres.filter(item => item !== genre), `${genre} deleted`)}>Delete</button>
        </li>)}</ul>
      </>}
  </section>;
}
