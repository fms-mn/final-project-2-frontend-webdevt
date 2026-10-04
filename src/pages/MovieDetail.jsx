import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SHOWTIMES } from '../constants/showtimes';
import { getMovieById } from '../data/catalog';
import { createDemoBooking, getBookedSeats } from '../data/demoBookings';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SEATS_PER_ROW = 10;

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

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const movie = getMovieById(id);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedTime, setSelectedTime] = useState(SHOWTIMES[0]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const dates = getNextDays(7);

  useEffect(() => {
    setBookedSeats(movie ? getBookedSeats(id, selectedDate, selectedTime) : []);
  }, [id, selectedDate, selectedTime, movie]);

  const toggleSeat = (seatId) => {
    if (bookedSeats.includes(seatId)) return;
    setSelectedSeats((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  const handleBooking = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (selectedSeats.length === 0) return;

    setBooking(true);
    try {
      const result = createDemoBooking({
        userId: user.id,
        movieId: id,
        seats: selectedSeats,
        showDate: selectedDate,
        showTime: selectedTime,
      });
      setBookingSuccess(result);
      setSelectedSeats([]);
      setBookedSeats(getBookedSeats(id, selectedDate, selectedTime));
    } catch (error) {
      alert(error.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (!movie) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">🎬</div>
        <h3>Movie not found</h3>
      </div>
    );
  }

  return (
    <div className="movie-detail fade-in">
      {/* Hero Banner */}
      <div className="movie-detail-hero">
        <div className="movie-detail-backdrop">
          <img src={movie.backdropUrl || movie.posterUrl} alt={movie.title} />
        </div>
        <div className="movie-detail-info">
          <div className="movie-detail-poster">
            <img src={movie.posterUrl} alt={movie.title} />
          </div>
          <div className="movie-detail-text">
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
              <div className="stat">
                <span className="stat-label">Director</span>
                <span className="stat-value">{movie.director}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Price</span>
                <span className="stat-value" style={{ color: 'var(--gold)' }}>₱{movie.price}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Success Message */}
      {bookingSuccess && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem',
          textAlign: 'center',
        }}>
          <h3 style={{ color: 'var(--success-text)', marginBottom: '0.5rem' }}>🎉 Booking Confirmed!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Seats: {bookingSuccess.seats.join(', ')} · Total: ₱{bookingSuccess.totalPrice}
          </p>
          <button
            className="btn btn-secondary btn-small"
            style={{ marginTop: '0.75rem' }}
            onClick={() => navigate('/my-bookings')}
          >
            View My Bookings
          </button>
        </div>
      )}

      {/* Booking Section */}
      {movie.status === 'now_showing' && (
        <div className="booking-section">
          <h2>🎟 Book Tickets</h2>

          {/* Date Selection */}
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

          {/* Time Selection */}
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Select Showtime
          </h3>
          <div className="showtime-selector">
            {SHOWTIMES.map((time) => (
              <button
                key={time}
                className={`showtime-btn ${selectedTime === time ? 'active' : ''}`}
                onClick={() => { setSelectedTime(time); setSelectedSeats([]); }}
              >
                {time}
              </button>
            ))}
          </div>

          {/* Screen */}
          <div className="screen-indicator">
            <div className="screen-line" />
            <span className="screen-label">Screen</span>
          </div>

          {/* Seats */}
          <div className="seats-grid">
            {ROWS.map((row) => (
              <div key={row} className="seat-row">
                <span className="seat-row-label">{row}</span>
                {Array.from({ length: SEATS_PER_ROW }).map((_, i) => {
                  const seatId = `${row}${i + 1}`;
                  const isBooked = bookedSeats.includes(seatId);
                  const isSelected = selectedSeats.includes(seatId);
                  return (
                    <button
                      key={seatId}
                      className={`seat ${isBooked ? 'seat-booked' : ''} ${isSelected ? 'seat-selected' : ''}`}
                      onClick={() => toggleSeat(seatId)}
                      disabled={isBooked}
                      title={seatId}
                    >
                      {i + 1}
                    </button>
                  );
                })}
                <span className="seat-row-label">{row}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="seat-legend">
            <div className="seat-legend-item">
              <div className="legend-box legend-available" />
              <span>Available</span>
            </div>
            <div className="seat-legend-item">
              <div className="legend-box legend-selected" />
              <span>Selected</span>
            </div>
            <div className="seat-legend-item">
              <div className="legend-box legend-booked" />
              <span>Booked</span>
            </div>
          </div>

          {/* Booking Summary */}
          {selectedSeats.length > 0 && (
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
