import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiX } from 'react-icons/fi';
import { lockPageScroll } from '../../utils/pageLock';
import { manilaClock, shortDate } from '../../utils/manila';
import { pesos } from '../../utils/adminTools';
import './scheduleSuccess.css';

export default function ShowingActionSuccess({ result, onClose, returnFocus }) {
  const dialog = useRef(null);
  const done = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const { title, message, showing } = result;

  useEffect(() => {
    const previous = document.activeElement;
    const release = lockPageScroll();
    const element = dialog.current;
    element.showModal();
    done.current.focus();
    return () => {
      element.close();
      release();
      const target = previous?.isConnected && previous !== document.body ? previous : returnFocus.current;
      target?.focus({ preventScroll: true });
    };
  }, [returnFocus]);

  return createPortal(
    <dialog ref={dialog} className="schedule-success showing-action-success" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <button type="button" className="schedule-success-close" aria-label="Close success confirmation" onClick={onClose}><FiX /></button>
      <span className="schedule-success-check" aria-hidden="true"><FiCheck /></span>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{message}</p>
      <div className="showing-action-success-details">
        <strong>{showing.movie?.title}</strong>
        <span>{shortDate(showing.startTime)} &middot; {manilaClock(showing.startTime)}</span>
        <span>{showing.auditorium?.name} &middot; {pesos(showing.ticketPrice)} per seat</span>
      </div>
      <div className="schedule-success-actions showing-action-success-actions">
        <button ref={done} type="button" className="schedule-success-view" onClick={onClose}>Done</button>
      </div>
    </dialog>, document.body,
  );
}
