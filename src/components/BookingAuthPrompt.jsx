import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

export default function BookingAuthPrompt({ movieTitle, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog className="booking-auth-prompt" ref={dialog} aria-labelledby="booking-auth-title" aria-describedby="booking-auth-description" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="booking-auth-title">Continue booking {movieTitle}</h2>
    <p id="booking-auth-description">Sign in to continue booking. We’ll keep your selected movie and showing.</p>
    <p>Your seat choices are tentative. Seats are checked again after sign-in; browsing does not hold or reserve them.</p>
    <div className="booking-auth-actions"><Link className="btn btn-primary" to="/login">Sign in</Link><Link className="btn btn-secondary" to="/register">Create account</Link><button className="btn btn-secondary" type="button" onClick={onClose}>Keep browsing</button></div>
  </dialog>, document.body);
}
