// The home banner plays the featured movie's trailer by itself, so it must stay out of the
// way of people who asked for less motion or less data.
export function canAutoplayTrailer(win = typeof window === 'undefined' ? undefined : window) {
  if (!win) return false;
  try {
    if (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const connection = win.navigator && (win.navigator.connection || win.navigator.mozConnection);
    if (connection && connection.saveData) return false;
  } catch {
    return false;
  }
  return true;
}
