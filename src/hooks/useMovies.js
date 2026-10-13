import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { loadMovieCatalog, loadMovieRecord } from '../utils/catalog';
const unavailable = 'The movie service is unavailable. Please try again.';

export function useMovies() {
  const { user } = useAuth();
  const explicitDemo = Boolean(import.meta.env.DEV && user?.isDemo);
  const [state, setState] = useState({ movies: [], loading: true, error: '', isDemo: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ movies: [], loading: true, error: '', isDemo: explicitDemo });
    loadMovieCatalog(api, explicitDemo, controller.signal).then(movies => {
      if (!controller.signal.aborted) setState({ movies, loading: false, error: '', isDemo: explicitDemo });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ movies: [], loading: false, error: unavailable, isDemo: false });
    });
    return () => controller.abort();
  }, [attempt, explicitDemo]);
  return { ...state, reload: () => setAttempt(value => value + 1) };
}
export function useMovie(id) {
  const { user } = useAuth();
  const explicitDemo = Boolean(import.meta.env.DEV && user?.isDemo);
  const [state, setState] = useState({ movie: null, loading: true, notFound: false, error: '', isDemo: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ movie: null, loading: true, notFound: false, error: '', isDemo: explicitDemo });
    loadMovieRecord(api, id, explicitDemo, controller.signal).then(movie => {
      if (!controller.signal.aborted) setState({ movie, loading: false, notFound: !movie, error: '', isDemo: explicitDemo });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ movie: null, loading: false, notFound: error.status === 404, error: error.status === 404 ? '' : unavailable, isDemo: false });
    });
    return () => controller.abort();
  }, [id, attempt, explicitDemo]);
  return { ...state, reload: () => setAttempt(value => value + 1) };
}
