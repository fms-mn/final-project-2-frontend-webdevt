import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMovie } from '../hooks/useMovies';
import { listAuditoriums, listShowtimes } from '../data/demoSchedule';
import { createDemoBooking, getBookedSeats } from '../data/demoBookings';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SEATS_PER_ROW = 10;

function ChairShape({ label }) {
  return <><span className="chair-backrest"><span className="chair-label">{label}</span></span><span className="chair-cushion" /></>;
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
  const { user } = useAuth();

  const { movie, loading, notFound, error, reload, isDemo } = useMovie(id);
  const [selectedDate, setSelectedDate] = useState(() => initialSelection(id).date);
  const [selectedTime, setSelectedTime] = useState(() => initialSelection(id).time);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const dates = getNextDays(7);
  const showtimes = listShowtimes(id);
  const selectedSlot = showtimes.find((slot) => slot.time === selectedTime);
  const auditorium = listAuditoriums().find((item) => item.id === selectedSlot?.auditoriumId);
  const bookedSeats = movie ? getBookedSeats(id, selectedDate, selectedTime) : [];
  const seatCapacity = auditorium?.capacity ?? ROWS.length * SEATS_PER_ROW;
  const visibleRows = ROWS.slice(0, Math.ceil(seatCapacity / SEATS_PER_ROW));
  const aisleAfter = SEATS_PER_ROW >= 6 && SEATS_PER_ROW % 2 === 0 ? SEATS_PER_ROW / 2 - 1 : -1;
  const showtimeUnavailable = !selectedSlot || new Date(`${selectedDate}T${selectedTime}:00`).getTime() <= Date.now();
  const isBookable = movie?.status === 'now_showing' && user?.role !== 'admin';
  const isComingSoon = movie?.status === 'coming_soon';

  const toggleSeat = (seatId) => {
    if (showtimeUnavailable) return;
    setSelectedSeats((prev) => toggleSeatSelection(prev, seatId, bookedSeats));
  };

  const handleBooking = () => {
    if (!user || user.role !== 'user') {
      navigate(user?.role === 'admin' ? '/admin' : '/login', { state: { from: { pathname: `/movie/${id}`, search: '', hash: '' } } });
      return;
    }

    if (selectedSeats.length === 0) return;

    setBooking(true);
    try {
      const result = createDemoBooking({
        userId: user.id,
        movie,
        seats: selectedSeats,
        showDate: selectedDate,
        showTime: selectedTime,
      });
      setBookingSuccess(result);
      setSelectedSeats([]);
    } catch (error) {
      alert(error.message || 'Booking failed');
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
    <div className={`movie-detail booking-experience fade-in ${isComingSoon ? 'coming-soon-detail' : ''}`}>
      {isDemo && <p className="demo-catalog-notice">Preview catalog · This is a sample movie.</p>}
      {isBookable && (
        <nav className="booking-progress" aria-label="Booking progress">
          <Link to="/movies"><span>01</span> Choose a movie</Link>
          <span className="current" aria-current="step"><span>02</span> Choose seats</span>
          <span><span>03</span> Review booking</span>
          <span><span>04</span> Complete</span>
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
            <h1>{movie.title}</h1>
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
                <span className="stat-value stat-price">₱{movie.price}</span>
              </div>}
            </div>
          </div>
        </div>
      </div>
      </aside>

      <div className="booking-main">
      {bookingSuccess && (
        <div className="booking-confirmation" role="status">
          <h3>Booking confirmed!</h3>
          <p>
            Seats: {bookingSuccess.seats.join(', ')} · Total: ₱{bookingSuccess.totalPrice}
          </p>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => navigate('/my-bookings')}
          >
            View My Bookings
          </button>
        </div>
      )}

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
          <p className="booking-demo-note" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Demo booking: showtimes, prices and seats are placeholders saved in this browser only
            until the booking system is connected.
          </p>

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
                  onClick={() => { setSelectedDate(dateStr); setSelectedSeats([]); }}
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
                className={`showtime-btn ${selectedTime === slot.time ? 'active' : ''}`}
                onClick={() => { setSelectedTime(slot.time); setSelectedSeats([]); }}
                disabled={new Date(`${selectedDate}T${slot.time}:00`).getTime() <= Date.now()}
              >
                {slot.time} · {listAuditoriums().find((item) => item.id === slot.auditoriumId)?.name || 'Cinema'}
              </button>
            ))}
          </div>
          </div>
          </div>

          <div className="booking-seat-panel">
          <div className="booking-seat-heading">
            <div><span className="booking-eyebrow">{auditorium?.name || 'Cinema'}</span><h3>Select seats</h3></div>
            <span>{selectedSeats.length} selected</span>
          </div>
          <div className="seat-map-scroll" role="region" aria-label="Cinema seat map; scroll horizontally to see all seats" tabIndex={0}>
            <div className="seat-map">
              <div className="screen-indicator">
                <div className="screen-line" aria-hidden="true" />
                <span className="screen-label">SCREEN</span>
              </div>
              <div className="seats-grid">
                {visibleRows.map((row, rowIndex) => {
                  const seatsInRow = Math.min(SEATS_PER_ROW, seatCapacity - rowIndex * SEATS_PER_ROW);
                  return (
                    <div key={row} className="seat-row">
                      <span className="seat-row-label">{row}</span>
                      {Array.from({ length: seatsInRow }).map((_, i) => {
                        const seatId = `${row}${i + 1}`;
                        const isBooked = bookedSeats.includes(seatId);
                        const isSelected = selectedSeats.includes(seatId);
                        const status = isBooked ? 'booked' : showtimeUnavailable ? 'unavailable' : isSelected ? 'selected' : 'available';
                        return (
                          <button
                            key={seatId}
                            type="button"
                            className={`seat ${isBooked ? 'seat-booked' : ''} ${isSelected ? 'seat-selected' : ''} ${i === aisleAfter && seatsInRow > i + 1 ? 'seat-aisle' : ''}`}
                            onClick={() => toggleSeat(seatId)}
                            disabled={isBooked || showtimeUnavailable}
                            aria-label={`Seat ${seatId}, ${status}`}
                            aria-pressed={isSelected}
                            title={`Seat ${seatId}: ${status}`}
                          >
                            <ChairShape label={seatId} />
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
          <p className="seat-scroll-hint">Swipe sideways to see all seats.</p>

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
          </div>

          {/* Booking Summary */}
          {selectedSeats.length > 0 && selectedSlot && (
            <div className="booking-summary">
              <h3>Booking Summary</h3>
              <div className="summary-row">
                <span className="label">Movie</span>
                <span className="value">{movie.title}</span>
              </div>
              <div className="summary-row">
                <span className="label">Date</span>
                <span className="value">{selectedDate}</span>
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
                <span className="value">₱{movie.price}</span>
              </div>
              <div className="summary-row summary-total">
                <span className="label">Total</span>
                <span className="value">₱{selectedSeats.length * movie.price}</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                onClick={handleBooking}
                disabled={booking}
              >
                {booking ? 'Processing...' : `Confirm Booking · ₱${selectedSeats.length * movie.price}`}
              </button>
            </div>
          )}
        </div>
      )}
      </div>
      </div>

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
    </div>
  );
}
