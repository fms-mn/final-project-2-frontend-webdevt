import { useEffect, useRef } from 'react';

// The error and success messages every admin screen shows above its content. A new message is
// scrolled into view, so an action taken far down a long list still shows its result.
export default function Feedback({ error, notice }) {
  const errorBox = useRef(null);
  const noticeBox = useRef(null);
  const message = error || notice;
  useEffect(() => {
    if (!message) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    (errorBox.current || noticeBox.current)?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [message]);
  return (
    <>
      {error && <div className="error-message" role="alert" ref={errorBox}>{error}</div>}
      {notice && <div className="admin-notice" role="status" ref={noticeBox}>{notice}</div>}
    </>
  );
}
