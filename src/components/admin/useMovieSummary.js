import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { describeError } from '../../utils/adminTools';

// One movie's sales and showing counts, loaded when its panel opens and reloadable on demand.
export default function useMovieSummary(movieId) {
  const [state, setState] = useState({ summary: null, error: '', loading: Boolean(movieId) });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!movieId) return undefined;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '' }));
    api(`/admin/movies/${movieId}/summary`, { signal: controller.signal })
      .then((summary) => setState({ summary, error: '', loading: false }))
      .catch((err) => { if (err.name !== 'AbortError') setState({ summary: null, error: describeError(err), loading: false }); });
    return () => controller.abort();
  }, [movieId, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { ...state, reload };
}
