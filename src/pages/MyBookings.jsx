import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { canCancelDemoBooking, cancelDemoBooking, getDemoBookingReference, getDemoBookings } from '../data/demoBookings';
import CancelBookingModal from '../components/CancelBookingModal';

function detail(booking) {
  const when = booking.showtime?.startTime ? new Date(booking.showtime.startTime) : new Date(`${booking.showDate}T${booking.showTime}:00`);
  return {
    when, date: when.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: booking.showtime?.startTime ? when.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false }) : booking.showTime,
    room: booking.auditorium?.name || 'Cinema',
    code: booking.bookingCode || getDemoBookingReference(booking),
    price: booking.totalAmount != null ? booking.totalAmount / 100 : booking.totalPrice,
  };
}
function Ticket({ booking, onCancel, compact }) {
  const info = detail(booking);
  return <article className={`wallet-ticket ${compact ? 'wallet-ticket-history' : ''}`}>
    <div className="wallet-ticket-ribbon"><span>{compact ? `${info.date} · ${info.time}` : info.when.toDateString() === new Date().toDateString() ? 'Next up · today' : info.date}</span><span>{info.room}</span></div>
    <div className="wallet-ticket-body"><h3>{booking.movie?.title || 'Movie no longer in catalog'}</h3>
      {compact ? <p>{info.room} · seats {booking.seats.join(', ')}</p> : <div className="wallet-ticket-facts"><span>Date <b>{info.date}</b></span><span>Time <b>{info.time}</b></span><span>Seats <b>{booking.seats.join(', ')}</b></span></div>}
      <div className="wallet-ticket-bottom"><div><small>Code</small><span className="ticket-code">{info.code}</span></div><strong>₱{info.price.toLocaleString('en-PH')}</strong>{onCancel && <button type="button" className="btn btn-danger btn-small" onClick={() => onCancel(booking)}>Cancel ticket</button>}</div>
      {compact && <span className={`ticket-stamp ${booking.status === 'cancelled' ? 'cancelled' : ''}`}>{booking.status === 'cancelled' ? 'Cancelled' : 'Watched'}</span>}
    </div>
  </article>;
}
export default function MyBookings() {
  const { user } = useAuth();
  const isDemo = user?.isDemo || String(user?.id || '').startsWith('demo');
  const [liveBookings, setLiveBookings] = useState([]);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [toCancel, setToCancel] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (isDemo) return;
    const controller = new AbortController();
    setLoading(true);
    api('/bookings/my?limit=200', { signal: controller.signal }).then(result => { setLiveBookings(result); setLoading(false); }).catch(err => { if (err.name !== 'AbortError') { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [isDemo, revision]);
  const bookings = isDemo ? getDemoBookings(user?.id) : liveBookings;
  const upcoming = bookings.filter(b => b.status === 'confirmed' && detail(b).when > new Date()).sort((a,b) => detail(a).when - detail(b).when);
  const history = bookings.filter(b => b.status !== 'confirmed' || detail(b).when <= new Date()).sort((a,b) => detail(b).when - detail(a).when);
  const close = useCallback(() => setToCancel(null), []);
  const confirm = async () => {
    if (!toCancel) return;
    try {
      if (isDemo) cancelDemoBooking(toCancel._id, user.id);
      else await api(`/bookings/${toCancel._id}/cancel`, { method: 'PATCH' });
      setFeedback(`Ticket ${detail(toCancel).code} was cancelled. Its seats are available again.`);
      setToCancel(null);
      setRevision(value => value + 1);
    } catch (err) { setCancelError(err.message); }
  };
  return <div className="bookings-page fade-in"><div className="wallet-heading"><div><span className="eyebrow">Your wallet</span><h1>My tickets</h1></div><Link to="/movies" className="btn btn-primary">Book a film</Link></div>
    {isDemo && <p className="demo-note">Demo mode: bookings are saved in this browser.</p>}
    {feedback && <p className="booking-feedback-success" role="status">{feedback}</p>}
    {loading && <div className="loading"><div className="spinner"/></div>}
    {error && <div className="error-message" role="alert">{error}<button className="btn btn-secondary btn-small" onClick={() => setRevision(v => v+1)}>Try again</button></div>}
    {!loading && !error && <><section className="wallet-section"><h2 className="eyebrow">Coming up · {upcoming.length} {upcoming.length === 1 ? 'ticket' : 'tickets'}</h2>{upcoming.length ? <div className="wallet-upcoming">{upcoming.map(b => <Ticket key={b._id} booking={b} onCancel={isDemo ? canCancelDemoBooking(b) ? setToCancel : undefined : setToCancel}/>)}</div> : <div className="bookings-empty"><h3>No upcoming tickets</h3><p>Choose a film and reserve your next seats.</p><Link className="btn btn-primary" to="/movies">Browse movies</Link></div>}</section>
    <section className="wallet-section"><h2 className="eyebrow">Used and cancelled · {history.length} {history.length === 1 ? 'ticket' : 'tickets'}</h2>{history.length ? <div className="wallet-history">{history.map(b => <Ticket key={b._id} booking={b} compact/>)}</div> : <div className="bookings-empty"><h3>No ticket history yet</h3><p>Past and cancelled tickets will appear here.</p></div>}<p className="wallet-footnote">Cancelled tickets stay here, so you can always see what happened.</p></section></>}
    {toCancel && <CancelBookingModal booking={{ ...toCancel, showDate: toCancel.showDate || detail(toCancel).when.toISOString().slice(0,10), showTime: toCancel.showTime || detail(toCancel).time }} error={cancelError} onKeep={close} onCancel={confirm}/>}
  </div>;
}
