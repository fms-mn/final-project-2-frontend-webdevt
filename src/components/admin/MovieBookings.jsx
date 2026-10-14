import { useEffect, useState } from 'react';
import { api } from '../../api';
import { describeError, pesos } from '../../utils/adminTools';
import { displayTime, shortDate } from '../../utils/manila';

const PAGE = 25;
const CHIPS = [['all', 'All'], ['confirmed', 'Confirmed'], ['cancelled', 'Cancelled']];
const STATUS_TEXT = { confirmed: 'Confirmed', cancelled: 'Cancelled', pending: 'Awaiting payment', expired: 'Expired' };
const MONEY_TEXT = { paid: 'Paid', refunded: 'Refunded', unpaid: 'Not paid' };

// Every booking for one movie, newest first, with its customer, showing, seats and money.
export default function MovieBookings({ movie, state }) {
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const sales = state.summary?.sales;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const status = filter === 'all' ? '' : `&status=${filter}`;
    api(`/bookings?movie=${movie._id}&limit=${PAGE}&page=${page}${status}`, { signal: controller.signal })
      .then((list) => {
        setRows((current) => (page === 1 ? list : [...current, ...list]));
        setMore(list.length === PAGE);
        setLoading(false);
      })
      .catch((err) => { if (err.name !== 'AbortError') { setError(describeError(err)); setLoading(false); } });
    return () => controller.abort();
  }, [movie._id, filter, page, attempt]);

  const choose = (value) => { setFilter(value); setPage(1); setRows([]); };

  return (
    <div className="movie-bookings">
      {sales && (
        <div className="movie-bookings-total">
          <div><span>Revenue</span><strong>{pesos(sales.revenue)}</strong></div>
          <div><span>Tickets</span><strong>{sales.tickets}</strong></div>
          <div><span>Refunded</span><strong>{pesos(sales.refunded)}</strong></div>
        </div>
      )}

      <div className="movie-chips" role="group" aria-label="Show bookings">
        {CHIPS.map(([value, label]) => (
          <button key={value} type="button" className={filter === value ? 'is-on' : ''} aria-pressed={filter === value} onClick={() => choose(value)}>{label}</button>
        ))}
      </div>

      {error && <p className="movie-field-error" role="alert">{error} <button type="button" className="movie-schedule-link" onClick={() => setAttempt((value) => value + 1)}>Try again</button></p>}
      {loading && rows.length === 0 && !error && <p className="movie-field-help">Loading bookings…</p>}
      {!loading && !error && rows.length === 0 && (
        <div className="movie-empty-state">
          <b>{filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}</b>
          <span>{filter === 'all' ? `When customers book ${movie.title}, they show up here with what they paid.` : 'Try another filter.'}</span>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="movie-booking-list">
          {rows.map((row) => (
            <li key={row._id} className="movie-booking">
              <div className="movie-booking-top">
                <span className="movie-booking-code">{row.bookingCode}</span>
                <span className={`movie-booking-status is-${row.status}`}>{STATUS_TEXT[row.status] || row.status}</span>
                <strong className={`movie-booking-amount${row.status === 'cancelled' ? ' is-struck' : ''}`}>{pesos(row.totalAmount)}</strong>
              </div>
              <div className="movie-booking-who">{row.user?.name || 'Customer'}{row.user?.email && <small> · {row.user.email}</small>}</div>
              <div className="movie-booking-what">
                {row.showtime?.startTime ? `${shortDate(row.showtime.startTime)} · ${displayTime(row.showtime.startTime)}` : 'Showing removed'}
                {row.auditorium?.name && ` · ${row.auditorium.name}`} · {row.seats.length === 1 ? 'Seat' : 'Seats'} {row.seats.join(', ')}
              </div>
              <div className="movie-booking-money">
                {MONEY_TEXT[row.paymentStatus] || '—'}
                {row.paymentStatus === 'refunded' && row.payment?.refundReference && <small> · {row.payment.refundReference}</small>}
                {row.status === 'cancelled' && row.showtime?.status === 'cancelled' && <small> · cinema cancelled the showing</small>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {more && <button type="button" className="movie-button movie-button-outline movie-load-more" disabled={loading} onClick={() => setPage((value) => value + 1)}>{loading ? 'Loading…' : 'Load more'}</button>}
    </div>
  );
}
