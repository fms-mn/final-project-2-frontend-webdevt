import { useId, useState } from 'react';
import { FiClock, FiFilm } from 'react-icons/fi';

export default function MovieCardMetadata({ movie, refined }) {
  const [expanded, setExpanded] = useState(false);
  const genresId = useId();
  const genres = movie.genre || [];
  const visible = expanded ? genres : genres.slice(0, 2);
  const stop = event => event.stopPropagation();
  return <div className="movie-card-meta">
    {movie.duration > 0 && <div className="movie-card-runtime"><FiClock aria-hidden="true" /><span>{movie.duration} min</span></div>}
    {genres.length > 0 && <div className="movie-card-genres" id={genresId}>
      {visible.map((genre, index) => <span className="movie-refined-genre movie-genre-badge" key={`${index}-${genre}`}><FiFilm aria-hidden="true" /><span>{genre}</span></span>)}
      {genres.length > 2 && <button type="button" className="movie-genres-toggle" aria-expanded={expanded} aria-controls={genresId}
        onPointerDown={stop} onPointerUp={stop} onPointerMove={stop} onPointerEnter={stop} onKeyDown={stop} onKeyUp={stop}
        onClick={event => { event.preventDefault(); event.stopPropagation(); setExpanded(value => !value); }}>
        {expanded ? 'Show less' : `+${genres.length - 2} more`}
      </button>}
    </div>}
    {!refined && movie.rating && <span className="movie-card-classification">{movie.rating}</span>}
  </div>;
}
