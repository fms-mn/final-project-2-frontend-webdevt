import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { canCancelDemoBooking, cancelDemoBooking, demoCancellationInfo, getDemoBookingReference, getDemoBookings } from '../data/demoBookings';
import { displayTime, manilaDay, shortDate, today } from '../utils/manila';
import { listAuditoriums } from '../data/demoSchedule';
import CancelBookingModal from '../components/CancelBookingModal';
import CancellationSuccess from '../components/CancellationSuccess';
import { isTestBooking, paymentLine } from '../utils/payment';
import './MyBookings.css';
import { refundSummary } from '../utils/refund';
import TicketHistory from '../components/TicketHistory';
import { bookingWhen, loadCustomerBookings } from '../utils/ticketHistory';

function detail(booking) {
  const when = bookingWhen(booking);
  return {
    when, date: shortDate(when),
    time: displayTime(when),
    room: booking.auditorium?.name || listAuditoriums().find(room => room.id === booking.auditoriumId)?.name || 'Cinema',
    code: booking.bookingCode || getDemoBookingReference(booking),
    price: booking.totalAmount != null ? booking.totalAmount / 100 : booking.totalPrice,
  };
}
function Ticket({ booking, onCancel }) {
  const info = detail(booking);
  return <article className="wallet-ticket">
    <div className="wallet-ticket-ribbon"><span>{manilaDay(info.when) === today() ? 'Next up · today' : info.date}</span><span>{info.room}</span></div>
    <div className="wallet-ticket-body"><p className="movie-fixture-note">{isTestBooking(booking) ? 'Test booking · No real money was charged. Not valid for cinema admission.' : 'Payment mode unverified · Not valid for cinema admission.'}</p><h3>{booking.movie?.title || 'Movie no longer in catalog'}</h3>
      <div className="wallet-ticket-facts"><span>Date <b>{info.date}</b></span><span>Time <b>{info.time}</b></span><span>Seats <b>{booking.seats.join(', ')}</b></span></div>
      <div className="wallet-ticket-bottom"><div><small>Code</small><span className="ticket-code">{info.code}</span></div><strong>₱{info.price.toLocaleString('en-PH')}</strong>{onCancel && <button type="button" className="btn btn-danger btn-small" onClick={() => onCancel(booking)}>Cancel ticket</button>}</div>
      {paymentLine(booking) && <p className={`ticket-payment${booking.paymentStatus === 'refunded' ? ' is-refunded' : ''}`}>{paymentLine(booking)}</p>}
    </div>
  </article>;
}
export default function MyBookings() {
  const { user } = useAuth();
  const isDemo = user?.isDemo || String(user?.id || '').startsWith('demo');
  const [liveBookings, setLiveBookings] = useState([]);
  const loadedAccount = useRef('');
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const cancelLocked = useRef(false);
  const [toCancel, setToCancel] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [revision, setRevision] = useState(0);
  const [refundPreview, setRefundPreview] = useState({ loading: true, info: null, error: '' });
  const [refundAttempt, setRefundAttempt] = useState(0);
  const [refundRefresh, setRefundRefresh] = useState({ id: '', loading: false, error: '' });
  useEffect(() => {
    if (isDemo) return;
    const controller = new AbortController();
    setLiveBookings([]); setLoading(true); setError('');
    loadCustomerBookings(api, controller.signal).then(result => { if (controller.signal.aborted) return; loadedAccount.current = user.id; setLiveBookings(result); setLoading(false); }).catch(err => { if (err.name !== 'AbortError') { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [isDemo, user?.id, revision]);
  const bookings = isDemo ? getDemoBookings(user?.id) : loadedAccount.current === user?.id ? liveBookings : [];
  const upcoming = bookings.filter(b => b.status === 'confirmed' && detail(b).when > new Date()).sort((a,b) => detail(a).when - detail(b).when);
  const history = bookings.filter(b => b.status !== 'confirmed' || detail(b).when <= new Date()).sort((a,b) => detail(b).when - detail(a).when);
  const close = useCallback(() => { if (!cancelLocked.current) setToCancel(null); }, []);
  const dismissSuccess = useCallback(() => setFeedback(null), []);
  const openCancellation = booking => {
    setRefundPreview({ loading: true, info: null, error: '' });
    setCancelError('');
    setToCancel(booking);
  };
  const acceptCancellation = useCallback(result => {
    setLiveBookings(current => current.map(booking => booking._id === result._id ? result : booking));
    setFeedback({ id: result._id, reference: detail(result).code, refund: refundSummary(result.cancellation, true) });
    setToCancel(null);
  }, []);
  useEffect(() => {
    if (!toCancel) return;
    setCancelError('');
    if (isDemo) {
      setRefundPreview({ loading: false, info: demoCancellationInfo(toCancel), error: '' });
      return;
    }
    const controller = new AbortController();
    setRefundPreview({ loading: true, info: null, error: '' });
    api(`/bookings/${toCancel._id}`, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      if (result._id !== toCancel._id) throw new Error('The selected booking could not be verified.');
      if (['cancelled', 'expired'].includes(result.status)) { acceptCancellation(result); return; }
      setRefundPreview({ loading: false, info: result.cancellation, error: '' });
    }).catch(err => { if (err.name !== 'AbortError') setRefundPreview({ loading: false, info: null, error: err.message }); });
    return () => controller.abort();
  }, [toCancel, isDemo, refundAttempt, acceptCancellation]);
  const retryHistoryRefund = async booking => {
    setRefundRefresh({ id: booking._id, loading: true, error: '' });
    try {
      const result = await api(`/bookings/${booking._id}`);
      if (result._id !== booking._id) throw new Error('The selected booking could not be verified.');
      setLiveBookings(current => current.map(item => item._id === result._id ? result : item));
      setRefundRefresh({ id: booking._id, loading: false, error: '' });
    } catch (err) { setRefundRefresh({ id: booking._id, loading: false, error: err.message }); }
  };
  const confirm = async () => {
    if (!toCancel || cancelLocked.current || refundPreview.loading || refundPreview.error || refundPreview.info?.eligible !== true) return;
    cancelLocked.current = true;
    setCancelling(true);
    setCancelError('');
    try {
      const result = isDemo ? cancelDemoBooking(toCancel._id, user.id) : await api(`/bookings/${toCancel._id}/cancel`, { method: 'PATCH' });
      if (!['cancelled', 'expired'].includes(result?.status)) throw new Error('Cancellation could not be confirmed. Refresh booking information to check its status.');
      acceptCancellation(isDemo ? { ...result, cancellation: demoCancellationInfo(result) } : result);
    } catch (err) {
      setCancelError(err.message);
      if (!isDemo) {
        try {
          const current = await api(`/bookings/${toCancel._id}`);
          if (current._id !== toCancel._id) throw new Error('The selected booking could not be verified.');
          if (['cancelled', 'expired'].includes(current.status)) acceptCancellation(current);
          else setRefundPreview({ loading: false, info: current.cancellation, error: '' });
        } catch {
          setRefundPreview({ loading: false, info: null, error: 'Cancellation status could not be checked. Refresh before trying to cancel again.' });
        }
      }
    }
    finally { cancelLocked.current = false; setCancelling(false); }
  };
  return <div className="bookings-page fade-in"><div className="wallet-heading"><div><span className="eyebrow">Your wallet</span><h1>My tickets</h1></div>{!loading && !error && upcoming.length > 0 && <Link to="/movies" className="btn btn-primary">Browse movies</Link>}</div>
    {isDemo && <p className="demo-note">Simulated bookings saved in this browser. These are not admission tickets.</p>}
    {feedback && <CancellationSuccess key={feedback.id} reference={feedback.reference} refund={feedback.refund} onDismiss={dismissSuccess} />}
    {loading && <div className="loading"><div className="spinner"/></div>}
    {error && <div className="error-message" role="alert">{error}<button className="btn btn-secondary btn-small" onClick={() => setRevision(v => v+1)}>Try again</button></div>}
    {!loading && !error && <><section className="wallet-section"><h2 className="eyebrow">Coming up · {upcoming.length} {upcoming.length === 1 ? 'ticket' : 'tickets'}</h2>{upcoming.length ? <div className="wallet-upcoming">{upcoming.map(b => <Ticket key={b._id} booking={b} onCancel={isDemo ? canCancelDemoBooking(b) ? openCancellation : undefined : openCancellation}/>)}</div> : <div className="bookings-empty"><h3>No upcoming tickets</h3><p>Choose a film and reserve your next seats.</p><Link className="btn btn-primary" to="/movies">Browse movies</Link></div>}</section>
    <TicketHistory key={user.id} bookings={isDemo ? history.map(booking => ({ ...booking, cancellation: demoCancellationInfo(booking) })) : history} getDetail={detail} onRetryRefund={isDemo ? undefined : retryHistoryRefund} refundRefresh={refundRefresh}/></>}
    {toCancel && <CancelBookingModal booking={{ ...toCancel, showDate: toCancel.showDate || manilaDay(detail(toCancel).when), showTime: toCancel.showTime || detail(toCancel).when.toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }) }} pending={cancelling} error={cancelError} refundInfo={refundPreview.info} refundLoading={refundPreview.loading} refundError={refundPreview.error} onRetryRefund={() => setRefundAttempt(value => value + 1)} onKeep={close} onCancel={confirm}/>}
  </div>;
}
