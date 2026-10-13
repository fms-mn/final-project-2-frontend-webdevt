import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useMovie } from '../hooks/useMovies';
import { DEMO_RULES, isDemoSlotSafe, listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { createDemoBooking, demoRemainingSeats, getReservedDemoSeats } from '../data/demoBookings';
import { dayHeading, displayClock, manilaDay, shiftDay, today } from '../utils/manila';
import { canEnterBooking } from '../utils/bookingHero';
import MovieDetails from '../components/MovieDetails';
import BookingConfirmationModal from '../components/BookingConfirmationModal';
import { MAX_SEATS_PER_BOOKING, toggleSeatSelection } from '../utils/seatSelection';
import { bookingSchedule, chooseScheduleSelection, isScheduleSlotBookable, loadMovieSchedule } from '../utils/bookingSchedule';
export { toggleSeatSelection } from '../utils/seatSelection';

const ROWS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const SEATS_PER_ROW = 10;

function ChairShape({ label }) {
  return <><span className="chair-backrest" /><span className="chair-cushion" /><span className="chair-label">{label}</span></>;
}

const formatDate = manilaDay;

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [id, searchParams]);
  const { user } = useAuth();

  const { movie, loading, notFound, error, reload, isDemo } = useMovie(id);
  const previewBooking = isDemo && user?.isDemo;
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('date') || today());
  const [selectedTime, setSelectedTime] = useState(() => searchParams.get('time') || '');
  const [selectedShowtimeId, setSelectedShowtimeId] = useState(() => searchParams.get('showtime') || '');
  const [liveSchedule, setLiveSchedule] = useState({ movieId: '', slots: [], loading: true, error: '' });
  const [selectionNotice, setSelectionNotice] = useState('');
  const selectionInitialized = useRef(false);
  const [scheduleAttempt, setScheduleAttempt] = useState(0);
  const [scheduleError, setScheduleError] = useState('');
  const [liveSeats, setLiveSeats] = useState(null);
  const [clockRevision, refreshClock] = useState(0);
  useEffect(() => { const timer = setInterval(() => refreshClock(value => value + 1), 30000); return () => clearInterval(timer); }, []);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [booking, setBooking] = useState(false);
  const bookingLocked = useRef(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  // Paying (live bookings): `hold` is the pending booking that keeps the seats while the customer pays.
  const [hold, setHold] = useState(null);
  const [walletPayment, setWalletPayment] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const holdRef = useRef(null);
  holdRef.current = hold;
  const [mobileBarHeight, setMobileBarHeight] = useState(128);
  const [seatMapScrollable, setSeatMapScrollable] = useState(false);
  const seatMapRef = useRef(null);
  const mobileBarRef = useRef(null);
  const pageHeadingRef = useRef(null);

  useEffect(() => { selectionInitialized.current = false; setSelectionNotice(''); setSelectedDate(searchParams.get('date') || today()); setSelectedTime(searchParams.get('time') || ''); setSelectedShowtimeId(searchParams.get('showtime') || ''); setSelectedSeats([]); setBookingSuccess(null); setConfirmationOpen(false); }, [id, searchParams]);
  // Customers see every day that has showings, up to two months ahead (not only this week).
  const rangeStart = today(), rangeEnd = shiftDay(rangeStart, previewBooking ? 6 : 60);
  const demoSlots = previewBooking ? Array.from({ length: 7 }, (_, index) => shiftDay(rangeStart, index)).flatMap(date => listShowtimes(id, date).map(slot => ({ ...slot,
    startTime: `${date}T${slot.time}:00+08:00`, remainingSeats: demoRemainingSeats(id, date, slot.time),
    bookable: isDemoSlotSafe(id, date, slot.time) && Date.parse(`${date}T${slot.time}:00+08:00`) > Date.now() + DEMO_RULES.salesCutoffMinutes * 60000,
  }))) : [];
  const schedule = bookingSchedule(previewBooking ? demoSlots : liveSchedule.movieId === id ? liveSchedule.slots : [], id, rangeStart, rangeEnd);
  const scheduleLoading = !previewBooking && (liveSchedule.movieId !== id || liveSchedule.loading);
  const scheduleLoadError = !previewBooking && liveSchedule.movieId === id ? liveSchedule.error : '';
  const scheduleReady = !scheduleLoading && !scheduleLoadError;
  const dates = schedule.dates.map(date => new Date(`${date}T12:00:00+08:00`));
  const showtimes = schedule.slots.filter(slot => slot.date === selectedDate);
  const selectedSlot = showtimes.find((slot) => slot.id === selectedShowtimeId);
  const auditorium = previewBooking ? listAuditoriums().find((item) => item.id === selectedSlot?.auditoriumId) : liveSeats?.auditorium;
  const bookedSeats = previewBooking ? (movie && selectedSlot ? getReservedDemoSeats(id, selectedDate, selectedSlot.time) : []) : (liveSeats?.seats || []).filter(seat => seat.status !== 'available').map(seat => seat.label);
  const seatsPerRow = auditorium?.seatsPerRow ?? SEATS_PER_ROW;
  const seatCapacity = auditorium?.capacity ?? (auditorium?.rows && auditorium?.seatsPerRow ? auditorium.rows * auditorium.seatsPerRow : 8 * SEATS_PER_ROW);
  const visibleRows = ROWS.slice(0, Math.ceil(seatCapacity / seatsPerRow));
  const aisleAfter = seatsPerRow >= 6 && seatsPerRow % 2 === 0 ? seatsPerRow / 2 - 1 : -1;
  const verifiedShowing = previewBooking && selectedSlot ? { _id: selectedSlot.id,
    startTime: selectedDate + 'T' + selectedSlot.time + ':00+08:00',
    verified: isDemoSlotSafe(id, selectedDate, selectedSlot.time), remainingSeats: demoRemainingSeats(id, selectedDate, selectedSlot.time),
    bookable: Date.parse(selectedDate + 'T' + selectedSlot.time + ':00+08:00') > Date.now() + DEMO_RULES.salesCutoffMinutes * 60000,
  } : liveSeats && liveSeats.showtime?._id === selectedSlot?._id ? {
    ...liveSeats.showtime, verified: true, remainingSeats: liveSeats.seats.filter(seat => seat.status === 'available').length,
  } : null;
  const showtimeUnavailable = !scheduleReady || !selectedSlot || !isScheduleSlotBookable(selectedSlot) || !verifiedShowing || !canEnterBooking(verifiedShowing, user?.role);

  const ticketPrice = previewBooking ? movie?.price || 0 : (liveSeats?.showtime?.ticketPrice ?? selectedSlot?.ticketPrice ?? 0) / 100;
  // A coming-soon movie that already has showings sells advance tickets.
  const isPresale = movie?.status === 'coming_soon' && (movie?.upcomingShowings ?? 0) > 0;
  const isBookable = (movie?.status === 'now_showing' || isPresale) && user?.role !== 'admin';
  const isComingSoon = movie?.status === 'coming_soon';
  const isNotShowing = movie?.status === 'not_showing';
  const isSlotUnavailable = slot => !isScheduleSlotBookable(slot);

  useEffect(() => {
    if (!isBookable || !scheduleReady || booking || hold || bookingSuccess) return;
    const wasInitialized = selectionInitialized.current;
    const next = chooseScheduleSelection(schedule, { date: selectedDate, showtimeId: selectedShowtimeId, time: selectedTime, preserveDate: wasInitialized });
    const invalid = wasInitialized && ((selectedDate && !schedule.dates.includes(selectedDate)) || (selectedShowtimeId && (!selectedSlot || !isScheduleSlotBookable(selectedSlot) || selectedSlot.time !== selectedTime)));
    selectionInitialized.current = true;
    if (invalid || next.date !== selectedDate || (next.slot?.id || '') !== selectedShowtimeId || (next.slot?.time || '') !== selectedTime) {
      if (invalid) setSelectionNotice('Your selected showing is no longer available. Please choose another showing.');
      else if (!wasInitialized && selectedShowtimeId && next.slot?.id !== selectedShowtimeId) setSelectionNotice('That showing is no longer available. Please choose another showing.');
      setSelectedDate(next.date); setSelectedShowtimeId(next.slot?.id || ''); setSelectedTime(next.slot?.time || '');
      setSelectedSeats([]); setConfirmationOpen(false); setLiveSeats(null);
    }
  }, [isBookable, scheduleReady, liveSchedule, previewBooking, selectedDate, selectedShowtimeId, selectedTime, booking, hold, bookingSuccess, rangeStart, clockRevision]);

  useEffect(() => {
    if (previewBooking || !movie) return;
    const controller = new AbortController();
    let running = false;
    const update = async () => {
      if (running || document.hidden || holdRef.current || bookingLocked.current) return;
      running = true;
      setLiveSchedule(current => current.movieId === id ? current : { movieId: id, slots: [], loading: true, error: '' });
      try {
        const slots = await loadMovieSchedule(api, id, rangeEnd, controller.signal);
        if (!controller.signal.aborted) setLiveSchedule({ movieId: id, slots, loading: false, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setLiveSchedule(current => ({ ...current, movieId: id, loading: false, error: 'Showings unavailable. Please retry.' }));
      } finally { running = false; }
    };
    update();
    const timer = setInterval(update, 30000);
    window.addEventListener('focus', update);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', update); };
  }, [id, previewBooking, movie, scheduleAttempt, rangeEnd]);

  useEffect(() => {
    if (user?.role === 'admin' || previewBooking || !selectedSlot) { setLiveSeats(null); return; }
    const controller = new AbortController();
    setLiveSeats(null); setScheduleError('');
    api(`/showtimes/${selectedSlot._id}/seats`, { signal: controller.signal })
      .then(seats => { if (!controller.signal.aborted) setLiveSeats(seats); }).catch(error => { if (error.name !== 'AbortError') {
        setLiveSeats(null);
        if (error.status === 404 || error.status === 409) {
          setSelectedShowtimeId(''); setSelectedTime(''); setSelectedSeats([]); setConfirmationOpen(false);
          setSelectionNotice('Your selected showing is no longer available. Please choose another showing.');
          setLiveSchedule(current => ({ ...current, slots: current.slots.filter(slot => slot._id !== selectedSlot._id) }));
        } else setScheduleError('Seat availability unavailable. Please retry.');
      } });
    return () => controller.abort();
  }, [user?.role, previewBooking, selectedSlot?._id, selectedSlot?.startTime, scheduleAttempt, liveSchedule]);

  useEffect(() => {
    if (previewBooking || !liveSeats || liveSeats.showtime?._id !== selectedSlot?._id || booking || hold || bookingSuccess) return;
    const remainingSeats = liveSeats.seats.filter(seat => seat.status === 'available').length;
    const current = liveSchedule.slots.find(slot => slot._id === liveSeats.showtime._id);
    if (current && (current.remainingSeats !== remainingSeats || current.startTime !== liveSeats.showtime.startTime || (current.bookable === false) !== (liveSeats.showtime.bookable === false))) {
      setLiveSchedule(state => ({ ...state, slots: state.slots.map(slot => slot._id === current._id ? { ...slot, ...liveSeats.showtime, remainingSeats } : slot) }));
    }
  }, [liveSeats, previewBooking, selectedSlot?._id, booking, hold, bookingSuccess]);

  useEffect(() => {
    if (booking || hold || bookingSuccess || showtimeUnavailable) return;
    const unavailable = selectedSeats.filter(seat => bookedSeats.includes(seat));
    if (unavailable.length) {
      setSelectedSeats(current => current.filter(seat => !bookedSeats.includes(seat)));
      setConfirmationOpen(false);
      setSelectionNotice('Some selected seats are no longer available. Please check your selection.');
    }
  }, [liveSeats, clockRevision, selectedSeats, booking, hold, bookingSuccess, showtimeUnavailable]);

  useEffect(() => {
    const viewport = seatMapRef.current;
    if (!viewport) return;
    const update = () => setSeatMapScrollable(viewport.scrollWidth > viewport.clientWidth + 1);
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(viewport.firstElementChild);
    update();
    return () => observer.disconnect();
  }, [movie, isBookable]);

  useEffect(() => {
    const bar = mobileBarRef.current;
    if (!bar) {
      setMobileBarHeight(0);
      return;
    }
    const update = () => setMobileBarHeight(Math.ceil(bar.getBoundingClientRect().height));
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    update();
    return () => observer.disconnect();
  }, [isBookable, bookingSuccess]);

  const toggleSeat = (seatId) => {
    if (booking || showtimeUnavailable || bookedSeats.includes(seatId)) return;
    if (!bookingSuccess && !selectedSeats.includes(seatId) && selectedSeats.length >= MAX_SEATS_PER_BOOKING) {
      setBookingError('You can select a maximum of 10 seats. Deselect a seat to choose another.');
      return;
    }
    setBookingError('');
    if (bookingSuccess) {
      bookingLocked.current = false;
      setBookingSuccess(null);
      setSelectedSeats([seatId]);
    } else {
      setSelectedSeats((prev) => toggleSeatSelection(prev, seatId, bookedSeats));
    }
  };

  const refreshSeats = useCallback(() => {
    if (previewBooking || !selectedSlot) return;
    api(`/showtimes/${selectedSlot._id}/seats`).then(setLiveSeats).catch(() => {});
  }, [previewBooking, selectedSlot?._id]);

  // Gives the held seats back (best effort: they are released by themselves when the time runs out).
  const releaseHold = useCallback(() => {
    const current = holdRef.current;
    holdRef.current = null;
    setHold(null); setWalletPayment(null); setPayError(''); setPaying(false);
    return current ? api(`/bookings/${current._id}/release`, { method: 'POST' }).catch(() => {}) : Promise.resolve();
  }, []);
  useEffect(() => () => { // leaving the page while paying
    if (holdRef.current) api(`/bookings/${holdRef.current._id}/release`, { method: 'POST' }).catch(() => {});
  }, []);

  const closeConfirmation = useCallback(() => {
    if (bookingLocked.current) return;
    if (holdRef.current) releaseHold().then(refreshSeats);
    setConfirmationOpen(false);
    setBookingError('');
  }, [releaseHold, refreshSeats]);

  const holdExpired = useCallback(() => {
    releaseHold().then(refreshSeats);
    setBookingError('Your seats were released because the payment time ran out. Please confirm to reserve them again.');
  }, [releaseHold, refreshSeats]);

  const finishPaid = (paidBooking) => {
    holdRef.current = null;
    setHold(null); setWalletPayment(null); setPayError('');
    setBookingSuccess(paidBooking);
    refreshSeats();
  };

  const payFailed = (error) => {
    if (error.status === 409) { // the hold ran out, or the showing changed
      holdRef.current = null;
      setHold(null); setWalletPayment(null);
      setBookingError(error.message);
      refreshSeats();
    } else {
      setWalletPayment(null);
      setPayError(error.message || 'The payment could not be completed.');
    }
  };

  const handlePay = async (input) => {
    if (!hold || paying) return;
    setPaying(true); setPayError('');
    try {
      const result = await api(`/bookings/${hold._id}/pay`, { method: 'POST', body: input });
      if (result.awaitingApproval) setWalletPayment(result.payment);
      else finishPaid(result.booking);
    } catch (error) { payFailed(error); } finally { setPaying(false); }
  };

  const handleAuthorize = async (approve) => {
    if (!walletPayment || paying) return;
    setPaying(true); setPayError('');
    try {
      const result = await api(`/payments/${walletPayment._id}/authorize`, { method: 'POST', body: { approve } });
      finishPaid(result.booking);
    } catch (error) { payFailed(error); } finally { setPaying(false); }
  };

  const reviewBooking = () => {
    if (selectedSeats.length === 0 || selectedSeats.length > MAX_SEATS_PER_BOOKING || showtimeUnavailable || booking || bookingSuccess) return;
    setBookingError('');
    setConfirmationOpen(true);
  };

  const handleBooking = async () => {
    if (!confirmationOpen || bookingLocked.current || booking || bookingSuccess || showtimeUnavailable) return;
    if (!user || user.role !== 'user') {
      navigate(user?.role === 'admin' ? '/admin' : '/login', { state: { from: { pathname: `/movie/${id}`, search: '', hash: '' } } });
      return;
    }

    if (selectedSeats.length === 0 || selectedSeats.length > MAX_SEATS_PER_BOOKING) return;

    bookingLocked.current = true;
    setBooking(true);
    setBookingError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = previewBooking ? createDemoBooking({
        userId: user.id,
        movie,
        seats: selectedSeats,
        showDate: selectedDate,
        showTime: selectedSlot.time,
        showingId: selectedSlot.id,
      }) : await api('/bookings', { method: 'POST', body: { showtime: selectedSlot._id, seats: selectedSeats } });
      if (!previewBooking) api(`/showtimes/${selectedSlot._id}/seats`).then(setLiveSeats).catch(() => {});
      bookingLocked.current = false;
      if (result.status === 'pending') { holdRef.current = result; setHold(result); setPayError(''); } // now pay for it
      else setBookingSuccess(result);
    } catch (error) {
      bookingLocked.current = false;
      setBookingError(error.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">🎬</div>
        <h3>We couldn&apos;t load this movie</h3>
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={reload}>Try again</button>
      </div>
    );
  }

  if (notFound || !movie) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">🎬</div>
        <h3>Movie not found</h3>
      </div>
    );
  }

  return (
    <div className={`movie-detail booking-experience fade-in ${isComingSoon && !isBookable ? 'coming-soon-detail' : ''} ${isBookable ? 'booking-active' : ''} ${confirmationOpen ? 'modal-open' : ''}`} style={{ '--booking-mobile-bar-height': `${mobileBarHeight}px` }}>
      {user?.role === 'admin' && <p className="demo-catalog-notice">Admin preview — customer booking is disabled.</p>}
      {isBookable && (
        <nav className="booking-progress" aria-label="Booking progress">
          <span className="booking-progress-mobile" aria-current="step">Step {confirmationOpen ? bookingSuccess ? 4 : 3 : 2} of 4 · {confirmationOpen ? bookingSuccess ? 'Complete' : 'Review booking' : 'Choose seats'}</span>
          <Link to="/movies"><span>01</span> Choose a movie</Link>
          <span className={confirmationOpen ? '' : 'current'} aria-current={confirmationOpen ? undefined : 'step'}><span>02</span> Choose seats</span>
          <span className={confirmationOpen && !bookingSuccess ? 'current' : ''} aria-current={confirmationOpen && !bookingSuccess ? 'step' : undefined}><span>03</span> Review booking</span>
          <span className={confirmationOpen && bookingSuccess ? 'current' : ''} aria-current={confirmationOpen && bookingSuccess ? 'step' : undefined}><span>04</span> Complete</span>
        </nav>
      )}
      <div className={`booking-layout ${isBookable ? '' : 'booking-layout-single'}`}>
      <aside className="booking-film-panel">
      <div className="movie-detail-hero">
        <div className="movie-detail-backdrop">
          <img src={movie.backdropUrl || movie.posterUrl} alt={movie.title} />
        </div>
        <div className="movie-detail-info">
          <div className="movie-detail-poster">
            <img src={movie.posterUrl} alt={movie.title} />
          </div>
          <div className="movie-detail-text">
            {isComingSoon && !isBookable && <span className="booking-eyebrow">{isPresale ? 'Coming soon · Advance tickets on sale' : 'Coming Soon'}</span>}
            {isNotShowing && <span className="booking-eyebrow">No showings right now</span>}
            {isBookable && <span className="booking-eyebrow">{isPresale ? 'Coming soon · Advance tickets' : 'Choose your seats'}</span>}
            <h1 ref={pageHeadingRef} tabIndex={-1}>{movie.title}</h1>
            {isBookable && <p className="booking-mobile-context">{selectedDate ? dayHeading(selectedDate) : 'No upcoming showtimes'} · {selectedSlot ? auditorium?.name || selectedSlot.auditorium?.name || 'Cinema' : 'Select a showing'}</p>}
            <div className="movie-detail-tags">
              {movie.genre.map((g) => (
                <span key={g} className="tag">{g}</span>
              ))}
              <span className="tag">⭐ {movie.rating}</span>
            </div>
            <MovieDetails movie={movie} isDemo={isDemo} />
            {isNotShowing && <p className="movie-detail-closed" role="status">This movie has no showings to book right now. Please check back soon.</p>}
            <div className="movie-detail-stats">
              <div className="stat">
                <span className="stat-label">Duration</span>
                <span className="stat-value">{movie.duration} min</span>
              </div>
              {isComingSoon && movie.releaseDate && (
                <div className="stat stat-release">
                  <span className="stat-label">In cinemas</span>
                  <span className="stat-value">{new Date(movie.releaseDate).toLocaleDateString('en-PH', {
                    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
                  })}</span>
                </div>
              )}
              {movie.director && (
                <div className="stat">
                  <span className="stat-label">Director</span>
                  <span className="stat-value">{movie.director}</span>
                </div>
              )}
              {(isBookable || (!isComingSoon && !isNotShowing)) && <div className="stat">
                <span className="stat-label">Price</span>
                <span className="stat-value stat-price">{selectedSlot ? '\u20b1' + ticketPrice : 'Choose a showing'}</span>
              </div>}
            </div>
          </div>
        </div>
      </div>
      </aside>

      <div className="booking-main">
      {isBookable && (
        <div className="booking-section">
          <div className="booking-selection">
          <div className="booking-heading">
            <div>
              <span className="booking-eyebrow">Your cinema experience</span>
              <h2>Choose your seats</h2>
              <p>Pick a showtime, then choose your favorite seats below.</p>
            </div>
            <span className="booking-price">₱{ticketPrice} <small>/ seat</small></span>
          </div>

          {(scheduleError || scheduleLoadError) && <div className="booking-submit-error" role="alert">{scheduleError || scheduleLoadError} <button type="button" className="btn btn-secondary" onClick={() => setScheduleAttempt(value => value + 1)}>Retry</button></div>}
          {selectionNotice && <p role="status">{selectionNotice}</p>}
          {scheduleLoading ? <div className="booking-schedule" role="status">Loading upcoming showtimes…</div> : !scheduleReady ? null : !dates.length ? <div className="booking-schedule"><p role="status">No upcoming showtimes</p><Link className="btn btn-secondary" to="/movies">Browse other movies</Link></div> : <>
          <div className="booking-schedule" role="region" aria-label="Choose booking date and showtime">
          <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Select Date
          </h3>
          <div className="date-selector">
            {dates.map((date) => {
              const dateStr = formatDate(date);
              return (
                <button
                  key={dateStr}
                  className={`date-btn ${selectedDate === dateStr ? 'active' : ''}`}
                  aria-pressed={selectedDate === dateStr}
                  onClick={() => { bookingLocked.current = false; setSelectedDate(dateStr); setSelectedTime(''); setSelectedShowtimeId(''); setSelectedSeats([]); setBookingSuccess(null); setBookingError(''); setSelectionNotice(''); }}
                  disabled={booking}
                >
                  <span className="day-name">{date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' })}</span>
                  <span className="day-num">{date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' })}</span>
                  <span className="month">{date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short' })}</span>
                </button>
              );
            })}
          </div>

          </div>
          <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Select Showtime
          </h3>
          <div className="showtime-selector">
            {!!showtimes.length && !showtimes.some(slot => !isSlotUnavailable(slot)) && <p role="status">{showtimes.every(slot => slot.remainingSeats <= 0) ? 'All showtimes on this date are sold out.' : 'Booking is currently unavailable for this date.'}</p>}
            {showtimes.map((slot) => (
              <button
                key={slot.id}
                className={`showtime-btn ${selectedSlot?.id === slot.id ? 'active' : ''}`}
                onClick={() => { bookingLocked.current = false; setSelectedTime(slot.time); setSelectedShowtimeId(slot.id); setSelectedSeats([]); setBookingSuccess(null); setBookingError(''); setSelectionNotice(''); }}
                aria-label={movie.title + ', ' + displayClock(slot.time) + ', ' + (previewBooking ? listAuditoriums().find(room => room.id === slot.auditoriumId)?.name : slot.auditorium?.name || 'Cinema')}
                aria-pressed={selectedSlot?.id === slot.id}
                disabled={booking || isSlotUnavailable(slot)}
              >
                {displayClock(slot.time)} · {previewBooking ? listAuditoriums().find(room => room.id === slot.auditoriumId)?.name : slot.auditorium?.name || 'Cinema'}
                {slot.remainingSeats <= 0 ? ' · Sold out' : isSlotUnavailable(slot) ? ' · Unavailable' : ''}
              </button>
            ))}
          </div>
          </div>
          </div>

          </>}
          <div className="booking-showing-info">
          {showtimes.some(slot => !isSlotUnavailable(slot)) && <p role="status">{showtimeUnavailable ? 'Select an available showing to enable the seat map.' : (auditorium?.name || 'Cinema') + ' · ' + verifiedShowing.remainingSeats + ' seats available'}</p>}
          {selectedSlot && <p className="booking-showing-meta">{[selectedSlot.format, selectedSlot.language, selectedSlot.subtitles && 'Subtitles: ' + selectedSlot.subtitles].filter(Boolean).join(' · ')}</p>}
          </div>
          <div className="booking-seat-panel">
          <div className="screen-indicator">
            <div className="screen-line" aria-hidden="true" />
            <span className="screen-label">SCREEN</span>
          </div>
          <div className="seat-map-scroll" role="region" aria-label="Cinema seat map; scroll horizontally to see all seats" aria-describedby={seatMapScrollable ? 'seat-scroll-hint' : undefined} tabIndex={0} ref={seatMapRef}>
            <div className="seat-map">
              <div className="seats-grid">
                {visibleRows.map((row, rowIndex) => {
                  const seatsInRow = Math.min(seatsPerRow, seatCapacity - rowIndex * seatsPerRow);
                  return (
                    <div key={row} className="seat-row">
                      <span className="seat-row-label">{row}</span>
                      {Array.from({ length: seatsInRow }).map((_, i) => {
                        const seatId = `${row}${i + 1}`;
                        const isBooked = bookedSeats.includes(seatId);
                        const isSelected = !isBooked && selectedSeats.includes(seatId);
                        const status = isBooked ? 'booked' : showtimeUnavailable ? 'unavailable' : isSelected ? 'selected' : 'available';
                        return (
                          <button
                            key={seatId}
                            type="button"
                            className={`seat ${isBooked ? 'seat-booked' : ''} ${isSelected ? 'seat-selected' : ''} ${i === aisleAfter && seatsInRow > i + 1 ? 'seat-aisle' : ''}`}
                            onClick={() => toggleSeat(seatId)}
                            disabled={booking || isBooked || showtimeUnavailable}
                            aria-label={`Seat ${seatId}, ${status}`}
                            aria-pressed={isSelected}
                            title={`Seat ${seatId}: ${status}`}
                          >
                            <ChairShape label={i + 1} />
                          </button>
                        );
                      })}
                      <span className="seat-row-label">{row}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {seatMapScrollable && <p className="seat-scroll-hint" id="seat-scroll-hint">Swipe sideways to see all seats.</p>}

          {/* Legend */}
          <div className="seat-legend">
            <div className="seat-legend-item">
              <span className="seat legend-chair" aria-hidden="true"><ChairShape /></span>
              <span>Available</span>
            </div>
            <div className="seat-legend-item">
              <span className="seat seat-selected legend-chair" aria-hidden="true"><ChairShape /></span>
              <span>Selected</span>
            </div>
            <div className="seat-legend-item">
              <span className="seat seat-booked legend-chair" aria-hidden="true"><ChairShape /></span>
              <span>Booked</span>
            </div>
          </div>
          <p className="seat-selection-summary" aria-live="polite">
            Selected: {selectedSeats.length ? [...selectedSeats].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(', ') : 'None'}
            <br />{selectedSeats.length} of {MAX_SEATS_PER_BOOKING} seats selected. {selectedSeats.length >= MAX_SEATS_PER_BOOKING ? 'Limit reached. Deselect a seat to choose another.' : 'Maximum 10 seats per booking.'}
          </p>
          <div className="seat-selection-actions">
            <button type="button" className="btn btn-secondary btn-small" disabled={!selectedSeats.length || booking || !!bookingSuccess || confirmationOpen} onClick={() => { setSelectedSeats([]); setBookingError(''); }}>Unselect all</button>
          </div>
          </div>

          </div>

          {/* Booking Summary */}
            <div className="booking-summary">
              <span className="booking-eyebrow">Your ticket</span><h3>{movie.title}</h3>
              <div className="summary-row">
                <span className="label">Movie</span>
                <span className="value">{movie.title}</span>
              </div>
              <div className="summary-row">
                <span className="label">Date</span>
                <span className="value">{selectedDate ? new Date(`${selectedDate}T00:00:00+08:00`).toLocaleDateString('en-PH',{timeZone:'Asia/Manila',weekday:'short',day:'numeric',month:'short'}) : 'Not selected'}</span>
              </div>
              <div className="summary-row">
                <span className="label">Room</span>
                <span className="value">{selectedSlot ? auditorium?.name || selectedSlot.auditorium?.name || 'Cinema' : 'Select a showing'}</span>
              </div>
              <div className="summary-row">
                <span className="label">Time</span>
                <span className="value">{selectedSlot ? displayClock(selectedSlot.time) : 'Select a showtime'}</span>
              </div>
              <div className="summary-row">
                <span className="label">Seats</span>
                <span className="value">{[...selectedSeats].sort().join(', ') || 'None'}</span>
              </div>
              <div className="summary-row">
                <span className="label">Price per seat</span>
                <span className="value">{selectedSlot ? `₱${ticketPrice}` : 'Select a showing'}</span>
              </div>
              <div className="summary-row summary-total">
                <span className="label">Total</span>
                <span className="value">₱{(selectedSeats.length * ticketPrice).toLocaleString('en-PH')}</span>
              </div>
              <div className="booking-review-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={bookingSuccess ? () => { bookingLocked.current = false; setBookingSuccess(null); setSelectedSeats([]); setBookingError(''); } : reviewBooking}
                  disabled={booking || selectedSeats.length === 0 || showtimeUnavailable}
                  aria-busy={booking}
                >
                  {bookingSuccess ? 'Book another showing' : 'Continue to Confirmation'}
                </button>
              </div>
              {bookingError && <p className="booking-submit-error" role="alert">{bookingError}</p>}
            </div>
        </div>
      )}
      </div>
      </div>

      {isBookable && !bookingSuccess && (
        <div className="booking-mobile-bar" ref={mobileBarRef}>
          {bookingError && <p className="booking-mobile-error" role="alert">{bookingError}</p>}
          <div className="booking-mobile-total">
            <span>{selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected</span>
            <strong>₱{(selectedSeats.length * ticketPrice).toLocaleString('en-PH')}</strong>
          </div>
          <div className="booking-mobile-actions">
            <button type="button" className="btn btn-primary" onClick={reviewBooking} disabled={selectedSeats.length === 0 || showtimeUnavailable || booking}>
              Continue to Confirmation
            </button>
          </div>
        </div>
      )}

      {/* Cast */}
      {movie.cast && movie.cast.length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Cast</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {movie.cast.map((actor) => (
              <span key={actor} className="tag" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
                {actor}
              </span>
            ))}
          </div>
        </div>
      )}
      {confirmationOpen && (
        <BookingConfirmationModal
          draft={{ isDemo: previewBooking, movieTitle: movie.title, showDate: selectedDate, showTime: selectedSlot?.time || selectedTime, auditoriumName: auditorium?.name || 'Cinema', seats: selectedSeats, unitPrice: ticketPrice, totalPrice: selectedSeats.length * ticketPrice }}
          booking={bookingSuccess}
          pending={booking}
          error={bookingError}
          payment={hold ? { hold, walletPayment, pending: paying, error: payError, onPay: handlePay, onAuthorize: handleAuthorize, onRelease: closeConfirmation, onExpire: holdExpired } : null}
          onConfirm={handleBooking}
          onClose={closeConfirmation}
          onViewBookings={() => navigate('/my-bookings')}
          returnFocusRef={pageHeadingRef}
        />
      )}
    </div>
  );
}
