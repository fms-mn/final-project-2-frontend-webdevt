import { useEffect, useState } from 'react';
import { api } from '../../api';
import { splitGenres } from '../../utils/genres';
import './genrePicker.css';

export default function GenrePicker({ value, existing, onChange, error }) {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    api('/admin/settings', { signal: controller.signal })
      .then(settings => { setGenres(settings.genres); setLoading(false); })
      .catch(err => { if (err.name !== 'AbortError') { setLoadError(true); setLoading(false); } });
    return () => controller.abort();
  }, [attempt]);
  const selected = splitGenres(value);
  const options = [...genres, ...splitGenres([existing, value]).filter(genre => !genres.some(item => item.toLowerCase() === genre.toLowerCase()))];
  const toggle = genre => onChange((selected.some(item => item.toLowerCase() === genre.toLowerCase())
    ? selected.filter(item => item.toLowerCase() !== genre.toLowerCase()) : [...selected, genre]).join(', '));
  return <fieldset className="movie-genre-picker" aria-describedby={error ? 'movie-genre-error' : undefined} aria-invalid={Boolean(error)}>
    <legend>Genre <em>*</em></legend>
    {loading && <span role="status">Loading genres…</span>}
    {loadError && <span role="alert">Couldn’t load genres. <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></span>}
    {!loading && !loadError && options.length === 0 && <span>Add genres in admin Settings first.</span>}
    <div className="movie-genre-options">
      {options.map(genre => <label className="movie-genre-option" key={genre}>
        <input type="checkbox" name="genre" value={genre} checked={selected.some(item => item.toLowerCase() === genre.toLowerCase())} onChange={() => toggle(genre)} />
        <span>{genre}</span>
      </label>)}
    </div>
    {error && <span className="movie-field-message" role="alert" id="movie-genre-error">{error}</span>}
  </fieldset>;
}
