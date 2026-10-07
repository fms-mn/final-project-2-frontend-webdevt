import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useMovie } from '../hooks/useMovies';
import { listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { createDemoBooking, getBookedSeats } from '../data/demoBookings';
import BookingConfirmationModal from '../components/BookingConfirmationModal';

const ROWS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const SEATS_PER_ROW = 10;

function ChairShape({ label }) {
  return <><span className="chair-backrest" /><span className="chair-cushion" /><span className="chair-label">{label}</span></>;
}

export function toggleSeatSelection(selectedSeats, seatId, bookedSeats) {
  if (bookedSeats.includes(seatId)) return selectedSeats;
  return selectedSeats.includes(seatId)
    ? selectedSeats.filter((seat) => seat !== seatId)
    : [...selectedSeats, seatId];
}

function getNextDays(count) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialSelection(movieId) {
  const slots = listShowtimes(movieId);
  const firstFuture = slots.find((slot) => new Date(`${formatDate(new Date())}T${slot.time}:00`).getTime() > Date.now());
  const date = new Date();
  if (!firstFuture) date.setDate(date.getDate() + 1);
  return { date: formatDate(date), time: (firstFuture || slots[0])?.time || '' };
}

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const { movie, loading, notFound, error, reload, isDemo } = useMovie(id);
  const previewBooking = isDemo || user?.id === 'demo-user';
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('date') || initialSelection(id).date);
  const [selectedTime, setSelectedTime] = useState(() => searchParams.get('time') || initialSelection(id).time);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState(() => searchParams.get('showtime') || '');
  const [liveSlots, setLiveSlots] = useState([]);
  const [liveSeats, setLiveSeats] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [booking, setBooking] = useState(false);
  const bookingLocked = useRef(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [mobileBarHeight, setMobileBarHeight] = useState(128);
  const [seatMapScrollable, setSeatMapScrollable] = useState(false);
  const seatMapRef = useRef(null);
  const mobileBarRef = useRef(null);
  const reviewRef = useRef(null);

  const dates = getNextDays(7);
  const showtimes = previewBooking ? listShowtimes(id) : liveSlots;
  const selectedSlot = showtimes.find((slot) => slot.id === selectedShowtimeId) || showtimes.find((slot) => slot.time === selectedTime);
  const auditorium = previewBooking ? listAuditoriums().find((item) => item.id === selectedSlot?.auditoriumId) : liveSeats?.auditorium;
  const bookedSeats = previewBooking ? (movie ? getBookedSeats(id, selectedDate, selectedTime) : []) : (liveSeats?.seats || []).filter(seat => seat.status === 'booked').map(seat => seat.label);
  const seatsPerRow = auditorium?.seatsPerRow ?? SEATS_PER_ROW;
  const seatCapacity = auditorium?.capacity ?? (auditorium?.rows && auditorium?.seatsPerRow ? auditorium.rows * auditorium.seatsPerRow : 8 * SEATS_PER_ROW);
  const visibleRows = ROWS.slice(0, Math.ceil(seatCapacity / seatsPerRow));
  const aisleAfter = seatsPerRow >= 6 && seatsPerRow % 2 === 0 ? seatsPerRow / 2 - 1 : -1;
  const showtimeUnavailable = !selectedSlot || (previewBooking ? new Date(`${selectedDate}T${selectedTime}:00`).getTime() <= Date.now() : (!liveSeats || liveSeats.showtime?._id !== selectedSlot._id || new Date(selectedSlot.startTime).getTime() <= Date.now()));
  const ticketPrice = previewBooking ? movie?.price || 0 : (selectedSlot?.ticketPrice || 0) / 100;
  const isBookable = movie?.status === 'now_showing' && user?.role !== 'admin';
  const isComingSoon = movie?.status === 'coming_soon';

  useEffect(() => {
    if (previewBooking || !movie) return;
    const controller = new AbortController();
    api(`/showtimes?movie=${encodeURIComponent(id)}&date=${selectedDate}`, { signal: controller.signal })
      .then(slots => setLiveSlots(slots.map(slot => ({ ...slot, id: slot._id, time: new Date(slot.startTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false }) }))))
      .catch(error => { if (error.name !== 'AbortError') setBookingError(error.message); });
    return () => controller.abort();
  }, [id, selectedDate, previewBooking, movie]);

  useEffect(() => {
    if (!previewBooking && liveSlots.length && !liveSlots.some(slot => slot.time === selectedTime)) {
      setSelectedTime(liveSlots[0].time);
    }
  }, [previewBooking, liveSlots, selectedTime]);

  useEffect(() => {
    if (previewBooking || !selectedSlot) { setLiveSeats(null); return; }
    const controller = new AbortController();
    api(`/showtimes/${selectedSlot._id}/seats`, { signal: controller.signal })
      .then(setLiveSeats).catch(error => { if (error.name !== 'AbortError') setBookingError(error.message); });
    return () => controller.abort();
  }, [previewBooking, selectedSlot?._id]);

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
    setBookingError('');
    setReviewing(false);
    if (bookingSuccess) {
      bookingLocked.current = false;
      setBookingSuccess(null);
      setSelectedSeats([seatId]);
    } else {
      setSelectedSeats((prev) => toggleSeatSelection(prev, seatId, bookedSeats));
    }
  };

  const closeConfirmation = useCallback(() => setConfirmationOpen(false), []);

  const reviewBooking = () => {
    if (selectedSeats.length === 0 || showtimeUnavailable || booking || bookingSuccess) return;
    setReviewing(true);
    requestAnimationFrame(() => {
      reviewRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      reviewRef.current?.focus({ preventScroll: true });
    });
  };

  const handleBooking = async () => {
    if (!reviewing || bookingLocked.current || booking || bookingSuccess || showtimeUnavailable) return;
    if (!user || user.role !== 'user') {
      navigate(user?.role === 'admin' ? '/admin' : '/login', { state: { from: { pathname: `/movie/${id}`, search: '', hash: '' } } });
      return;
    }

    if (selectedSeats.length === 0) return;

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
        showTime: selectedTime,
      }) : await api('/bookings', { method: 'POST', body: { showtime: selectedSlot._id, seats: selectedSeats } });
      if (!previewBooking) api(`/showtimes/${selectedSlot._id}/seats`).then(setLiveSeats).catch(() => {});
      setBookingSuccess(result);
      setConfirmationOpen(true);
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
    <div className={`movie-detail booking-experience fade-in ${isComingSoon ? 'coming-soon-detail' : ''} ${isBookable ? 'booking-active' : ''}`} style={{ '--booking-mobile-bar-height': `${mobileBarHeight}px` }}>
      {isDemo && <p className="demo-catalog-notice">Preview catalog · This is a sample movie.</p>}
      {isBookable && (
        <nav className="booking-progress" aria-label="Booking progress">
          <span className="booking-progress-mobile" aria-current="step">Step {confirmationOpen ? 4 : reviewing ? 3 : 2} of 4 · {confirmationOpen ? 'Complete' : reviewing ? 'Review booking' : 'Choose seats'}</span>
          <Link to="/movies"><span>01</span> Choose a movie</Link>
          <span className={confirmationOpen || reviewing ? '' : 'current'} aria-current={confirmationOpen || reviewing ? undefined : 'step'}><span>02</span> Choose seats</span>
          <span className={reviewing && !confirmationOpen ? 'current' : ''} aria-current={reviewing && !confirmationOpen ? 'step' : undefined}><span>03</span> Review booking</span>
          <span className={confirmationOpen ? 'current' : ''} aria-current={confirmationOpen ? 'step' : undefined}><span>04</span> Complete</span>
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
            {isComingSoon && <span className="booking-eyebrow">Coming Soon</span>}
            {isBookable && <span className="booking-eyebrow">Choose your seats</span>}
            <h1>{movie.title}</h1>
            {isBookable && <p className="booking-mobile-context">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-PH',{weekday:'short',day:'numeric',month:'short'})} · {auditorium?.name || 'Cinema'}</p>}
            <div className="movie-detail-tags">
              {movie.genre.map((g) => (
                <span key={g} className="tag">{g}</span>
              ))}
              <span className="tag">⭐ {movie.rating}</span>
            </div>
            <p>{movie.description}</p>
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
              {!isComingSoon && <div className="stat">
                <span className="stat-label">Price</span>
                <span className="stat-value stat-price">₱{ticketPrice}</span>
              </div>}
            </div>
          </div>
        </div>
      </div>
      </aside>

      <div className="booking-main">
      {isBookable && (
        <div className="booking-section">
          <div className="booking-heading">
            <div>
              <span className="booking-eyebrow">Your cinema experience</span>
              <h2>Choose your seats</h2>
              <p>Pick a showtime, then choose your favorite seats below.</p>
            </div>
            <span className="booking-price">₱{movie.price} <small>/ seat</small></span>
          </div>

          <div className="booking-schedule">
          <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Select Date
          </h3>
          <div className="date-selector">
            {dates.map((date) => {
              const dateStr = formatDate(date);
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return (
                <button
                  key={dateStr}
                  className={`date-btn ${selectedDate === dateStr ? 'active' : ''}`}
                  onClick={() => { bookingLocked.current = false; setSelectedDate(dateStr); setSelectedShowtimeId(''); setSelectedSeats([]); setBookingSuccess(null); setBookingError(''); setReviewing(false); }}
                  disabled={booking}
                >
                  <span className="day-name">{dayNames[date.getDay()]}</span>
                  <span className="day-num">{date.getDate()}</span>
                  <span className="month">{monthNames[date.getMonth()]}</span>
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
            {showtimes.length === 0 && <p>No showtimes are scheduled for this movie.</p>}
            {showtimes.map((slot) => (
              <button
                key={slot.id}
                className={`showtime-btn ${selectedSlot?.id === slot.id ? 'active' : ''}`}
                onClick={() => { bookingLocked.current = false; setSelectedTime(slot.time); setSelectedShowtimeId(slot.id); setSelectedSeats([]); setBookingSuccess(null); setBookingError(''); setReviewing(false); }}
                disabled={booking || (previewBooking ? new Date(`${selectedDate}T${slot.time}:00`).getTime() <= Date.now() : new Date(slot.startTime).getTime() <= Date.now())}
              >
                {slot.time}
              </button>
            ))}
          </div>
          </div>
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
          </p>
          </div>

          {/* Booking Summary */}
          {selectedSlot && (
            <div className={`booking-summary ${reviewing ? 'is-reviewing' : ''}`} ref={reviewRef} tabIndex={-1}>
              <span className="booking-eyebrow">Your ticket</span><h3>{movie.title}</h3>
              <div className="summary-row">
                <span className="label">Movie</span>
                <span className="value">{movie.title}</span>
              </div>
              <div className="summary-row">
                <span className="label">Date</span>
                <span className="value">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-PH',{weekday:'short',day:'numeric',month:'short'})}</span>
              </div>
              <div className="summary-row">
                <span className="label">Room</span>
                <span className="value">{auditorium?.name || 'Cinema'}</span>
              </div>
              <div className="summary-row">
                <span className="label">Time</span>
                <span className="value">{selectedTime}</span>
              </div>
              <div className="summary-row">
                <span className="label">Seats</span>
                <span className="value">{[...selectedSeats].sort().join(', ')}</span>
              </div>
              <div className="summary-row">
                <span className="label">Price per seat</span>
                <span className="value">₱{ticketPrice}</span>
              </div>
              <div className="summary-row summary-total">
                <span className="label">Total</span>
                <span className="value">₱{(selectedSeats.length * ticketPrice).toLocaleString('en-PH')}</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                onClick={bookingSuccess ? () => { bookingLocked.current = false; setBookingSuccess(null); setSelectedSeats([]); setBookingError(''); } : reviewing ? handleBooking : reviewBooking}
                disabled={booking || selectedSeats.length === 0 || showtimeUnavailable}
                aria-busy={booking}
              >
                {booking ? 'Processing...' : bookingSuccess ? 'Book another showing' : reviewing ? `Confirm Booking · ₱${(selectedSeats.length * ticketPrice).toLocaleString('en-PH')}` : 'Continue to Confirmation'}
              </button>
              {bookingError && <p className="booking-submit-error" role="alert">{bookingError}</p>}
            </div>
          )}
        </div>
      )}
      </div>
      </div>

      {isBookable && !bookingSuccess && (
        <div className="booking-mobile-bar" ref={mobileBarRef}>
          {bookingError && <p className="booking-mobile-error" role="alert">{bookingError}</p>}
          <div className="booking-mobile-total">
            <span>{reviewing ? 'Total' : `${selectedSeats.length} ${selectedSeats.length === 1 ? 'seat' : 'seats'} selected`}</span>
            <strong>₱{(selectedSeats.length * ticketPrice).toLocaleString('en-PH')}</strong>
          </div>
          <button type="button" className="btn btn-primary" onClick={reviewing ? handleBooking : reviewBooking} disabled={selectedSeats.length === 0 || showtimeUnavailable || booking} aria-busy={booking}>
            {booking ? 'Processing...' : reviewing ? 'Confirm Booking' : 'Continue to Confirmation'}
          </button>
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
      {confirmationOpen && bookingSuccess && (
        <BookingConfirmationModal
          booking={bookingSuccess}
          onClose={closeConfirmation}
          onViewBookings={() => navigate('/my-bookings')}
        />
      )}
    </div>
  );
}
