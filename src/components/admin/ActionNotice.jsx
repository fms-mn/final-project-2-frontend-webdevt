import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiCheck, FiInfo, FiX } from 'react-icons/fi';
import { lockPageScroll } from '../../utils/pageLock';
import './scheduleSuccess.css';

export default function ActionNotice({ title = 'Action completed', message, tone = 'success', onClose }) {
  const dialog = useRef(null);
  const done = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    const release = lockPageScroll();
    const element = dialog.current;
    element.showModal();
    done.current.focus();
    return () => {
      element.close();
      release();
      const target = previous?.isConnected && previous !== document.body
        ? previous : document.getElementById('admin-page-title');
      target?.focus({ preventScroll: true });
    };
  }, []);

  const Icon = tone === 'error' ? FiAlertTriangle : tone === 'info' ? FiInfo : FiCheck;
  return createPortal(
    <dialog ref={dialog} className={`schedule-success admin-action-notice admin-action-notice-${tone}`}
      aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}
      onKeyDown={event => event.stopPropagation()}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
      <button type="button" className="schedule-success-close" aria-label="Close notification" onClick={onClose}><FiX /></button>
      <span className="schedule-success-check" aria-hidden="true"><Icon /></span>
      <h2 id={titleId}>{title}</h2>
      <p id={messageId}>{message}</p>
      <div className="schedule-success-actions showing-action-success-actions">
        <button ref={done} type="button" className="schedule-success-view" onClick={onClose}>Done</button>
      </div>
    </dialog>, document.body,
  );
}
