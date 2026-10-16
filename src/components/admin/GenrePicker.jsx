import { MOVIE_GENRES, splitGenres } from '../../utils/genres';
import './genrePicker.css';

export default function GenrePicker({ value, existing, onChange, error }) {
  const selected = splitGenres(value);
  const options = [...MOVIE_GENRES, ...splitGenres([existing, value]).filter(genre => !MOVIE_GENRES.includes(genre))];
  const toggle = genre => onChange((selected.includes(genre) ? selected.filter(item => item !== genre) : [...selected, genre]).join(', '));
  return <fieldset className="movie-genre-picker" aria-describedby={error ? 'movie-genre-error' : undefined} aria-invalid={Boolean(error)}>
    <legend>Genre <em>*</em></legend>
    <div className="movie-genre-options">
      {options.map(genre => <label className="movie-genre-option" key={genre}>
        <input type="checkbox" name="genre" value={genre} checked={selected.includes(genre)} onChange={() => toggle(genre)} />
        <span>{genre}</span>
      </label>)}
    </div>
    {error && <span className="movie-field-message" role="alert" id="movie-genre-error">{error}</span>}
  </fieldset>;
}
