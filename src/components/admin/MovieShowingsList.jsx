import { useEffect, useState } from 'react';
import { api } from '../../api';
import { describeError, pesos } from '../../utils/adminTools';
import { manilaClock, shortDate } from '../../utils/manila';

const SHOWN = 6;

// The showings of one movie, inside its panel, so an admin can see what is scheduled and jump
// straight to the one that needs fixing.
export default function MovieShowingsList({ movie, onOpen, onSchedule, refreshKey = 0 }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [all, setAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    api(`/admin/showtimes?movie=${movie._id}&limit=100`, { signal: controller.signal })
      .then(setRows)
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [movie._id, refreshKey]);

  const now = Date.now();
  const upcoming = (rows || []).filter((row) => row.status === 'scheduled' && new Date(row.startTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const earlier = (rows || []).length - upcoming.length;
  const visible = all ? upcoming : upcoming.slice(0, SHOWN);

  return (
    <section className="movie-section" aria-labelledby="movie-sec-showings">
      <div className="movie-section-head">
        <h3 id="movie-sec-showings">Showings</h3>
        {movie.status !== 'archived' && <button type="button" className="movie-schedule-link" onClick={() => onSchedule(movie._id)}>{upcoming.length ? 'Schedule more →' : 'Schedule showings →'}</button>}
      </div>
      {error && <p className="movie-field-error" role="alert">{error}</p>}
      {!rows && !error && <p className="movie-field-help">Loading showings…</p>}
      {rows && upcoming.length === 0 && (
        <p className="movie-field-help">
          {movie.status === 'published'
            ? 'No upcoming showings, so customers see "No showings". Schedule some to put it on sale.'
            : movie.status === 'draft'
              ? 'No upcoming showings. Schedule some, then publish the movie so customers can see them.'
              : 'This movie is archived. Set it back to Draft to schedule showings.'}
        </p>
      )}
      {visible.length > 0 && (
        <ul className="movie-showing-list">
          {visible.map((row) => {
            const sold = row.totalSeats - row.remainingSeats;
            return (
              <li key={row._id}>
                <button type="button" onClick={() => onOpen(row)} aria-label={`Open the ${shortDate(row.startTime)} ${manilaClock(row.startTime)} showing`}>
                  <span className="movie-showing-when"><b>{shortDate(row.startTime)}</b> {manilaClock(row.startTime)}</span>
                  <span className="movie-showing-meta">{row.auditorium?.name} · {pesos(row.ticketPrice)} · {sold} of {row.totalSeats} sold</span>
                  {!row.published && <span className="admin-status hidden-tag">hidden</span>}
                  <span className="movie-showing-open" aria-hidden="true">Fix →</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {movie.status === 'draft' && upcoming.length > 0 && <p className="movie-field-help">These showings are hidden from customers until the movie is published.</p>}
      {upcoming.length > SHOWN && !all && <button type="button" className="movie-schedule-link" onClick={() => setAll(true)}>Show all {upcoming.length} upcoming showings</button>}
      {earlier > 0 && <p className="movie-field-help">{earlier} earlier or cancelled {earlier === 1 ? 'showing is' : 'showings are'} not listed.</p>}
    </section>
  );
}
