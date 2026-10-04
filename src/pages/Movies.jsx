import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import { FiSearch } from 'react-icons/fi';
import { listMovies } from '../data/catalog';

export default function Movies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const requestedStatus = searchParams.get('status');
  const filter = ['now_showing', 'coming_soon'].includes(requestedStatus)
    ? requestedStatus
    : 'all';

  const movies = listMovies({ status: filter === 'all' ? undefined : filter, search });

  return (
    <div className="movies-page fade-in">
      <h1>All Movies</h1>
      <p>Browse our complete catalog of movies</p>

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

      {movies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎬</div>
          <h3>No movies found</h3>
          <p>Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
