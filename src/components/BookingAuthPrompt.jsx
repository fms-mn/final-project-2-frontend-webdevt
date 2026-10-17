import { lockPageScroll } from '../utils/pageLock';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FiCheck, FiX } from 'react-icons/fi';
import { displayClock, shortDate } from '../utils/manila';
import './bookingAuthPrompt.css';

export default function BookingAuthPrompt({ movieTitle, showing, onClose, backLabel, onBack }) {
  const dialog = useRef(null);
  const signIn = useRef(null);
  const returnFocus = useRef(document.activeElement);
  const focusFrame = useRef(null);
  useEffect(() => {
    cancelAnimationFrame(focusFrame.current);
    const previousFocus = returnFocus.current;
    const releasePage = lockPageScroll();
    const element = dialog.current;
    element.showModal();
    signIn.current.focus({ preventScroll: true });
    return () => {
      element.close();
      releasePage();
      focusFrame.current = requestAnimationFrame(() => {
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      });
    };
  }, []);
  const keepFocusInDialog = event => {
    if (event.key !== 'Tab') return;
    const actions = dialog.current.querySelectorAll('a[href], button:not(:disabled)');
    const first = actions[0], last = actions[actions.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };
  return createPortal(<dialog className="booking-auth-prompt" ref={dialog} aria-labelledby="booking-auth-title" aria-describedby="booking-auth-description" onKeyDown={keepFocusInDialog} onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="booking-auth-close" type="button" onClick={onClose} aria-label="Close account prompt"><FiX aria-hidden="true" /></button>
    <div className="booking-auth-layout">
      <section className="booking-auth-story">
        <span className="booking-auth-eyebrow">Almost there</span>
        <h2 id="booking-auth-title">Sign in to continue your booking</h2>
        <div className="booking-auth-selection" aria-live="polite">
          <strong>{movieTitle}</strong>
          <p>{showing ? `${shortDate(new Date(`${showing.date}T12:00:00+08:00`))} · ${displayClock(showing.time)} · ${showing.cinema}` : 'Choose your showing after exploring the movie.'}</p>
          {showing && <p>{showing.seats.length ? `Tentative seats: ${showing.seats.join(', ')}` : 'Seats not selected yet'}</p>}
          {showing && <p>Tentative total: ₱{showing.totalPrice.toLocaleString('en-PH')}</p>}
        </div>
        <ul className="booking-auth-benefits"><li><FiCheck aria-hidden="true" />Keep your tickets in one place</li><li><FiCheck aria-hidden="true" />Get your booking confirmation</li></ul>
      </section>
      <section className="booking-auth-next" aria-label="Account options">
        <p className="booking-auth-intro" id="booking-auth-description">Sign in or create an account to continue. Your selected seats aren’t reserved yet.</p>
        <div className="booking-auth-actions"><Link ref={signIn} className="booking-auth-login" to="/login">Sign in</Link><Link className="booking-auth-create" to="/register">Create account</Link></div>
        <p className="booking-auth-context">We’ll keep your selected movie and showing.</p>
        <p className="booking-auth-disclaimer">Seat choices are tentative. No seats are held until you confirm a booking.</p>
        <button className="booking-auth-back" type="button" onClick={onBack}>{backLabel}</button>
      </section>
    </div>
  </dialog>, document.body);
}
