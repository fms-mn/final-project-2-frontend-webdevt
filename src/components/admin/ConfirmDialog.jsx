import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiInfo, FiLoader } from 'react-icons/fi';

// A centred confirmation box for actions that change or remove things. It says what will happen in
// plain words, keeps the safe choice focused, shows why a refused action was refused, and closes
// with Escape or a click outside. `tone`: "danger" (red), "primary" or "info" (no confirm button).
export default function ConfirmDialog({
  title, children, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', busy = false, loading = false,
  error = '', onConfirm, onClose, extraAction, variant,
}) {
  const box = useRef(null);
  const titleId = useId();
  const bodyId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    box.current?.querySelector('[data-safe]')?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!busyRef.current) closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      event.stopPropagation();
      const controls = [...box.current.querySelectorAll('button:not(:disabled)')];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = oldOverflow;
      previous?.focus?.();
    };
  }, []);

  const Icon = tone === 'danger' ? FiAlertTriangle : FiInfo;
  return createPortal(
    <div className={`movie-dialog-layer${variant ? ` movie-dialog-layer-${variant}` : ''}`}>
      <button type="button" className="movie-dialog-backdrop" aria-label="Close" tabIndex={-1} onClick={() => { if (!busy) onClose(); }} />
      <div ref={box} className={`movie-dialog movie-dialog-${tone}${variant ? ` movie-dialog-${variant}` : ''}`} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <div className="movie-dialog-head">
          <span className="movie-dialog-icon" aria-hidden="true">{loading ? <FiLoader className="movie-spin" /> : <Icon />}</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <div className="movie-dialog-body" id={bodyId}>{children}</div>
        {error && <p className="movie-dialog-error" role="alert">{error}</p>}
        <div className="movie-dialog-actions">
          <button type="button" data-safe className="movie-button movie-button-outline" disabled={busy} onClick={onClose}>{cancelLabel}</button>
          {extraAction}
          {onConfirm && (
            <button type="button" className={`movie-button ${tone === 'danger' ? 'movie-button-danger' : 'movie-button-primary'}`} disabled={busy || loading} onClick={onConfirm}>
              {busy ? 'Working…' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
