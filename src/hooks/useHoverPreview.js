import { useCallback, useEffect, useRef, useState } from 'react';

export const HOVER_DELAY_MS = 450; // the pointer must rest on the card before anything loads
export const EXIT_MS = 320; // matches the CSS exit animation

// Whether a hover preview makes sense on this device: a real mouse, no reduced-motion setting,
// no data-saver mode and an internet connection. Touch screens and keyboards never trigger it.
export function canHoverPreview(win = window) {
  if (!win.matchMedia) return false;
  return win.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !win.matchMedia('(prefers-reduced-motion: reduce)').matches
    && !win.navigator?.connection?.saveData
    && win.navigator?.onLine !== false;
}

// Hover preview state for one card.
//   mounted  true while the preview exists in the page (it loads the video)
//   visible  true while it should look open (drives the enter/exit animation)
export function useHoverPreview({ enabled }) {
  const [state, setState] = useState({ mounted: false, visible: false });
  const delay = useRef(0);
  const exit = useRef(0);

  const clear = () => { window.clearTimeout(delay.current); window.clearTimeout(exit.current); };
  useEffect(() => clear, []);

  const onPointerEnter = useCallback((event) => {
    if (!enabled || event.pointerType === 'touch' || event.pointerType === 'pen' || !canHoverPreview()) return;
    clear();
    delay.current = window.setTimeout(() => {
      setState({ mounted: true, visible: false });
      // One frame later so the browser has painted the closed state and can animate to open.
      window.requestAnimationFrame(() => setState({ mounted: true, visible: true }));
    }, HOVER_DELAY_MS);
  }, [enabled]);

  const onPointerLeave = useCallback(() => {
    clear();
    setState((current) => (current.mounted ? { mounted: true, visible: false } : current));
    exit.current = window.setTimeout(() => setState({ mounted: false, visible: false }), EXIT_MS);
  }, []);

  return { ...state, handlers: { onPointerEnter, onPointerLeave } };
}
