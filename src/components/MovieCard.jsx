import { Link } from 'react-router-dom';

export default function MovieCard({ movie }) {
  return (
    <Link to={`/movie/${movie._id}`} className="movie-card">
      <div className="movie-card-poster">
        <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
        <span className={`movie-card-badge ${movie.status === 'now_showing' ? 'badge-showing' : 'badge-coming'}`}>
          {movie.status === 'now_showing' ? 'Now Showing' : 'Coming Soon'}
        </span>
        <div className="movie-card-overlay">
          <span className="btn btn-primary btn-small">
            {movie.status === 'now_showing' ? 'Book Now' : 'View Details'}
          </span>
        </div>
      </div>
      <div className="movie-card-info">
        <h3>{movie.title}</h3>
        <div className="movie-card-meta">
          <span>⏱ {movie.duration}min</span>
          <span>🎬 {movie.genre[0]}</span>
          <span>⭐ {movie.rating}</span>
        </div>
        <div className="movie-card-price">₱{movie.price}</div>
      </div>
    </Link>
  );
}
