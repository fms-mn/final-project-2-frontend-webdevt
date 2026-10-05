import { useEffect, useState } from 'react';
import { api } from '../api';
import { normalizeMovie } from '../utils/movies';

// Loads every published movie once. Searching and filtering happen in the page.
export function useMovies() {
  const [state, setState] = useState({ movies: [], loading: true, error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '' }));

    api('/movies', { signal: controller.signal })
      .then((data) => setState({ movies: data.map((movie) => normalizeMovie(movie)), loading: false, error: '' }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({ movies: [], loading: false, error: error.message });
      });

    return () => controller.abort();
  }, [attempt]);

  return { ...state, reload: () => setAttempt((count) => count + 1) };
}

// Loads one published movie. `notFound` is true for a missing, draft or archived movie.
export function useMovie(id) {
  const [state, setState] = useState({ movie: null, loading: true, notFound: false, error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ movie: null, loading: true, notFound: false, error: '' });

    api(`/movies/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((data) => setState({ movie: normalizeMovie(data), loading: false, notFound: false, error: '' }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (error.status === 404) {
          setState({ movie: null, loading: false, notFound: true, error: '' });
        } else {
          setState({ movie: null, loading: false, notFound: false, error: error.message });
        }
      });

    return () => controller.abort();
  }, [id, attempt]);

  return { ...state, reload: () => setAttempt((count) => count + 1) };
}
