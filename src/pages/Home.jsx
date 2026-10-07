import { Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import HeroTrailer from '../components/HeroTrailer';
import { useMovies } from '../hooks/useMovies';

export default function Home() {
  const { movies, loading, error, reload, isDemo } = useMovies();
  const nowShowing = movies.filter((movie) => movie.status === 'now_showing');
  const comingSoon = movies.filter((movie) => movie.status === 'coming_soon');
  const featuredMovie = nowShowing[0] || comingSoon[0];

  return (
    <div className="fade-in">
      {isDemo && <p className="demo-catalog-notice">Preview catalog · Sample movies are shown while the database is unavailable.</p>}
      <section className="hero">
        {featuredMovie && (
          <img
            className="hero-backdrop"
            src={featuredMovie.backdropUrl || featuredMovie.posterUrl}
            alt=""
          />
        )}
        {featuredMovie?.trailerId && <HeroTrailer key={featuredMovie.trailerId} videoId={featuredMovie.trailerId} />}
        <div className="hero-content">
          <span className="hero-badge">
            {featuredMovie?.status === 'now_showing' ? 'Now showing at FILME' : 'Your next movie night starts here'}
          </span>
          <h1>{featuredMovie ? featuredMovie.title : 'Find your next movie at FILME'}</h1>
          {featuredMovie ? (
            <>
              <div className="hero-meta">
                <span>{featuredMovie.genre?.slice(0, 2).join(' · ')}</span>
                <span>{featuredMovie.duration} min</span>
                <span>{featuredMovie.rating}</span>
              </div>
              <p>{featuredMovie.description}</p>
            </>
          ) : (
            <p>Explore what is playing now and see what is coming to the big screen next.</p>
          )}
          <div className="hero-buttons">
            {featuredMovie && (
              <Link to={`/movie/${featuredMovie._id}`} className="btn btn-primary">
                View Movie Details
              </Link>
            )}
            <Link to="/movies" className="btn btn-secondary">Browse All Movies</Link>
          </div>
        </div>
      </section>

      <section className="section home-movie-section" aria-labelledby="now-showing-title">
            <div className="home-section-header">
              <div>
                <span className="home-section-eyebrow">On the big screen</span>
                <h2 id="now-showing-title">Now Showing</h2>
                <p>Choose a movie, pick your seats, and make tonight yours.</p>
              </div>
              <Link to="/movies?status=now_showing" className="home-section-link">View all movies →</Link>
            </div>
            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : error ? (
              <div className="empty-state">
                <h3>We couldn&apos;t load the movies</h3>
                <p>{error}</p>
                <button type="button" className="btn btn-primary" onClick={reload}>Try again</button>
              </div>
            ) : nowShowing.length > 0 ? (
              <div className="movies-grid">
                {nowShowing.slice(0, 4).map((movie) => (
                  <MovieCard key={movie._id} movie={movie} showShowtimes />
                ))}
              </div>
            ) : (
              <p className="home-empty">No movies are showing right now. Check back soon.</p>
            )}
      </section>

      <section className="section home-movie-section home-coming-soon" aria-labelledby="coming-soon-title">
            <div className="home-section-header">
              <div>
                <span className="home-section-eyebrow">Worth the wait</span>
                <h2 id="coming-soon-title">Coming Soon</h2>
                <p>See what is headed to FILME next.</p>
              </div>
              <Link to="/movies?status=coming_soon" className="home-section-link">Explore upcoming →</Link>
            </div>
            {loading || error ? null : comingSoon.length > 0 ? (
              <div className="movies-grid">
                {comingSoon.slice(0, 4).map((movie) => (
                  <MovieCard key={movie._id} movie={movie} />
                ))}
              </div>
            ) : (
              <p className="home-empty">Upcoming movies will appear here soon.</p>
            )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Why FILME?</h2>
          <p>Your premium movie booking destination</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Pick Your Seats</h3>
            <p>Choose the perfect spot with our interactive seat map.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Booking</h3>
            <p>Book your tickets in seconds with a simple checkout.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>More to Discover</h3>
            <p>Find your next favorite movie, from current hits to upcoming releases.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
