import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDemoBookingReference } from '../data/demoBookings';
import { listAuditoriums } from '../data/demoSchedule';

export default function BookingConfirmationModal({ booking, onClose, onViewBookings }) {
  const dialogRef = useRef(null);
  const overlayRef = useRef(null);
  const feedbackTimer = useRef(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    const previousFocus = document.activeElement;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert;
    const previousOverflow = document.body.style.overflow;
    const previousPageOverflow = document.documentElement.style.overflow;
    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.focus({ preventScroll: true });
    const resetScroll = requestAnimationFrame(() => overlayRef.current?.scrollTo(0, 0));

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
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousPageOverflow;
      cancelAnimationFrame(resetScroll);
      clearTimeout(feedbackTimer.current);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  const when = booking.showtime?.startTime ? new Date(booking.showtime.startTime) : new Date(`${booking.showDate}T${booking.showTime}:00`);
  const showDate = when.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' });
  const showTime = booking.showtime?.startTime ? when.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false }) : booking.showTime;
  const code = booking.bookingCode || getDemoBookingReference(booking);
  const auditoriumName = booking.auditorium?.name || listAuditoriums().find((room) => room.id === booking.auditoriumId)?.name || 'Cinema';
  const price = booking.totalAmount != null ? booking.totalAmount / 100 : booking.totalPrice;
  const unitPrice = booking.unitPrice != null ? booking.unitPrice / 100 : price / booking.seats.length;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback('Copied!');
    } catch {
      setCopyFeedback('Could not copy. Select the code above.');
    }
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCopyFeedback(''), 2500);
  };

  return createPortal(
    <div className="booking-modal-overlay confirmation-overlay" ref={overlayRef}>
      <section className="booking-modal confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" aria-describedby="booking-modal-reference" ref={dialogRef} tabIndex={-1}>
        <span className="booking-eyebrow">Booking confirmed</span>
        <h2 id="booking-modal-title">See you at {showTime}</h2>
        <p id="booking-modal-reference" className="booking-modal-reference">Show this code at the cinema. Your ticket is also in My tickets.</p>
        <div className="confirmation-ticket">
          <div className="confirmation-main">
            <div className="confirmation-brand"><img src="/filme-mark.svg" alt="" /> FILME <span>ADMIT {booking.seats.length}</span></div>
            <h3>{booking.movie?.title || 'Your film'}</h3>
            <dl><div><dt>Date</dt><dd>{showDate}</dd></div><div><dt>Time</dt><dd>{showTime}</dd></div><div><dt>Cinema</dt><dd>{auditoriumName}</dd></div><div><dt>Seats</dt><dd>{booking.seats.join(' · ')}</dd></div></dl>
          </div>
          <div className="confirmation-stub">
            <small>Booking code</small>
            <strong>{code}</strong>
            <button type="button" className="confirmation-copy" onClick={copyCode}>Copy code</button>
            <span className="confirmation-copy-feedback" role="status" aria-live="polite">{copyFeedback}</span>
            <div className="ticket-bars" aria-hidden="true"/>
            <div className="confirmation-price"><span>{booking.seats.length} × ₱{unitPrice.toLocaleString('en-PH')}</span><b>₱{price.toLocaleString('en-PH')}</b></div>
          </div>
        </div>
        <div className="booking-modal-actions">
          <button type="button" className="btn btn-dark" onClick={onViewBookings}>Go to My tickets</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Book another film</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
