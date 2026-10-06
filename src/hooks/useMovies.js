import { useEffect, useState } from 'react';
import { api } from '../api';
import { normalizeMovie } from '../utils/movies';
import { demoMovies, getDemoMovie } from '../data/demoMovies';

const canUseDemoCatalog = (error) => import.meta.env.DEV && (error.status === 0 || error.status >= 500);
const normalizeAll = (movies) => movies.map((movie) => normalizeMovie(movie));

// Loads every published movie once. Searching and filtering happen in the page.
export function useMovies() {
  const [state, setState] = useState({ movies: [], loading: true, error: '', isDemo: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '' }));

    api('/movies', { signal: controller.signal })
      .then((data) => {
        const isDemo = import.meta.env.DEV && data.length === 0;
        setState({ movies: normalizeAll(isDemo ? demoMovies : data), loading: false, error: '', isDemo });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (canUseDemoCatalog(error)) {
          setState({ movies: normalizeAll(demoMovies), loading: false, error: '', isDemo: true });
        } else {
          setState({ movies: [], loading: false, error: error.message, isDemo: false });
        }
      });

    return () => controller.abort();
  }, [attempt]);

  return { ...state, reload: () => setAttempt((count) => count + 1) };
}

// Loads one published movie. `notFound` is true for a missing, draft or archived movie.
export function useMovie(id) {
  const [state, setState] = useState({ movie: null, loading: true, notFound: false, error: '', isDemo: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ movie: null, loading: true, notFound: false, error: '', isDemo: false });

    api(`/movies/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((data) => setState({ movie: normalizeMovie(data), loading: false, notFound: false, error: '', isDemo: false }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        const demoMovie = import.meta.env.DEV && getDemoMovie(id);
        if (demoMovie && (error.status === 404 || canUseDemoCatalog(error))) {
          setState({ movie: normalizeMovie(demoMovie), loading: false, notFound: false, error: '', isDemo: true });
        } else if (error.status === 404) {
          setState({ movie: null, loading: false, notFound: true, error: '', isDemo: false });
        } else {
          setState({ movie: null, loading: false, notFound: false, error: error.message, isDemo: false });
        }
      });

    return () => controller.abort();
  }, [id, attempt]);

  return { ...state, reload: () => setAttempt((count) => count + 1) };
}
