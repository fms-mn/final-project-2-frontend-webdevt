import { useEffect, useRef } from 'react';
import ActionNotice from './ActionNotice';

// Validation stays beside the form; completed actions use the dashboard's result modal.
export default function Feedback({ error, notice, onDismissNotice, noticeTitle }) {
  const errorBox = useRef(null);
  useEffect(() => {
    if (!error) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    errorBox.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [error]);
  return (
    <>
      {error && <div className="error-message" role="alert" ref={errorBox}>{error}</div>}
      {notice && <ActionNotice title={noticeTitle} message={notice} onClose={onDismissNotice} />}
    </>
  );
}
