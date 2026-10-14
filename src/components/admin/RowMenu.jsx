import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMoreHorizontal } from 'react-icons/fi';

const MENU_WIDTH = 288;

// The "⋯" button on a row and the menu it opens. Each item has an icon, a name and a one-line hint,
// so the admin knows what it does before clicking. Danger items sit apart at the bottom.
//   items: [{ key, label, hint, icon, onSelect | href, danger, disabled, divider }]
// Works with the keyboard (arrows, Home/End, Escape, Tab) and on a phone it slides up from the bottom.
export default function RowMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const button = useRef(null);
  const menu = useRef(null);
  const menuId = useId();

  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus(); };

  useLayoutEffect(() => {
    if (!open) { setPlace(null); return; }
    if (window.innerWidth <= 640) { setPlace({ sheet: true }); return; }
    const anchor = button.current.getBoundingClientRect();
    const height = menu.current?.offsetHeight || 0;
    const below = anchor.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, anchor.top - height - 6) : below;
    setPlace({ top, left: Math.max(8, Math.min(anchor.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)) });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    menu.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus({ preventScroll: true });
    const openedWidth = window.innerWidth;
    const sheet = openedWidth <= 640;
    const onPointer = (event) => { if (!menu.current?.contains(event.target) && !button.current?.contains(event.target)) close(false); };
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key === 'Tab') { close(false); return; }
      const entries = [...menu.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')];
      const at = entries.indexOf(document.activeElement);
      const move = (index) => { event.preventDefault(); entries[(index + entries.length) % entries.length]?.focus(); };
      if (event.key === 'ArrowDown') move(at + 1);
      else if (event.key === 'ArrowUp') move(at < 0 ? -1 : at - 1);
      else if (event.key === 'Home') move(0);
      else if (event.key === 'End') move(-1);
    };
    // A phone's address bar changes the height while scrolling, so only a real width change closes it,
    // and the sheet stays open when the page behind it moves.
    const onResize = () => { if (window.innerWidth !== openedWidth) close(false); };
    const onScroll = (event) => { if (!sheet && !menu.current?.contains(event.target)) close(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (item) => { if (item.disabled) return; close(false); item.onSelect?.(); };
  const visible = items.filter(Boolean);

  return (
    <>
      <button ref={button} type="button" className="movie-button movie-button-outline movie-more" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((value) => !value)}>
        <FiMoreHorizontal aria-hidden="true" />
      </button>
      {open && createPortal(
        <>
          {place?.sheet && <div className="movie-menu-scrim" aria-hidden="true" />}
          <div ref={menu} id={menuId} role="menu" aria-label={label} className={`movie-popover${place?.sheet ? ' is-sheet' : ''}`}
            style={place && !place.sheet ? { top: place.top, left: place.left, width: MENU_WIDTH } : place ? undefined : { visibility: 'hidden', top: 0, left: 0, width: MENU_WIDTH }}>
            {visible.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  {Icon && <span className="movie-popover-icon" aria-hidden="true"><Icon /></span>}
                  <span className="movie-popover-text"><b>{item.label}</b>{item.hint && <small>{item.hint}</small>}</span>
                </>
              );
              const className = `movie-popover-item${item.danger ? ' is-danger' : ''}`;
              return (
                <div key={item.key} role="none" className={item.divider ? 'movie-popover-divider' : undefined}>
                  {item.href
                    ? <a role="menuitem" className={className} href={item.href} target="_blank" rel="noreferrer" onClick={() => close(false)}>{content}</a>
                    : <button type="button" role="menuitem" className={className} aria-disabled={item.disabled || undefined} onClick={() => choose(item)}>{content}</button>}
                </div>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
