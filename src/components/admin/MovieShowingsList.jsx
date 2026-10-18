import { useEffect, useState } from 'react';
import { apiAll } from '../../api';
import { describeError, pesos } from '../../utils/adminTools';
import { displayTime, shortDate } from '../../utils/manila';

const SHOWN = 6;
const CHIPS = [['upcoming', 'Upcoming'], ['past', 'Already shown'], ['cancelled', 'Cancelled']];

// The showings of one movie, inside its panel: what is coming (to fix or add to), what already
// happened and how it sold, and what was cancelled.
export default function MovieShowingsList({ movie, onOpen, onSchedule, refreshKey = 0 }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [all, setAll] = useState(false);
  const [view, setView] = useState('upcoming');

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    apiAll(`/admin/showtimes?movie=${movie._id}`, { signal: controller.signal })
      .then(setRows)
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [movie._id, refreshKey]);

  const now = Date.now();
  const byStart = (a, b) => new Date(a.startTime) - new Date(b.startTime);
  const scheduled = (rows || []).filter((row) => row.status === 'scheduled');
  const upcoming = scheduled.filter((row) => new Date(row.startTime).getTime() > now).sort(byStart);
  const past = scheduled.filter((row) => new Date(row.startTime).getTime() <= now).sort((a, b) => byStart(b, a));
  const cancelled = (rows || []).filter((row) => row.status === 'cancelled').sort((a, b) => byStart(b, a));
  const lists = { upcoming, past, cancelled };
  const current = lists[view];
  const visible = view === 'upcoming' && !all ? current.slice(0, SHOWN) : current;

  return (
    <section className="movie-section" aria-labelledby="movie-sec-showings">
      <div className="movie-section-head">
        <h3 id="movie-sec-showings">Showings</h3>
        {movie.status !== 'archived' && <button type="button" className="movie-schedule-link" onClick={() => onSchedule(movie._id)}>{upcoming.length ? 'Schedule more →' : 'Schedule showings →'}</button>}
      </div>
      {error && <p className="movie-field-error" role="alert">{error}</p>}
      {!rows && !error && <p className="movie-field-help">Loading showings…</p>}
      {rows && (
        <div className="movie-chips" role="group" aria-label="Which showings">
          {CHIPS.map(([value, label]) => (
            <button key={value} type="button" className={view === value ? 'is-on' : ''} aria-pressed={view === value} onClick={() => setView(value)}>{label} <span>{lists[value].length}</span></button>
          ))}
        </div>
      )}
      {rows && view === 'upcoming' && upcoming.length === 0 && (
        <div className="movie-empty-state">
          <b>No upcoming showings</b>
          <span>
            {movie.status === 'published'
              ? movie.showStatus === 'coming_soon' ? 'The coming-soon announcement is live. Add showings to sell advance tickets.' : 'There are no tickets available. Add showings to sell tickets again.'
              : movie.status === 'draft'
                ? 'Add showings and publish the movie together.'
                : 'This movie is archived. Set it back to Draft to schedule showings.'}
          </span>
        </div>
      )}
      {rows && view !== 'upcoming' && current.length === 0 && (
        <div className="movie-empty-state"><b>{view === 'past' ? 'Nothing has been shown yet' : 'No cancelled showings'}</b></div>
      )}
      {visible.length > 0 && (
        <ul className="movie-showing-list">
          {visible.map((row) => {
            const sold = row.totalSeats - row.remainingSeats;
            const details = (
              <>
                <span className="movie-showing-when"><b>{shortDate(row.startTime)}</b> {displayTime(row.startTime)}</span>
                <span className="movie-showing-meta">{row.auditorium?.name} · {pesos(row.ticketPrice)} · {sold} of {row.totalSeats} sold</span>
                {view === 'upcoming' && (!row.published || movie.status === 'draft') && <span className="admin-status hidden-tag">{movie.status === 'draft' ? 'movie is a draft' : 'hidden'}</span>}
                {view === 'upcoming' && <span className="movie-showing-open" aria-hidden="true">Fix →</span>}
              </>
            );
            return (
              <li key={row._id}>
                {view === 'upcoming'
                  ? <button type="button" onClick={() => onOpen(row)} aria-label={`Open the ${shortDate(row.startTime)} ${displayTime(row.startTime)} showing`}>{details}</button>
                  : <div className="movie-showing-static">{details}</div>}
              </li>
            );
          })}
        </ul>
      )}
      {movie.status === 'draft' && view === 'upcoming' && upcoming.length > 0 && <p className="movie-field-help">These showings are hidden from customers until the movie is published.</p>}
      {view === 'upcoming' && upcoming.length > SHOWN && !all && <button type="button" className="movie-schedule-link" onClick={() => setAll(true)}>Show all {upcoming.length} upcoming showings</button>}
    </section>
  );
}
