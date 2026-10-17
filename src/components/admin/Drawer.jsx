import { lockPageScroll } from '../../utils/pageLock';
import { useEffect, useRef } from 'react';

// A panel that slides in from the right over the page: closes with Esc or a click outside,
// keeps the keyboard inside while open, and gives focus back when it closes.
// It reuses the look of the movie editor (see adminMovies.css).
export default function Drawer({ title, onClose, children, wide = false, className = '' }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const releasePage = lockPageScroll();
    panel.current?.querySelector('input:not([type=hidden]), select, textarea, button.drawer-first')?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')].filter((item) => item.offsetParent !== null);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      releasePage();
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="movie-drawer-layer">
      <button type="button" className="movie-drawer-backdrop" aria-label="Close panel" onClick={onClose} tabIndex={-1} />
      <aside ref={panel} className={`movie-drawer admin-drawer${wide ? ' admin-drawer-wide' : ''}${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-labelledby="admin-drawer-title">
        <div className="movie-drawer-head">
          <h2 id="admin-drawer-title">{title}</h2>
          <button type="button" className="movie-icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="movie-editor-scroll admin-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
