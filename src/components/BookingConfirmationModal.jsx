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

  const when = booking.showtime?.startTime ? new Date(booking.showtime.startTime) : new Date(`${booking.showDate}T${booking.showTime}:00`);
  const showDate = when.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' });
  const showTime = booking.showtime?.startTime ? when.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false }) : booking.showTime;
  const code = booking.bookingCode || getDemoBookingReference(booking);
  const price = booking.totalAmount != null ? booking.totalAmount / 100 : booking.totalPrice;
  const unitPrice = booking.unitPrice != null ? booking.unitPrice / 100 : price / booking.seats.length;

  return createPortal(
    <div className="booking-modal-overlay">
      <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" aria-describedby="booking-modal-reference" ref={dialogRef}>
        <span className="booking-eyebrow">Booking confirmed</span>
        <h2 id="booking-modal-title">See you at {showTime}</h2>
        <p id="booking-modal-reference" className="booking-modal-reference">Your seats are held. Show the code below at the cinema, or find this ticket any time in My tickets.</p>
        <div className="confirmation-ticket">
          <div className="confirmation-main">
            <div className="confirmation-brand"><img src="/filme-mark.svg" alt="" /> FILME <span>ADMIT {booking.seats.length}</span></div>
            <h3>{booking.movie?.title || 'Your film'}</h3>
            <dl><div><dt>Date</dt><dd>{showDate}</dd></div><div><dt>Time</dt><dd>{showTime}</dd></div><div><dt>Room</dt><dd>{booking.auditorium?.name || 'Cinema'}</dd></div><div><dt>Seats</dt><dd>{booking.seats.join(' · ')}</dd></div></dl>
          </div>
          <div className="confirmation-stub"><small>Booking code</small><strong>{code}</strong><div className="ticket-bars" aria-hidden="true"/><div className="confirmation-price"><span>{booking.seats.length} × ₱{unitPrice.toLocaleString('en-PH')}</span><b>₱{price.toLocaleString('en-PH')}</b></div></div>
        </div>
        <div className="booking-modal-actions">
          <button type="button" className="btn btn-dark" onClick={onViewBookings} ref={viewButtonRef}>Go to My tickets</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Book another film</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
