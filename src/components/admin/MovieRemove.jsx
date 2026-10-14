import { useState } from 'react';
import { api } from '../../api';
import useAdminAction from './useAdminAction';

// Taking a movie off sale or deleting it, with plain words about what each does. Nothing happens
// until the admin confirms, and a delete the server refuses (the movie has showings history)
// points to the safe alternative instead of just failing.
export default function MovieRemove({ movie, onChanged }) {
  const { busy, busyAction, error, run, clear } = useAdminAction();
  const [plan, setPlan] = useState(null); // { showings, bookings } while the admin decides
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [blocked, setBlocked] = useState(false); // the server refused to delete

  const planOffSale = async () => {
    clear(); setConfirmDelete(false);
    let result = null;
    const done = await run(async () => { result = await api(`/admin/movies/${movie._id}/withdraw`, { method: 'POST', body: { dryRun: true } }); }, '', 'plan');
    if (done) setPlan({ showings: result.showings, bookings: result.bookings });
  };
  const offSale = async () => {
    const counts = plan;
    const done = await run(() => api(`/admin/movies/${movie._id}/withdraw`, { method: 'POST', body: {} }), '', 'withdraw');
    if (done) onChanged(`"${movie.title}" is off sale and archived. ${counts.showings} ${counts.showings === 1 ? 'showing' : 'showings'} and ${counts.bookings} ${counts.bookings === 1 ? 'booking' : 'bookings'} cancelled.`);
  };
  const deleteIt = async () => {
    const done = await run(() => api(`/movies/${movie._id}`, { method: 'DELETE' }), '', 'delete');
    if (done) { onChanged(`"${movie.title}" was deleted.`); return; }
    setConfirmDelete(false); setBlocked(true);
  };

  return (
    <section className="movie-section movie-danger" aria-labelledby="movie-sec-remove">
      <h3 id="movie-sec-remove">Remove this movie</h3>
      {error && !blocked && <p className="movie-field-error" role="alert">{error}</p>}

      {movie.status !== 'archived' && (
        <div className="movie-danger-option">
          <b>Take off sale</b>
          <p>Hides it from customers and archives it. Its upcoming showings are cancelled, and anyone who booked is refunded.</p>
          {plan ? (
            <div className="movie-withdraw-confirm" role="alert">
              <p>{plan.showings === 0 ? 'It has no upcoming showings, so nobody is affected.' : `This cancels ${plan.showings} ${plan.showings === 1 ? 'showing' : 'showings'} and ${plan.bookings} ${plan.bookings === 1 ? 'booking' : 'bookings'}.`}</p>
              <div className="movie-danger-actions">
                <button type="button" className="movie-button movie-button-primary" disabled={busy} onClick={offSale}>{busyAction === 'withdraw' ? 'Working…' : 'Yes, take it off sale'}</button>
                <button type="button" className="movie-button movie-button-outline" disabled={busy} onClick={() => setPlan(null)}>Keep it</button>
              </div>
            </div>
          ) : <button type="button" className="movie-button movie-button-outline" disabled={busy} onClick={planOffSale}>{busyAction === 'plan' ? 'Checking…' : 'Take off sale…'}</button>}
        </div>
      )}

      <div className="movie-danger-option">
        <b>Delete permanently</b>
        <p>Erases the movie and any old showings nobody booked. It stays if customers have booked tickets for it, so nobody loses their ticket history. If it has coming showings, take it off sale first.</p>
        {blocked && (
          <p className="movie-field-error" role="alert">
            {error || 'It cannot be deleted.'}{movie.status === 'archived' ? ' It is already archived, so customers cannot see it.' : ''}
          </p>
        )}
        {confirmDelete ? (
          <div className="movie-withdraw-confirm" role="alert">
            <p>Delete &quot;{movie.title}&quot; forever? This cannot be undone.</p>
            <div className="movie-danger-actions">
              <button type="button" className="movie-button movie-button-danger" disabled={busy} onClick={deleteIt}>{busyAction === 'delete' ? 'Deleting…' : 'Yes, delete it'}</button>
              <button type="button" className="movie-button movie-button-outline" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep it</button>
            </div>
          </div>
        ) : <button type="button" className="movie-button movie-button-outline movie-button-danger-text" disabled={busy} onClick={() => { clear(); setBlocked(false); setPlan(null); setConfirmDelete(true); }}>Delete movie…</button>}
      </div>
    </section>
  );
}
