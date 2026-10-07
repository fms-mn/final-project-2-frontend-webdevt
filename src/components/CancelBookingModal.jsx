import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getDemoBookingReference } from '../data/demoBookings';

export default function CancelBookingModal({ booking, error, onKeep, onCancel }) {
  const dialogRef = useRef(null);
  const keepButtonRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert;
    if (appRoot) appRoot.inert = true;
    keepButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onKeep();
      }
      if (event.key === 'Tab') {
        const buttons = [...dialogRef.current.querySelectorAll('button')];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (appRoot) appRoot.inert = wasInert;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onKeep]);

  const showtime = `${new Date(`${booking.showDate}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })} · ${booking.showTime}`;

  return createPortal(
    <div className="booking-modal-overlay">
      <section className="booking-modal booking-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title" aria-describedby="cancel-modal-explanation" ref={dialogRef}>
        <span className="booking-modal-mark booking-modal-mark-danger" aria-hidden="true">!</span>
        <h2 id="cancel-modal-title">Cancel this booking?</h2>
        <p className="booking-modal-reference">Reference {booking.bookingCode || getDemoBookingReference(booking)}</p>
        <dl className="booking-modal-details">
          <div><dt>Movie</dt><dd>{booking.movie?.title || 'Movie'}</dd></div>
          <div><dt>Showtime</dt><dd>{showtime}</dd></div>
          <div><dt>Seats</dt><dd>{booking.seats.join(', ')}</dd></div>
        </dl>
        <p id="cancel-modal-explanation" className="booking-cancel-explanation">Your seats will become available again. This booking will remain in History as Cancelled.</p>
        {error && <p className="booking-submit-error" role="alert">{error}</p>}
        <div className="booking-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onKeep} ref={keepButtonRef}>Keep Booking</button>
          <button type="button" className="btn btn-danger" onClick={onCancel}>Cancel Booking</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
