import { useEffect, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import { describeError } from '../../utils/adminTools';
import { shortDate } from '../../utils/manila';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

// The rule that archives released movies which have had no showings for a while, so the movie
// list does not fill up with "No showings" titles. The admin sets the number of days (or turns it
// off), and can see which movies qualify right now before anything is archived.
export default function AdminArchiveRule({ onChanged }) {
  const { busy, busyAction, error, notice, setNotice, setError, run } = useAdminAction();
  const [saved, setSaved] = useState(null); // the days in force; 0 = off
  const [on, setOn] = useState(true);
  const [days, setDays] = useState('30');
  const [preview, setPreview] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api('/admin/settings', { signal: controller.signal }),
      api('/admin/movies/auto-archive', { signal: controller.signal }),
    ])
      .then(([rules, candidates]) => {
        setSaved(rules.autoArchiveDays);
        setOn(rules.autoArchiveDays > 0);
        if (rules.autoArchiveDays > 0) setDays(String(rules.autoArchiveDays));
        setPreview(candidates);
      })
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [revision, setError]);

  const wanted = on ? Number(days) : 0;
  const changed = saved !== null && wanted !== saved;

  const save = (event) => {
    event.preventDefault();
    run(async () => {
      await api('/admin/settings', { method: 'PATCH', body: { autoArchiveDays: wanted } });
      setRevision((value) => value + 1);
    }, wanted ? `Saved. Quiet movies are archived after ${wanted} days.` : 'Saved. Movies are no longer archived automatically.', 'save');
  };

  const archiveNow = async () => {
    let count = 0;
    const done = await run(async () => {
      const result = await api('/admin/movies/auto-archive', { method: 'POST' });
      count = result.archived.length;
    }, '', 'now');
    if (done) {
      setRevision((value) => value + 1);
      setNotice(`${count} ${count === 1 ? 'movie was' : 'movies were'} archived.`);
      onChanged?.(`${count} ${count === 1 ? 'movie was' : 'movies were'} archived.`);
    }
  };

  return (
    <section className="admin-panel" aria-label="Archive quiet movies">
      <h2>Archive quiet movies</h2>
      <Feedback error={error} notice={notice} noticeTitle="Auto-archive updated" onDismissNotice={() => setNotice('')} />
      <p className="profile-help">
        A movie that has been released but has had <b>no showings for a while</b> is archived by itself, so the list does not fill up with &quot;No showings&quot; titles.
        Customers stop seeing it. A movie with a showing still to come is never archived, and editing a movie or publishing it again restarts its clock.
        You can always bring one back by setting it to Published.
      </p>
      <form className="archive-rule-form" onSubmit={save}>
        <label className="admin-check"><input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} /> Archive quiet movies automatically</label>
        <label className="archive-rule-days">After this many days with no showings
          <input type="number" min="1" max="3650" step="1" required={on} disabled={!on} value={days} onChange={(event) => setDays(event.target.value)} />
        </label>
        <div className="admin-actions">
          <button type="submit" className="btn btn-primary btn-small" disabled={busy || !changed} aria-busy={busyAction === 'save'}>
            <ActionPending pending={busyAction === 'save'}>{busyAction === 'save' ? 'Saving...' : 'Save'}</ActionPending>
          </button>
        </div>
      </form>

      {preview && (
        <div className="archive-preview" aria-live="polite">
          {changed && <p className="profile-help">This list uses the saved setting. Save first to see it for the new number.</p>}
          {!preview.enabled ? (
            <p>The rule is off. Quiet movies stay in the list until you archive them yourself.</p>
          ) : preview.movies.length === 0 ? (
            <p>No movie qualifies right now.</p>
          ) : (
            <>
              <p><b>{preview.movies.length}</b> {preview.movies.length === 1 ? 'movie qualifies' : 'movies qualify'} right now and will be archived within the hour:</p>
              <ul>
                {preview.movies.map((movie) => <li key={movie._id}><b>{movie.title}</b> <span>quiet since {shortDate(movie.quietSince)}</span></li>)}
              </ul>
              <div className="admin-actions">
                <button type="button" className="btn btn-secondary btn-small" disabled={busy} aria-busy={busyAction === 'now'} onClick={archiveNow}>
                  <ActionPending pending={busyAction === 'now'}>{busyAction === 'now' ? 'Archiving...' : `Archive ${preview.movies.length === 1 ? 'it' : 'them'} now`}</ActionPending>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
