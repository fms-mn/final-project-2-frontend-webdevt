import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canCancelDemoBooking, cancelDemoBooking, getDemoBookingReference, getDemoBookings, isUpcomingDemoBooking } from '../data/demoBookings';
import CancelBookingModal from '../components/CancelBookingModal';

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function BookingCard({ booking, onCancel }) {
  return (
    <article className="booking-card">
      <div className="booking-card-poster">
        <img src={booking.movie?.posterUrl || '/favicon.svg'} alt={booking.movie?.title || 'Movie'} />
      </div>
      <div className="booking-card-info">
        <div className="booking-card-heading">
          <div>
            <span className="booking-reference">Reference {getDemoBookingReference(booking)}</span>
            <h3>{booking.movie?.title || 'Movie no longer in catalog'}</h3>
          </div>
          <span className={`booking-status ${booking.status === 'confirmed' ? 'status-confirmed' : 'status-cancelled'}`}>
            {booking.status}
          </span>
        </div>
        <div className="booking-card-details">
          <div className="booking-detail"><span className="label">Show date</span><span className="value">{formatDate(booking.showDate)}</span></div>
          <div className="booking-detail"><span className="label">Show time</span><span className="value">{booking.showTime}</span></div>
          <div className="booking-detail"><span className="label">Seats</span><span className="value">{booking.seats.join(', ')}</span></div>
        </div>
        <div className="booking-card-footer">
          <div className="booking-total"><span>Total amount</span><strong>₱{booking.totalPrice.toLocaleString('en-PH')}</strong></div>
          {onCancel && canCancelDemoBooking(booking) && (
            <button type="button" className="btn btn-danger btn-small" onClick={() => onCancel(booking)}>Cancel Booking</button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MyBookings() {
  const { user } = useAuth();
  const bookings = user ? getDemoBookings(user.id) : [];
  const [feedback, setFeedback] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancellationError, setCancellationError] = useState('');
  const cancellationLocked = useRef(false);
  const successRef = useRef(null);

  useEffect(() => {
    if (feedback?.type === 'success') successRef.current?.focus();
  }, [feedback]);

  const closeCancellation = useCallback(() => setBookingToCancel(null), []);

  const askToCancel = (booking) => {
    if (!canCancelDemoBooking(booking)) return;
    cancellationLocked.current = false;
    setCancellationError('');
    setFeedback(null);
    setBookingToCancel(booking);
  };

  const confirmCancellation = () => {
    if (!bookingToCancel || cancellationLocked.current) return;
    cancellationLocked.current = true;
    try {
      const cancelled = cancelDemoBooking(bookingToCancel._id, user.id);
      setBookingToCancel(null);
      setFeedback({ userId: user.id, type: 'success', message: `Booking ${getDemoBookingReference(cancelled)} was cancelled. Its seats are available again.` });
    } catch (error) {
      cancellationLocked.current = false;
      setCancellationError(error.message || 'Could not cancel this booking.');
    }
  };

  const upcoming = bookings.filter(isUpcomingDemoBooking)
    .sort((a, b) => `${a.showDate}T${a.showTime}`.localeCompare(`${b.showDate}T${b.showTime}`));
  const history = bookings.filter((booking) => !isUpcomingDemoBooking(booking))
    .sort((a, b) => `${b.showDate}T${b.showTime}`.localeCompare(`${a.showDate}T${a.showTime}`));

  return (
    <div className="bookings-page fade-in">
      <h1>My Bookings</h1>
      <p>Review your tickets. To change seats or a showtime, cancel an eligible booking and book again.</p>
      <p className="demo-note" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Demo mode: bookings are saved in this browser only until the booking system is connected.
      </p>
      {feedback?.userId === user?.id && <div className="booking-feedback-success" role="status" tabIndex={-1} ref={successRef}>{feedback.message}</div>}

      <section className="bookings-group" aria-labelledby="upcoming-bookings-title">
        <div className="bookings-group-heading"><h2 id="upcoming-bookings-title">Upcoming</h2><span>{upcoming.length}</span></div>
        {upcoming.length ? upcoming.map((booking) => <BookingCard key={booking._id} booking={booking} onCancel={askToCancel} />) : (
          <div className="bookings-empty"><h3>No upcoming bookings</h3><p>Choose a movie and reserve your next seats.</p><Link to="/movies" className="btn btn-primary btn-small">Browse Movies</Link></div>
        )}
      </section>

      <section className="bookings-group" aria-labelledby="booking-history-title">
        <div className="bookings-group-heading"><h2 id="booking-history-title">History</h2><span>{history.length}</span></div>
        {history.length ? history.map((booking) => <BookingCard key={booking._id} booking={booking} />) : (
          <div className="bookings-empty"><h3>No booking history yet</h3><p>Past and cancelled bookings will appear here.</p></div>
        )}
      </section>
      {bookingToCancel && (
        <CancelBookingModal
          booking={bookingToCancel}
          error={cancellationError}
          onKeep={closeCancellation}
          onCancel={confirmCancellation}
        />
      )}
    </div>
  );
}
