import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

export default function Home() {
  const { API_URL } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const res = await axios.get(`${API_URL}/movies?status=now_showing`);
      setMovies(res.data.slice(0, 4));
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${60 + Math.random() * 40}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${10 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            ✨ Premium Cinema Experience
          </div>
          <h1>
            Book Your Next <br />
            <span className="gradient-text">Movie Adventure</span>
          </h1>
          <p>
            Experience the magic of cinema with FILME. Browse the latest blockbusters,
            pick your perfect seats, and enjoy an unforgettable movie night.
          </p>
          <div className="hero-buttons">
            <Link to="/movies" className="btn btn-primary">
              🎬 Browse Movies
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Now Showing Section */}
      <section className="section">
        <div className="section-header">
          <h2>🔥 Now Showing</h2>
          <p>Don&apos;t miss out on this week&apos;s hottest movies</p>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : (
          <div className="movies-grid">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/movies" className="btn btn-secondary">
            View All Movies →
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="section">
        <div className="section-header">
          <h2>Why FILME?</h2>
          <p>Your premium movie booking destination</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Pick Your Seats</h3>
            <p>Interactive seat map lets you choose the perfect spot for the best viewing experience.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Booking</h3>
            <p>Book your tickets in seconds with our streamlined booking process. No hassle, no wait.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>Latest Blockbusters</h3>
            <p>Stay up to date with the newest releases and upcoming movies you won&apos;t want to miss.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Reliable</h3>
            <p>Your bookings and personal data are protected with industry-standard security.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
