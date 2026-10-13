import { useRef, useState } from 'react';
import { FiClock, FiFilm, FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { displayClock } from '../utils/manila';
import { listShowtimes } from '../data/demoSchedule';
import { demoHeroMediaFor } from '../data/demoHeroMedia';
import { useHoverPreview } from '../hooks/useHoverPreview';
import { trailerVideoId } from '../utils/trailer';
import { previewMediaFor } from '../utils/trailerPreview';
import MovieTrailerPreview from './MovieTrailerPreview';

// `previewOnHover` opens a floating trailer panel beside the card while the mouse rests on it,
// or in the middle of the screen while a finger holds the card (release to close).
// A movie without a trailer gets the same panel with a "trailer coming soon" note.
export default function MovieCard({ movie, showShowtimes = false, previewOnHover = false, refined = false }) {
  const isShowing = movie.status === 'now_showing';
  const media = previewOnHover ? previewMediaFor(trailerVideoId(movie), demoHeroMediaFor(movie._id)) : null;
  const preview = useHoverPreview({ enabled: previewOnHover });
  const cardRef = useRef(null);
  const [failedPoster, setFailedPoster] = useState('');
  const release = new Date(movie.releaseDate || NaN);
  const releaseLabel = Number.isNaN(release.getTime()) ? '' : release.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  return (
    <Link ref={cardRef} to={`/movie/${movie._id}`} state={{ promptAccount: true, browsingPage: 'movies' }} className={`movie-card${refined ? ' movie-card-refined' : ''}${preview.visible ? ' is-previewing' : ''}`} aria-label={refined ? `${movie.title}: ${isShowing ? 'Choose a showing' : 'View details'}` : undefined} {...(refined ? {} : preview.handlers)}>
      <div className="movie-card-poster" {...(refined ? preview.handlers : {})}>
        {refined && (!movie.posterUrl || failedPoster === movie.posterUrl) ? (
          <div className="movie-poster-fallback" aria-label="Poster unavailable">FILME</div>
        ) : (
          <img src={movie.posterUrl} alt={movie.title} loading="lazy" onError={refined ? () => setFailedPoster(movie.posterUrl) : undefined} />
        )}
        <span className={`movie-card-badge ${isShowing ? 'badge-showing' : 'badge-coming'}`}>
          {refined && <i aria-hidden="true" />}{isShowing ? 'Now Showing' : 'Coming Soon'}
        </span>
        {refined && (
          <>
            <span className="movie-poster-rating">{movie.rating}</span>
            <span className="movie-poster-title" aria-hidden="true"><span>{movie.title}</span></span>
          </>
        )}
        {!refined && <div className="movie-card-overlay">
          <span className="btn btn-primary btn-small">
            {isShowing ? 'Book Now' : 'View Details'}
          </span>
        </div>}
      </div>
      <div className="movie-card-info">
        <h3>{movie.title}</h3>
        <div className="movie-card-meta">
          {refined ? (
            <>
              {movie.duration > 0 && <span><FiClock aria-hidden="true" />{movie.duration} min</span>}
              {movie.genre[0] && <span className="movie-refined-genre"><FiFilm aria-hidden="true" />{movie.genre[0]}</span>}
            </>
          ) : (
            <><span>⏱ {movie.duration}min</span>{movie.genre[0] && <span>🎬 {movie.genre[0]}</span>}<span>{movie.rating}</span></>
          )}
        </div>
        {isShowing ? (
          <div className="movie-card-price">Choose a showing {refined ? <FiArrowRight aria-hidden="true" /> : '→'}</div>
        ) : refined ? (
          <div className="movie-coming-action">
            {releaseLabel && <small>In cinemas {releaseLabel}</small>}
            <span className="movie-card-price">View details <FiArrowRight aria-hidden="true" /></span>
          </div>
        ) : (
          <div className="movie-card-release">
            In cinemas {new Date(movie.releaseDate).toLocaleDateString('en-PH', {
              month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
            })}
          </div>
        )}
        {showShowtimes && isShowing && (
          <div className="movie-card-showtimes" aria-label="Daily showtimes">
            {listShowtimes(movie._id).map((slot) => <span key={slot.id}>{displayClock(slot.time)}</span>)}
          </div>
        )}
      </div>
      {previewOnHover && preview.mounted && (
        <MovieTrailerPreview media={media} movie={movie} anchorRef={cardRef} visible={preview.visible} mode={preview.mode} />
      )}
    </Link>
  );
}
