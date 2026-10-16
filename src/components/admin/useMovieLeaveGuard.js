import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

export default function useMovieLeaveGuard({ dirty, busy, discard, register }) {
  const pending = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const blocker = useBlocker(Boolean(dirty));

  const requestLeave = useCallback((proceed = () => {}, cancel) => {
    if (pending.current) {
      // A later browser navigation must not replace an editor-close or sidebar action.
      if (!pending.current.cancel) cancel?.();
      return;
    }
    if (busy) { cancel?.(); return; }
    if (!dirty) { discard(); proceed(); return; }
    pending.current = { proceed, cancel };
    setConfirming(true);
  }, [busy, dirty, discard]);

  useEffect(() => {
    register?.(requestLeave);
    return () => register?.(null);
  }, [register, requestLeave]);

  useEffect(() => {
    if (blocker.state === 'blocked') requestLeave(() => blocker.proceed(), () => blocker.reset());
  }, [blocker, requestLeave]);

  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const keepEditing = () => {
    const action = pending.current;
    pending.current = null;
    setConfirming(false);
    action?.cancel?.();
  };
  const confirmDiscard = () => {
    const action = pending.current;
    if (!action || busy) return;
    pending.current = null;
    setConfirming(false);
    discard();
    action.proceed();
  };

  return { requestLeave, confirming, keepEditing, confirmDiscard };
}
