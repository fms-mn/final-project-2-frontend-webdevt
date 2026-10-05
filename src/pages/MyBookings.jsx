import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canCancelDemoBooking, cancelDemoBooking, getDemoBookings } from '../data/demoBookings';

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    setBookings(user ? getDemoBookings(user.id) : []);
  }, [user]);

  const cancelBooking = (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      cancelDemoBooking(bookingId, user.id);
      setBookings(getDemoBookings(user.id));
    } catch (error) {
      alert(error.message || 'Failed to cancel booking');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bookings-page fade-in">
      <h1>My Bookings</h1>
      <p>View and manage your movie bookings</p>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎟</div>
          <h3>No bookings yet</h3>
          <p>Browse our movies and book your first ticket!</p>
          <Link to="/movies" className="btn btn-primary">
            Browse Movies
          </Link>
        </div>
      ) : (
        bookings.map((booking) => (
          <div key={booking._id} className="booking-card">
            <div className="booking-card-poster">
              <img
                src={booking.movie?.posterUrl || 'https://via.placeholder.com/100x150'}
                alt={booking.movie?.title || 'Movie'}
              />
            </div>
            <div className="booking-card-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3>{booking.movie?.title || 'Movie'}</h3>
                <span className={`booking-status ${booking.status === 'confirmed' ? 'status-confirmed' : 'status-cancelled'}`}>
                  {booking.status}
                </span>
              </div>

              <div className="booking-card-details">
                <div className="booking-detail">
                  <span className="label">Date</span>
                  <span className="value">{formatDate(booking.showDate)}</span>
                </div>
                <div className="booking-detail">
                  <span className="label">Time</span>
                  <span className="value">{booking.showTime}</span>
                </div>
                <div className="booking-detail">
                  <span className="label">Seats</span>
                  <span className="value">{booking.seats.join(', ')}</span>
                </div>
              </div>

              <div className="booking-card-footer">
                <span className="booking-total">₱{booking.totalPrice}</span>
                {canCancelDemoBooking(booking) && (
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => cancelBooking(booking._id)}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
