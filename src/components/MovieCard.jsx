import { Link } from 'react-router-dom';
import { listShowtimes } from '../data/demoSchedule';

export default function MovieCard({ movie, showShowtimes = false }) {
  const isShowing = movie.status === 'now_showing';

  return (
    <Link to={`/movie/${movie._id}`} className="movie-card">
      <div className="movie-card-poster">
        <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
        <span className={`movie-card-badge ${isShowing ? 'badge-showing' : 'badge-coming'}`}>
          {isShowing ? 'Now Showing' : 'Coming Soon'}
        </span>
        <div className="movie-card-overlay">
          <span className="btn btn-primary btn-small">
            {isShowing ? 'Book Now' : 'View Details'}
          </span>
        </div>
      </div>
      <div className="movie-card-info">
        <h3>{movie.title}</h3>
        <div className="movie-card-meta">
          <span>⏱ {movie.duration}min</span>
          {movie.genre[0] && <span>🎬 {movie.genre[0]}</span>}
          <span>{movie.rating}</span>
        </div>
        {isShowing ? (
          <div className="movie-card-price">Choose a showing →</div>
        ) : (
          <div className="movie-card-release">
            In cinemas {new Date(movie.releaseDate).toLocaleDateString('en-PH', {
              month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
            })}
          </div>
        )}
        {showShowtimes && isShowing && (
          <div className="movie-card-showtimes" aria-label="Daily showtimes">
            {listShowtimes(movie._id).map((slot) => <span key={slot.id}>{slot.time}</span>)}
          </div>
        )}
      </div>
    </Link>
  );
}
