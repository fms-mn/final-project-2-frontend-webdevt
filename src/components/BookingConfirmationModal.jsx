import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getDemoBookingReference } from '../data/demoBookings';

export default function BookingConfirmationModal({ booking, onClose, onViewBookings }) {
  const dialogRef = useRef(null);
  const viewButtonRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert;
    if (appRoot) appRoot.inert = true;
    viewButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
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
  }, [onClose]);

  const showDate = new Date(`${booking.showDate}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });

  return createPortal(
    <div className="booking-modal-overlay">
      <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" aria-describedby="booking-modal-reference" ref={dialogRef}>
        <span className="booking-modal-mark" aria-hidden="true">✓</span>
        <span className="booking-eyebrow">04 Complete</span>
        <h2 id="booking-modal-title">Booking Confirmed</h2>
        <p id="booking-modal-reference" className="booking-modal-reference">Reference {getDemoBookingReference(booking)}</p>
        <dl className="booking-modal-details">
          <div><dt>Movie</dt><dd>{booking.movie.title}</dd></div>
          <div><dt>Date</dt><dd>{showDate}</dd></div>
          <div><dt>Showtime</dt><dd>{booking.showTime}</dd></div>
          <div><dt>Seats</dt><dd>{booking.seats.join(', ')}</dd></div>
          <div className="booking-modal-total"><dt>Total amount</dt><dd>₱{booking.totalPrice.toLocaleString('en-PH')}</dd></div>
        </dl>
        <div className="booking-modal-actions">
          <button type="button" className="btn btn-primary" onClick={onViewBookings} ref={viewButtonRef}>View My Bookings</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
