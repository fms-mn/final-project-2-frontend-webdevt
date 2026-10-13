import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { canCancelDemoBooking, cancelDemoBooking, demoCancellationInfo, getDemoBookingReference } from '../data/demoBookings';
import { displayTime, manilaDay, shortDate, today } from '../utils/manila';
import { listAuditoriums } from '../data/demoSchedule';
import CancelBookingModal from '../components/CancelBookingModal';
import CancellationSuccess from '../components/CancellationSuccess';
import { isTestBooking, paymentLine } from '../utils/payment';
import './MyBookings.css';
import { refundSummary } from '../utils/refund';
import TicketHistory from '../components/TicketHistory';
import { bookingWhen } from '../utils/ticketHistory';
import useBookingPage from '../hooks/useBookingPage';

function detail(booking) {
  const when = bookingWhen(booking);
  return {
    when, date: Number.isFinite(when.getTime()) ? shortDate(when) : 'Showtime unavailable',
    time: Number.isFinite(when.getTime()) ? displayTime(when) : 'Time unavailable',
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
  const [feedback, setFeedback] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const cancelLocked = useRef(false);
  const [toCancel, setToCancel] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [revision, setRevision] = useState(0);
  const [refundPreview, setRefundPreview] = useState({ loading: true, info: null, error: '' });
  const [refundAttempt, setRefundAttempt] = useState(0);
  const [refundRefresh, setRefundRefresh] = useState({ id: '', loading: false, error: '' });
  const upcomingPage = useBookingPage({ accountId: user?.id, isDemo, scope: 'upcoming', order: 'oldest', revision });
  const upcoming = upcomingPage.records;
  const { loading, error } = upcomingPage;
  const account = useRef(user?.id);
  account.current = user?.id;
  useEffect(() => { setToCancel(null); setFeedback(null); setRefundRefresh({ id: '', loading: false, error: '' }); }, [user?.id]);
  const close = useCallback(() => { if (!cancelLocked.current) setToCancel(null); }, []);
  const dismissSuccess = useCallback(() => setFeedback(null), []);
  const openCancellation = booking => {
    setRefundPreview({ loading: true, info: null, error: '' });
    setCancelError('');
    setToCancel(booking);
  };
  const acceptCancellation = useCallback(result => {
    setRevision(value => value + 1);
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
    const owner = user.id;
    setRefundRefresh({ id: booking._id, loading: true, error: '' });
    try {
      const result = await api(`/bookings/${booking._id}`);
      if (result._id !== booking._id) throw new Error('The selected booking could not be verified.');
      if (account.current !== owner) return;
      setRefundRefresh({ id: booking._id, booking: result, loading: false, error: '' });
    } catch (err) { if (account.current === owner) setRefundRefresh({ id: booking._id, loading: false, error: err.message }); }
  };
  const confirm = async () => {
    if (!toCancel || cancelLocked.current || refundPreview.loading || refundPreview.error || refundPreview.info?.eligible !== true) return;
    cancelLocked.current = true;
    setCancelling(true);
    setCancelError('');
    const owner = user.id;
    try {
      const result = isDemo ? cancelDemoBooking(toCancel._id, user.id) : await api(`/bookings/${toCancel._id}/cancel`, { method: 'PATCH' });
      if (account.current !== owner) return;
      if (!['cancelled', 'expired'].includes(result?.status)) throw new Error('Cancellation could not be confirmed. Refresh booking information to check its status.');
      acceptCancellation(isDemo ? { ...result, cancellation: demoCancellationInfo(result) } : result);
    } catch (err) {
      if (account.current !== owner) return;
      setCancelError(err.message);
      if (!isDemo) {
        try {
          const current = await api(`/bookings/${toCancel._id}`);
          if (account.current !== owner) return;
          if (current._id !== toCancel._id) throw new Error('The selected booking could not be verified.');
          if (['cancelled', 'expired'].includes(current.status)) acceptCancellation(current);
          else setRefundPreview({ loading: false, info: current.cancellation, error: '' });
        } catch {
          if (account.current !== owner) return;
          setRefundPreview({ loading: false, info: null, error: 'Cancellation status could not be checked. Refresh before trying to cancel again.' });
        }
      }
    }
    finally { cancelLocked.current = false; setCancelling(false); }
  };
  return <div className="bookings-page wallet-timeline-page fade-in"><div className="wallet-heading"><div><span className="eyebrow">Your wallet</span><h1>My tickets</h1></div>{!loading && !error && upcoming.length > 0 && <Link to="/movies" className="btn btn-primary">Browse movies</Link>}</div>
    {isDemo && <p className="demo-note">Simulated bookings saved in this browser. These are not admission tickets.</p>}
    {feedback && <CancellationSuccess key={feedback.id} reference={feedback.reference} refund={feedback.refund} onDismiss={dismissSuccess} />}
    {<div className={'wallet-content-grid' + (upcoming.length ? ' has-upcoming' : '')}><section className="wallet-section wallet-upcoming-section"><h2 className="eyebrow">Upcoming{upcomingPage.total > 0 && <> · {upcomingPage.total} {upcomingPage.total === 1 ? 'booking' : 'bookings'}</>}</h2>{loading && <div className="loading"><div className="spinner"/></div>}{error && <div className="error-message" role="alert">{error}<button type="button" className="btn btn-secondary btn-small" onClick={upcomingPage.retry}>Try again</button></div>}{!loading && !error && (upcoming.length ? <div className="wallet-upcoming">{upcoming.map(b => <Ticket key={b._id} booking={b} onCancel={isDemo ? canCancelDemoBooking(b) ? openCancellation : undefined : openCancellation}/>)}</div> : <div className="bookings-empty"><h3>No upcoming tickets</h3><p>Choose a film and reserve your next seats.</p><Link className="btn btn-primary" to="/movies">Browse movies</Link></div>)}{upcomingPage.moreError && <p className="error-message" role="alert">{upcomingPage.moreError}</p>}{upcomingPage.hasMore && <button type="button" className="btn btn-secondary" disabled={upcomingPage.loadingMore} onClick={upcomingPage.loadMore}>{upcomingPage.loadingMore ? 'Loading…' : upcomingPage.moreError ? 'Retry upcoming tickets' : 'Load more upcoming tickets'}</button>}<p className="wallet-footnote">Cancelled tickets stay here so you can always see what happened. For refunded bookings, the price shown is the original booking amount.</p></section>
    <TicketHistory key={user?.id} accountId={user?.id} isDemo={isDemo} revision={revision} getDetail={detail} onRetryRefund={isDemo ? undefined : retryHistoryRefund} refundRefresh={refundRefresh}/></div>}
    {toCancel && <CancelBookingModal booking={{ ...toCancel, showDate: toCancel.showDate || manilaDay(detail(toCancel).when), showTime: toCancel.showTime || detail(toCancel).when.toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }) }} pending={cancelling} error={cancelError} refundInfo={refundPreview.info} refundLoading={refundPreview.loading} refundError={refundPreview.error} onRetryRefund={() => setRefundAttempt(value => value + 1)} onKeep={close} onCancel={confirm}/>}
  </div>;
}
