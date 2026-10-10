import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { FiSearch } from 'react-icons/fi';
import { useMovies } from '../hooks/useMovies';

export default function Movies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('all');
  const requestedStatus = searchParams.get('status');
  const filter = ['now_showing', 'coming_soon'].includes(requestedStatus)
    ? requestedStatus
    : 'all';

  const { movies: allMovies, loading, error, reload, isDemo } = useMovies();
  const query = search.trim().toLowerCase();
  const genres = [...new Set(allMovies.flatMap(movie => movie.genre))].sort();
  const movies = allMovies.filter((movie) =>
    (filter === 'all' || movie.status === filter) &&
    (genre === 'all' || movie.genre.includes(genre)) &&
    (!query || movie.title.toLowerCase().includes(query))
  );

  return (
    <div className="movies-page fade-in">
      <span className="eyebrow">The lineup</span>
      <h1>All movies</h1>
      <p>Find your film, then pick a showing and seats.</p>
      {isDemo && <p className="demo-catalog-notice">Preview catalog · Sample movies are shown while the database is unavailable.</p>}

      <div className="search-bar">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="movies-filters">
        {[
          { key: 'all', label: 'All Movies' },
          { key: 'now_showing', label: 'Now Showing' },
          { key: 'coming_soon', label: 'Coming Soon' },
        ].map((f) => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setSearchParams(f.key === 'all' ? {} : { status: f.key })}
          >
            {f.label}
          </button>
        ))}
      </div>
      {genres.length > 1 && <div className="genre-filters" aria-label="Filter by genre">
        {['all', ...genres].map(item => <button key={item} type="button" className={`filter-btn ${genre === item ? 'active' : ''}`} aria-pressed={genre === item} onClick={() => setGenre(item)}>{item === 'all' ? 'All genres' : item}</button>)}
      </div>}

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎬</div>
          <h3>We couldn&apos;t load the movies</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={reload}>Try again</button>
        </div>
      ) : movies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎬</div>
          <h3>No movies found</h3>
          <p>Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} previewOnHover />
          ))}
        </div>
      )}
    </div>
  );
}
