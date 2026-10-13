import { useId, useState } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { groupHistory, selectHistory } from '../utils/ticketHistory';
import { today } from '../utils/manila';
import { isTestBooking } from '../utils/payment';
import { refundSummary } from '../utils/refund';
import PaymentRefundInfo from './PaymentRefundInfo';
import './TicketHistory.css';

const money = amount => Number.isFinite(amount) ? '₱' + amount.toLocaleString('en-PH') : 'Unavailable';
const dateLabel = day => day === 'unknown' ? 'Showtime date unavailable' : new Date(day + 'T12:00:00+08:00').toLocaleDateString('en-PH', {
  timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', ...(day.slice(0, 4) !== today().slice(0, 4) ? { year: 'numeric' } : {}),
});

function HistoryRow({ booking, getDetail, expanded, onToggle, onRetryRefund, refundLoading, refundError }) {
  const detailsId = useId();
  const info = getDetail(booking);
  const cancelled = booking.status === 'cancelled';
  const status = cancelled ? 'Cancelled' : booking.status === 'confirmed' ? 'Past' : booking.status === 'expired' ? 'Expired' : 'Pending';
  const refund = refundSummary(booking.cancellation, cancelled);
  const refundApplicable = cancelled || ['refunded', 'pending', 'failed'].includes(booking.cancellation?.refund?.status);
  const paymentStatus = booking.payment?.status || booking.paymentStatus || booking.cancellation?.paymentStatus;
  const paymentLabels = { paid: 'Paid', refunded: 'Refunded', unpaid: 'Unpaid', failed: 'Failed', awaiting_approval: 'Awaiting approval', not_taken: 'No payment collected' };
  return <li className="history-record">
    <time className="history-time" dateTime={booking.showtime?.startTime || undefined}>{info.time}</time>
    <article className="history-card">
      <div className="history-row">
        <div className="history-main">
        <h4 className="history-movie">{booking.movie?.title || 'Movie no longer in catalog'}</h4>
        <p className="history-mobile-showtime">{info.time} · {info.room}</p>
        <div className="history-seats">{booking.seats.map(seat => <span className="history-seat" key={seat}>{seat}</span>)}<small className="history-room">{info.room}</small></div>
        </div>
        <div className="history-side">
        <div className="history-amount"><strong>{money(info.price)}</strong><small>Original amount</small></div>
        <div className="history-status"><span className={'history-badge ' + (cancelled ? 'is-cancelled' : '')}>{status}</span>{refundApplicable && <small className="history-refund-brief">{refund.title}</small>}</div>
        </div>
      </div>
      <button type="button" className="history-expand" aria-expanded={expanded} aria-controls={detailsId} aria-label={(expanded ? 'Hide' : 'Show') + ' details for ' + (booking.movie?.title || 'booking') + ', ' + info.date + ', ' + info.code} onClick={onToggle}><span>{expanded ? 'Hide details' : 'Details'}</span><FiChevronDown aria-hidden="true" /></button>
      <div className="history-details" id={detailsId} hidden={!expanded}>
        <dl className="history-reference-grid"><div><dt>Reference</dt><dd className="ticket-code">{info.code}</dd></div><div><dt>Payment</dt><dd>{paymentLabels[paymentStatus] || 'Unavailable'}</dd></div>{refundApplicable && refund.reference && <div><dt>Refund reference</dt><dd>{refund.reference}</dd></div>}</dl>
        {refundApplicable ? <PaymentRefundInfo info={booking.cancellation} after={cancelled} compact onRetry={onRetryRefund} loading={refundLoading} error={refundError} /> : <p className="history-payment-note">{isTestBooking(booking) ? 'Test booking. No real money was charged. Not valid for cinema admission.' : 'Payment mode unverified. Not valid for cinema admission.'}</p>}
        {booking.payment && <dl className="history-payment-extra"><div><dt>{isTestBooking(booking) ? 'Simulated payment amount' : 'Payment amount'}</dt><dd>{money(booking.payment.amount != null ? booking.payment.amount / 100 : null)}</dd></div>{booking.payment.reference && <div><dt>Payment reference</dt><dd>{booking.payment.reference}</dd></div>}</dl>}
        {refundApplicable && isTestBooking(booking) && <p className="history-ticket-disclaimer">Test booking · Not valid for cinema admission.</p>}
      </div>
    </article>
  </li>;
}

export default function TicketHistory({ bookings, getDetail, onRetryRefund, refundRefresh }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const selected = selectHistory(bookings, { filter, query, order });
  const groups = groupHistory(selected, visibleCount);
  const update = (setter, value) => { setter(value); setVisibleCount(5); };
  const toggle = id => setExpandedIds(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  return <section className="wallet-section history-section" aria-labelledby="history-heading">
    <h2 id="history-heading" className="eyebrow">History · {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}</h2>
    {bookings.length ? <>
      <div className="history-controls">
        <div className="history-filters" role="group" aria-label="Filter History">{[['all', 'All'], ['cancelled', 'Cancelled'], ['past', 'Past']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => update(setFilter, value)}>{label}</button>)}</div>
        <label className="history-search"><span className="history-sr-only">Search History</span><FiSearch aria-hidden="true" /><input type="search" value={query} placeholder="Title or booking reference" onChange={event => update(setQuery, event.target.value)} /></label>
        <label className="history-sort"><span className="history-sr-only">Sort by showtime</span><select value={order} onChange={event => update(setOrder, event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        <p className="history-count" role="status"><span className="history-count-label">History · </span>Showing {Math.min(visibleCount, selected.length)} of {selected.length}</p>
      </div>
      {selected.length ? <div className="wallet-history">{groups.map(group => <section className={'history-date-group' + (group.day === 'unknown' ? ' is-date-unknown' : '')} key={group.day} aria-label={dateLabel(group.day)}>
        <h3 className="history-group-heading">{dateLabel(group.day)} · {group.total} {group.total === 1 ? 'booking' : 'bookings'}{group.bookings.length < group.total && <small> (showing {group.bookings.length} of {group.total})</small>}</h3>
        <ul className="history-list">{group.bookings.map(booking => <HistoryRow key={booking._id} booking={booking} getDetail={getDetail} expanded={expandedIds.has(booking._id)} onToggle={() => toggle(booking._id)} onRetryRefund={onRetryRefund ? () => onRetryRefund(booking) : undefined} refundLoading={refundRefresh.id === booking._id && refundRefresh.loading} refundError={refundRefresh.id === booking._id ? refundRefresh.error : ''} />)}</ul>
      </section>)}{visibleCount < selected.length && <button type="button" className="btn btn-secondary history-load-more" onClick={() => setVisibleCount(count => count + 5)}>Load more</button>}</div> : <div className="bookings-empty"><h3>No matching history</h3><p>Try another movie title, booking reference, or filter.</p><button type="button" className="btn btn-secondary" onClick={() => { setQuery(''); setFilter('all'); setVisibleCount(5); }}>Clear search and filters</button></div>}
    </> : <div className="bookings-empty"><h3>No ticket history yet</h3><p>Past and cancelled tickets will appear here.</p></div>}
  </section>;
}
