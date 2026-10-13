import { useEffect, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import { describeError } from '../../utils/adminTools';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

// The two cinema-wide scheduling rules: the gap between shows and when online booking closes.
export default function AdminRules({ standalone = false }) {
  const { busy, busyAction, error, notice, setError, run } = useAdminAction();
  const [rules, setRules] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api('/admin/settings', { signal: controller.signal })
      .then((loaded) => setRules({ turnaroundMinutes: String(loaded.turnaroundMinutes), salesCutoffMinutes: String(loaded.salesCutoffMinutes) }))
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [setError]);

  const save = (event) => {
    event.preventDefault();
    run(async () => {
      const saved = await api('/admin/settings', {
        method: 'PATCH',
        body: { turnaroundMinutes: Number(rules.turnaroundMinutes), salesCutoffMinutes: Number(rules.salesCutoffMinutes) },
      });
      setRules({ turnaroundMinutes: String(saved.turnaroundMinutes), salesCutoffMinutes: String(saved.salesCutoffMinutes) });
    }, 'Rules saved', 'rules');
  };
  const edit = (field) => (event) => setRules({ ...rules, [field]: event.target.value });

  const Wrapper = standalone ? 'section' : 'details';
  return (
    <Wrapper className={`admin-panel${standalone ? '' : ' admin-details'}`} aria-label="Scheduling rules">
      {standalone ? <h2>Scheduling rules</h2> : <summary><h2>Scheduling rules</h2></summary>}
      <Feedback error={error} notice={notice} />
      {rules && (
        <form className="admin-form admin-rules-form" onSubmit={save}>
          <label>Gap between shows (minutes)<input type="number" min="0" max="240" step="1" required value={rules.turnaroundMinutes} onChange={edit('turnaroundMinutes')} /></label>
          <label>Online booking closes before the start (minutes)<input type="number" min="0" max="1440" step="1" required value={rules.salesCutoffMinutes} onChange={edit('salesCutoffMinutes')} /></label>
          <p className="profile-help">
            The gap is the cleaning and changeover time an auditorium needs after each show. A showing that is too close to another is refused when it is scheduled or moved. Showings already scheduled are not changed.
            The booking cutoff applies to every showing straight away: customers no longer see a showing that has closed.
          </p>
          <div className="admin-actions">
            <button type="submit" className="btn btn-primary btn-small" disabled={busy} aria-busy={busyAction === 'rules'}><ActionPending pending={busyAction === 'rules'}>{busyAction === 'rules' ? 'Saving...' : 'Save rules'}</ActionPending></button>
          </div>
        </form>
      )}
    </Wrapper>
  );
}
