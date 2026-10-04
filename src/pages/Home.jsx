import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function Home() {
  const { API_URL } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    axios.get(`${API_URL}/movies`)
      .then((res) => {
        if (active) setMovies(res.data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [API_URL, reloadKey]);

  const nowShowing = movies.filter((movie) => movie.status === 'now_showing');
  const comingSoon = movies.filter((movie) => movie.status === 'coming_soon');
  const featuredMovie = nowShowing[0] || comingSoon[0];

  const retry = () => {
    setError(false);
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="fade-in">
      <section className="hero">
        {featuredMovie && (
          <img
            className="hero-backdrop"
            src={featuredMovie.backdropUrl || featuredMovie.posterUrl}
            alt=""
          />
        )}
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

      {error ? (
        <section className="section home-movies-error" aria-live="polite">
          <h2>Movies are unavailable right now</h2>
          <p>Check your connection and try again.</p>
          <button type="button" className="btn btn-primary" onClick={retry}>Try Again</button>
        </section>
      ) : (
        <>
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
            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : comingSoon.length > 0 ? (
              <div className="movies-grid">
                {comingSoon.slice(0, 4).map((movie) => (
                  <MovieCard key={movie._id} movie={movie} />
                ))}
              </div>
            ) : (
              <p className="home-empty">Upcoming movies will appear here soon.</p>
            )}
          </section>
        </>
      )}

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
