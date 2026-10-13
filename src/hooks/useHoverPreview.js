import { useCallback, useEffect, useRef, useState } from 'react';
import { pressMoved } from '../utils/trailerPreview.js';

export const HOVER_DELAY_MS = 450; // the pointer must rest on the card before anything loads
export const PEEK_DELAY_MS = 500; // how long a finger must stay down before the peek opens
export const EXIT_MS = 320; // matches the CSS exit animation
const CLICK_GUARD_MS = 700; // a tap right after a peek must not open the movie

const motionAllowed = (win) => !win.matchMedia('(prefers-reduced-motion: reduce)').matches
  && !win.navigator?.connection?.saveData
  && win.navigator?.onLine !== false;

// Whether a hover preview makes sense on this device: a real mouse, no reduced-motion setting,
// no data-saver mode and an internet connection. Touch screens and keyboards never trigger it.
export function canHoverPreview(win = window) {
  if (!win.matchMedia) return false;
  return win.matchMedia('(hover: hover) and (pointer: fine)').matches && motionAllowed(win);
}

// Whether a finger can peek at a trailer (press and hold): same limits, but for touch.
export function canPeekPreview(win = window) {
  if (!win.matchMedia) return false;
  return motionAllowed(win);
}

// Preview state for one card.
//   mounted  true while the preview exists in the page (it loads the video)
//   visible  true while it should look open (drives the enter/exit animation)
//   mode     'hover' (mouse rests on the card) or 'peek' (finger held down; releasing closes it)
export function useHoverPreview({ enabled }) {
  const [state, setState] = useState({ mounted: false, visible: false, mode: 'hover' });
  const delay = useRef(0);
  const exit = useRef(0);
  const pressStart = useRef(null); // { x, y } while a finger is down and the peek has not opened
  const touching = useRef(false);
  const peekedAt = useRef(0);

  const clear = () => { window.clearTimeout(delay.current); window.clearTimeout(exit.current); };
  useEffect(() => clear, []);

  const open = (mode) => {
    setState({ mounted: true, visible: false, mode });
    // One frame later so the browser has painted the closed state and can animate to open.
    window.requestAnimationFrame(() => setState({ mounted: true, visible: true, mode }));
  };
  const close = useCallback(() => {
    clear();
    setState((current) => (current.mounted ? { ...current, visible: false } : current));
    exit.current = window.setTimeout(() => setState((current) => ({ ...current, mounted: false, visible: false })), EXIT_MS);
  }, []);

  const onPointerEnter = useCallback((event) => {
    if (!enabled || event.pointerType === 'touch' || event.pointerType === 'pen' || !canHoverPreview()) return;
    clear();
    delay.current = window.setTimeout(() => open('hover'), HOVER_DELAY_MS);
  }, [enabled]);

  const onPointerDown = useCallback((event) => {
    if (event.pointerType !== 'touch') return;
    touching.current = true;
    if (!enabled || !canPeekPreview()) return;
    clear();
    pressStart.current = { x: event.clientX, y: event.clientY };
    delay.current = window.setTimeout(() => {
      pressStart.current = null;
      peekedAt.current = Date.now();
      open('peek');
    }, PEEK_DELAY_MS);
  }, [enabled]);

  // A finger that slides is scrolling, not holding: cancel the peek before it opens.
  const onPointerMove = useCallback((event) => {
    const start = pressStart.current;
    if (start && pressMoved(start, { x: event.clientX, y: event.clientY })) {
      pressStart.current = null;
      window.clearTimeout(delay.current);
    }
  }, []);

  // Lifting the finger (or the browser taking over to scroll) ends the peek.
  const onPointerEnd = useCallback((event) => {
    if (event.pointerType === 'touch') {
      pressStart.current = null;
      if (peekedAt.current) peekedAt.current = Date.now();
    }
    close();
  }, [close]);

  // Holding a link makes phones show their own menu; the peek replaces it.
  const onContextMenu = useCallback((event) => {
    if (enabled && (touching.current || state.mounted)) event.preventDefault();
  }, [enabled, state.mounted]);

  // The tap that ends a peek must not follow the link.
  const onClickCapture = useCallback((event) => {
    if (peekedAt.current && Date.now() - peekedAt.current < CLICK_GUARD_MS) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return {
    ...state,
    handlers: {
      onPointerEnter, onPointerLeave: onPointerEnd, onPointerDown, onPointerMove,
      onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onContextMenu, onClickCapture,
    },
  };
}
