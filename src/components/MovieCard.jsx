import { useRef, useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { displayClock } from '../utils/manila';
import { listShowtimes } from '../data/demoSchedule';
import { demoHeroMediaFor } from '../data/demoHeroMedia';
import { useHoverPreview } from '../hooks/useHoverPreview';
import { trailerVideoId } from '../utils/trailer';
import { previewMediaFor } from '../utils/trailerPreview';
import MovieTrailerPreview from './MovieTrailerPreview';
import MovieCardMetadata from './MovieCardMetadata';
import './movieCard.css';

// `previewOnHover` opens a floating trailer panel beside the card while the mouse rests on it,
// or in the middle of the screen while a finger holds the card (release to close).
// A movie without a trailer gets the same panel with a "trailer coming soon" note.
export default function MovieCard({ movie, showShowtimes = false, previewOnHover = false, refined = false }) {
  const isShowing = movie.status === 'now_showing';
  const notShowing = movie.status === 'not_showing'; // released, but nothing to book right now
  const presale = movie.status === 'coming_soon' && (movie.upcomingShowings ?? 0) > 0; // advance tickets
  const media = previewOnHover ? previewMediaFor(trailerVideoId(movie), demoHeroMediaFor(movie._id)) : null;
  const preview = useHoverPreview({ enabled: previewOnHover });
  const cardRef = useRef(null);
  const [failedPoster, setFailedPoster] = useState('');
  const release = new Date(movie.releaseDate || NaN);
  const releaseLabel = Number.isNaN(release.getTime()) ? '' : release.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  return (
    <article ref={cardRef} className={`movie-card${refined ? ' movie-card-refined' : ''}${preview.visible ? ' is-previewing' : ''}`} {...(refined ? {} : { ...preview.handlers, onClickCapture: event => { if (!event.target.closest('.movie-genres-toggle')) preview.handlers.onClickCapture(event); } })}>
      <Link className="movie-card-navigation" to={`/movie/${movie._id}`} state={{ browsingPage: 'movies' }} aria-label={`${movie.title}: ${isShowing || presale ? 'Choose a showing' : notShowing ? 'No showings right now' : 'View details'}`} />
      <div className="movie-card-poster" {...(refined ? preview.handlers : {})}>
        <Link className="movie-card-poster-link" to={`/movie/${movie._id}`} state={{ browsingPage: 'movies' }} tabIndex={-1} aria-hidden="true">
        {refined && (!movie.posterUrl || failedPoster === movie.posterUrl) ? (
          <div className="movie-poster-fallback" aria-label="Poster unavailable">FILME</div>
        ) : (
          <img src={movie.posterUrl} alt={movie.title} loading="lazy" onError={refined ? () => setFailedPoster(movie.posterUrl) : undefined} />
        )}
        <span className={`movie-card-badge ${isShowing ? 'badge-showing' : notShowing ? 'badge-none' : 'badge-coming'}`}>
          {refined && <i aria-hidden="true" />}{isShowing ? 'Now Showing' : notShowing ? 'No Showings' : 'Coming Soon'}
        </span>
        {refined && <span className="movie-poster-rating">{movie.rating}</span>}
        {!refined && <div className="movie-card-overlay">
          <span className="btn btn-primary btn-small">
            {presale ? 'Book advance tickets' : isShowing ? 'Book Now' : 'View Details'}
          </span>
        </div>}
        </Link>
      </div>
      <div className="movie-card-info">
        <h3>{movie.title}</h3>
        <MovieCardMetadata key={movie._id} movie={movie} refined={refined} />
        {isShowing ? (
          <Link className="movie-card-price" to={`/movie/${movie._id}`} state={{ browsingPage: 'movies' }}>
            {movie.price != null && <small className="movie-card-from">From ₱{movie.price.toLocaleString('en-PH')} · </small>}
            Choose a showing {refined ? <FiArrowRight aria-hidden="true" /> : '→'}
          </Link>
        ) : refined ? (
          <div className="movie-coming-action">
            {notShowing ? <small>No showings right now</small> : releaseLabel && <small>In cinemas {releaseLabel}{presale ? ' · Tickets on sale' : ''}</small>}
            <Link className="movie-card-price" to={`/movie/${movie._id}`} state={{ browsingPage: 'movies' }}>{presale ? 'Book advance tickets' : 'View details'} <FiArrowRight aria-hidden="true" /></Link>
          </div>
        ) : notShowing ? (
          <div className="movie-card-release">No showings right now</div>
        ) : (
          <div className="movie-card-release">
            In cinemas {new Date(movie.releaseDate).toLocaleDateString('en-PH', {
              month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
            })}{presale ? ' · Tickets on sale' : ''}
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
    </article>
  );
}
