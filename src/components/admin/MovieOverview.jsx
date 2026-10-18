import { FiCalendar, FiClock, FiUsers } from 'react-icons/fi';
import { pesos } from '../../utils/adminTools';
import { movieWorkflow } from '../../utils/movieWorkflow';
import PublishChecklist from './PublishChecklist';

function Stat({ label, value, hint }) {
  return <div className="movie-stat"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

export default function MovieOverview({ movie, state, onTab, onSchedule, onPublish, publishing, onRestore }) {
  const { summary, error, loading, reload } = state;
  const status = movieWorkflow(movie);
  const sales = summary?.sales;
  const everBooked = sales && (sales.bookings > 0 || sales.cancelled > 0);

  return (
    <div className="movie-overview">
      {movie.status === 'draft' && movie.hiddenShowings > 0 && <p className="movie-field-help">{status.text} <button type="button" className="movie-schedule-link" onClick={() => onTab('showings')}>Review showings →</button></p>}
      {movie.status === 'draft' ? (
        <PublishChecklist
          movie={movie}
          bookable={movie.upcomingShowings ?? 0}
          busy={publishing}
          onAction={(action) => (action.schedule ? onSchedule(movie._id) : onTab(action.tab))}
          onPublish={onPublish}
        />
      ) : (
        <div className={`movie-state movie-state-${status.tone}`} role="status">
          <b>{status.title}</b>
          <span>{status.text}</span>
          <button type="button" className="movie-button movie-button-primary" disabled={publishing} onClick={() => status.action === 'restore' ? onRestore() : status.action === 'showings' ? onTab('showings') : onSchedule(movie._id)}>{status.label} →</button>
          {movie.status === 'published' && <a className="movie-schedule-link" href={`/movie/${movie._id}`} target="_blank" rel="noreferrer">View customer page ↗</a>}
        </div>
      )}

      {error && (
        <p className="movie-field-error" role="alert">{error} <button type="button" className="movie-schedule-link" onClick={reload}>Try again</button></p>
      )}
      {loading && !summary && <p className="movie-field-help">Loading sales…</p>}

      {sales && (
        <>
          <section className="movie-revenue" aria-label="Sales">
            <span className="movie-revenue-label">Revenue</span>
            <strong className="movie-revenue-value">{pesos(sales.revenue)}</strong>
            <span className="movie-revenue-sub">
              {sales.bookings === 0 ? 'No paid bookings yet.' : `From ${sales.tickets} ${sales.tickets === 1 ? 'ticket' : 'tickets'} in ${sales.bookings} ${sales.bookings === 1 ? 'booking' : 'bookings'}.`}
            </span>
            <button type="button" className="movie-schedule-link" onClick={() => onTab('bookings')}>See the bookings →</button>
          </section>

          <div className="movie-stats">
            <Stat label="Tickets sold" value={sales.tickets} />
            <Stat label="Customers" value={sales.customers} />
            <Stat label="Seats filled" value={summary.occupancy === null ? '—' : `${summary.occupancy}%`} hint={summary.occupancy === null ? 'No showings yet' : 'across its showings'} />
            <Stat label="Refunded" value={pesos(sales.refunded)} hint={sales.cancelled ? `${sales.cancelled} cancelled` : 'none'} />
          </div>

          <section className="movie-section" aria-labelledby="movie-sec-showcount">
            <div className="movie-section-head">
              <h3 id="movie-sec-showcount">Showings</h3>
              <button type="button" className="movie-schedule-link" onClick={() => onTab('showings')}>See all →</button>
            </div>
            <div className="movie-counts">
              <button type="button" onClick={() => onTab('showings')}><strong>{summary.showings.upcoming}</strong><span>Upcoming</span></button>
              <button type="button" onClick={() => onTab('showings')}><strong>{summary.showings.past}</strong><span>Already shown</span></button>
              <button type="button" onClick={() => onTab('showings')}><strong>{summary.showings.cancelled}</strong><span>Cancelled</span></button>
            </div>
            {summary.showings.hidden > 0 && <p className="movie-field-help">{summary.showings.hidden} upcoming {summary.showings.hidden === 1 ? 'showing is' : 'showings are'} hidden from customers.</p>}
          </section>

          {everBooked && movie.status !== 'draft' && (
            <p className="movie-field-help">This movie has booking history, so it cannot be deleted. Archive it to hide it from customers.</p>
          )}
        </>
      )}

      <div className="movie-quick">
        {movie.status !== 'archived' && <button type="button" className="movie-button movie-button-primary" onClick={() => onSchedule(movie._id)}><FiCalendar aria-hidden="true" /> Schedule showings</button>}
        <button type="button" className="movie-button movie-button-outline" onClick={() => onTab('bookings')}><FiUsers aria-hidden="true" /> Bookings</button>
        <button type="button" className="movie-button movie-button-outline" onClick={() => onTab('showings')}><FiClock aria-hidden="true" /> Showings</button>
      </div>
    </div>
  );
}
