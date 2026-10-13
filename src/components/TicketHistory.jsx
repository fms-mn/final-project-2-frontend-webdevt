import { useId, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { selectHistory } from '../utils/ticketHistory';
import { isTestBooking, paymentLine } from '../utils/payment';
import { refundSummary } from '../utils/refund';
import PaymentRefundInfo from './PaymentRefundInfo';
import './TicketHistory.css';

function HistoryRow({ booking, getDetail, onRetryRefund, refundLoading, refundError }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const info = getDetail(booking);
  const cancelled = booking.status === 'cancelled';
  const status = cancelled ? 'Cancelled' : booking.status === 'confirmed' ? 'Past' : booking.status === 'expired' ? 'Expired' : 'Pending';
  const refund = refundSummary(booking.cancellation, true);
  return <li className="history-record">
    <div className="history-row">
      <strong className="history-movie">{booking.movie?.title || 'Movie no longer in catalog'}</strong>
      <span className="history-showtime">{info.date}<small>{info.time}</small></span>
      <span className="history-seats">{booking.seats.join(', ')}<small>{info.room}</small></span>
      <strong className="history-amount">₱{info.price.toLocaleString('en-PH')}</strong>
      <span className="history-status"><span className={`history-badge ${cancelled ? 'is-cancelled' : ''}`}>{status}</span>{(cancelled || ['refunded', 'pending', 'failed'].includes(booking.cancellation?.refund?.status)) && <small>{refund.title}</small>}</span>
      <button type="button" className="history-expand" aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? 'Hide' : 'Show'} details for ${booking.movie?.title || 'booking'}, ${info.date}, ${info.code}`} onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide details' : 'Details'}<FiChevronDown aria-hidden="true" /></button>
    </div>
    <div className="history-details" id={detailsId} hidden={!expanded}>
      <p className="movie-fixture-note">{isTestBooking(booking) ? 'Test booking · No real money was charged. Not valid for cinema admission.' : 'Payment mode unverified · Not valid for cinema admission.'}</p>
      <dl><div><dt>Booking reference</dt><dd className="ticket-code">{info.code}</dd></div><div><dt>Movie</dt><dd>{booking.movie?.title || 'Movie no longer in catalog'}</dd></div><div><dt>Showtime</dt><dd>{info.date} · {info.time}</dd></div><div><dt>Auditorium</dt><dd>{info.room}</dd></div><div><dt>Seats</dt><dd>{booking.seats.join(', ')}</dd></div><div><dt>Booking amount</dt><dd>₱{info.price.toLocaleString('en-PH')}</dd></div><div><dt>Booking status</dt><dd>{status}</dd></div></dl>
      {booking.payment && <dl><div><dt>{isTestBooking(booking) ? 'Simulated payment' : 'Payment'} amount</dt><dd>{booking.payment.amount != null ? `₱${(booking.payment.amount / 100).toLocaleString('en-PH')}` : 'Unavailable'}</dd></div><div><dt>Payment status</dt><dd>{booking.payment.status}</dd></div>{booking.payment.reference && <div><dt>Payment reference</dt><dd>{booking.payment.reference}</dd></div>}</dl>}
      {paymentLine(booking) && <p className="ticket-payment">{paymentLine(booking)}</p>}
      <PaymentRefundInfo info={booking.cancellation} after={cancelled} onRetry={onRetryRefund} loading={refundLoading} error={refundError} />
    </div>
  </li>;
}

export default function TicketHistory({ bookings, getDetail, onRetryRefund, refundRefresh }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(5);
  const selected = selectHistory(bookings, { filter, query, order });
  const update = (setter, value) => { setter(value); setVisibleCount(5); };
  return <section className="wallet-section history-section" aria-labelledby="history-heading">
    <h2 id="history-heading" className="eyebrow">History · {bookings.length} {bookings.length === 1 ? 'ticket' : 'tickets'}</h2>
    {bookings.length ? <>
      <div className="history-controls">
        <div className="history-filters" role="group" aria-label="Filter History">{[['all', 'All'], ['cancelled', 'Cancelled'], ['past', 'Past']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => update(setFilter, value)}>{label}</button>)}</div>
        <label className="history-search">Search History<input type="search" value={query} placeholder="Movie title or booking reference" onChange={event => update(setQuery, event.target.value)} /></label>
        <label className="history-sort">Sort by showtime<select value={order} onChange={event => update(setOrder, event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      </div>
      <p className="history-count" role="status">Showing {Math.min(visibleCount, selected.length)} of {selected.length} matching records</p>
      {selected.length ? <div className="wallet-history">
        <div className="history-columns" aria-hidden="true"><span>Movie</span><span>Showtime</span><span>Seats / Auditorium</span><span>Amount</span><span>Status</span><span>Details</span></div>
        <ul className="history-list">{selected.slice(0, visibleCount).map(booking => <HistoryRow key={booking._id} booking={booking} getDetail={getDetail} onRetryRefund={onRetryRefund ? () => onRetryRefund(booking) : undefined} refundLoading={refundRefresh.id === booking._id && refundRefresh.loading} refundError={refundRefresh.id === booking._id ? refundRefresh.error : ''} />)}</ul>
        {visibleCount < selected.length && <button type="button" className="btn btn-secondary history-load-more" onClick={() => setVisibleCount(count => count + 5)}>Load more</button>}
      </div> : <div className="bookings-empty"><h3>No matching history</h3><p>Try another movie title, booking reference, or filter.</p><button type="button" className="btn btn-secondary" onClick={() => { setQuery(''); setFilter('all'); setVisibleCount(5); }}>Clear search and filters</button></div>}
    </> : <div className="bookings-empty"><h3>No ticket history yet</h3><p>Past and cancelled tickets will appear here.</p></div>}
    <p className="wallet-footnote">Cancelled tickets stay here, so you can always see what happened.</p>
  </section>;
}
