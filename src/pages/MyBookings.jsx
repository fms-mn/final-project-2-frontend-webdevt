import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { canCancelDemoBooking, cancelDemoBooking, getDemoBookingReference, getDemoBookings } from '../data/demoBookings';
import { displayTime, manilaDay, shortDate, today } from '../utils/manila';
import { listAuditoriums } from '../data/demoSchedule';
import CancelBookingModal from '../components/CancelBookingModal';
import CancellationSuccess from '../components/CancellationSuccess';
import { paymentLine, refundOf } from '../utils/payment';
import './MyBookings.css';

function detail(booking) {
  const when = booking.showtime?.startTime ? new Date(booking.showtime.startTime) : new Date(`${booking.showDate}T${booking.showTime}:00+08:00`);
  return {
    when, date: shortDate(when),
    time: displayTime(when),
    room: booking.auditorium?.name || listAuditoriums().find(room => room.id === booking.auditoriumId)?.name || 'Cinema',
    code: booking.bookingCode || getDemoBookingReference(booking),
    price: booking.totalAmount != null ? booking.totalAmount / 100 : booking.totalPrice,
  };
}
function Ticket({ booking, onCancel, compact }) {
  const info = detail(booking);
  return <article className={`wallet-ticket ${compact ? 'wallet-ticket-history' : ''}`}>
    <div className="wallet-ticket-ribbon"><span>{compact ? `${info.date} · ${info.time}` : manilaDay(info.when) === today() ? 'Next up · today' : info.date}</span><span>{info.room}</span></div>
    <div className="wallet-ticket-body">{(booking.isDemo || booking.userId === 'demo-user') && <p className="movie-fixture-note">Simulated booking · no cinema admission</p>}<h3>{booking.movie?.title || 'Movie no longer in catalog'}</h3>
      {compact ? <p>{info.room} · seats {booking.seats.join(', ')}</p> : <div className="wallet-ticket-facts"><span>Date <b>{info.date}</b></span><span>Time <b>{info.time}</b></span><span>Seats <b>{booking.seats.join(', ')}</b></span></div>}
      <div className="wallet-ticket-bottom"><div><small>Code</small><span className="ticket-code">{info.code}</span></div><strong>₱{info.price.toLocaleString('en-PH')}</strong>{onCancel && <button type="button" className="btn btn-danger btn-small" onClick={() => onCancel(booking)}>Cancel ticket</button>}</div>
      {booking.status === 'confirmed' && booking.showtime?.rescheduledAt && booking.showtime?.originalStartTime && <p className="ticket-note" role="note">{new Date(booking.showtime.originalStartTime).getTime() === new Date(booking.showtime.startTime).getTime() ? `The cinema moved this showing to ${info.room}; the time and your seats are the same.` : `The cinema moved this showing. It was ${shortDate(booking.showtime.originalStartTime)} at ${displayTime(booking.showtime.originalStartTime)}; your seats are the same.`}</p>}
      {booking.status === 'cancelled' && booking.showtime?.status === 'cancelled' && <p className="ticket-note is-cancelled" role="note">The cinema cancelled this showing{booking.paymentStatus === 'refunded' ? ', and your payment was refunded in full' : ''}.</p>}
      {paymentLine(booking) && <p className={`ticket-payment${booking.paymentStatus === 'refunded' ? ' is-refunded' : ''}`}>{paymentLine(booking)}</p>}
      {compact && <span className={`ticket-stamp ${booking.status === 'cancelled' ? 'cancelled' : ''}`}>{booking.status === 'cancelled' ? (booking.showtime?.status === 'cancelled' ? 'Cancelled by cinema' : 'Cancelled') : booking.userId === 'demo-user' ? 'Demo ended' : 'Watched'}</span>}
    </div>
  </article>;
}
export default function MyBookings() {
  const { user } = useAuth();
  const isDemo = user?.isDemo || String(user?.id || '').startsWith('demo');
  const [liveBookings, setLiveBookings] = useState([]);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const cancelLocked = useRef(false);
  const [toCancel, setToCancel] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (isDemo) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    api('/bookings/my?limit=200', { signal: controller.signal }).then(result => { setLiveBookings(result); setLoading(false); }).catch(err => { if (err.name !== 'AbortError') { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [isDemo, revision]);
  const bookings = isDemo ? getDemoBookings(user?.id) : liveBookings;
  const upcoming = bookings.filter(b => b.status === 'confirmed' && detail(b).when > new Date()).sort((a,b) => detail(a).when - detail(b).when);
  const history = bookings.filter(b => b.status !== 'confirmed' || detail(b).when <= new Date()).sort((a,b) => detail(b).when - detail(a).when);
  const close = useCallback(() => { if (!cancelLocked.current) setToCancel(null); }, []);
  const dismissSuccess = useCallback(() => setFeedback(null), []);
  const confirm = async () => {
    if (!toCancel || cancelLocked.current) return;
    cancelLocked.current = true;
    setCancelling(true);
    setCancelError('');
    let refunded = null;
    try {
      if (isDemo) cancelDemoBooking(toCancel._id, user.id);
      if (!isDemo) {
        const result = await api(`/bookings/${toCancel._id}/cancel`, { method: 'PATCH' });
        if (result?.status !== 'cancelled') throw new Error('Cancellation could not be confirmed. Please try again.');
        setLiveBookings(current => current.map(booking => booking._id === toCancel._id ? result : booking));
        refunded = refundOf(result);
      }
      setFeedback({ id: toCancel._id, reference: detail(toCancel).code, refund: refunded });
      setToCancel(null);
    } catch (err) { setCancelError(err.message); }
    finally { cancelLocked.current = false; setCancelling(false); }
  };
  return <div className="bookings-page fade-in"><div className="wallet-heading"><div><span className="eyebrow">Your wallet</span><h1>My tickets</h1></div>{!loading && !error && upcoming.length > 0 && <Link to="/movies" className="btn btn-primary">Browse movies</Link>}</div>
    {isDemo && <p className="demo-note">Simulated bookings saved in this browser. These are not admission tickets.</p>}
    {feedback && <CancellationSuccess key={feedback.id} reference={feedback.reference} refund={feedback.refund} onDismiss={dismissSuccess} />}
    {loading && <div className="loading"><div className="spinner"/></div>}
    {error && <div className="error-message" role="alert">{error}<button className="btn btn-secondary btn-small" onClick={() => setRevision(v => v+1)}>Try again</button></div>}
    {!loading && !error && <><section className="wallet-section"><h2 className="eyebrow">Coming up · {upcoming.length} {upcoming.length === 1 ? 'ticket' : 'tickets'}</h2>{upcoming.length ? <div className="wallet-upcoming">{upcoming.map(b => <Ticket key={b._id} booking={b} onCancel={isDemo ? canCancelDemoBooking(b) ? setToCancel : undefined : setToCancel}/>)}</div> : <div className="bookings-empty"><h3>No upcoming tickets</h3><p>Choose a film and reserve your next seats.</p><Link className="btn btn-primary" to="/movies">Browse movies</Link></div>}</section>
    <section className="wallet-section"><h2 className="eyebrow">Used and cancelled · {history.length} {history.length === 1 ? 'ticket' : 'tickets'}</h2>{history.length ? <div className="wallet-history">{history.map(b => <Ticket key={b._id} booking={b} compact/>)}</div> : <div className="bookings-empty"><h3>No ticket history yet</h3><p>Past and cancelled tickets will appear here.</p></div>}<p className="wallet-footnote">Cancelled tickets stay here, so you can always see what happened.</p></section></>}
    {toCancel && <CancelBookingModal booking={{ ...toCancel, showDate: toCancel.showDate || manilaDay(detail(toCancel).when), showTime: toCancel.showTime || detail(toCancel).when.toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }) }} pending={cancelling} error={cancelError} onKeep={close} onCancel={confirm}/>}
  </div>;
}
