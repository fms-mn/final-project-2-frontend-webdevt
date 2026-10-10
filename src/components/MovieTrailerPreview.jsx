import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PREVIEW_WIDTH, previewPlacement, youtubePreviewUrl } from '../utils/trailerPreview';

// The floating trailer panel that opens beside a movie card while the pointer rests on it.
// `media` is { kind: 'youtube', videoId }, { kind: 'video', src } or null (no trailer yet).
// It is drawn on the page itself (not inside the card) so it can be larger than the card.
export default function MovieTrailerPreview({ media, movie, anchorRef, visible }) {
  const panelRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [place, setPlace] = useState(null);

  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      const card = anchorRef.current;
      const panel = panelRef.current;
      if (!card) return;
      setPlace(previewPlacement(
        card.getBoundingClientRect(),
        { width: document.documentElement.clientWidth, height: window.innerHeight },
        { width: PREVIEW_WIDTH, height: panel?.offsetHeight || undefined },
      ));
    };
    const schedule = () => { window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, [anchorRef]);

  const meta = [movie.duration && `${movie.duration} min`, movie.genre?.[0], movie.rating].filter(Boolean).join(' · ');

  return createPortal(
    <div
      ref={panelRef}
      className={`trailer-pop${visible && place ? ' is-open' : ''}${ready ? ' is-ready' : ''}${media ? '' : ' is-empty'} side-${place?.side || 'right'}`}
      style={place ? { left: place.left, top: place.top, width: place.width } : { visibility: 'hidden' }}
      aria-hidden="true"
    >
      <div className="trailer-pop-screen">
        {!media ? (
          <>
            <img className="trailer-pop-still" src={movie.posterUrl} alt="" />
            <span className="trailer-pop-empty">Trailer coming soon</span>
          </>
        ) : (
          <span className="trailer-pop-loader" />
        )}
        {!media ? null : media.kind === 'youtube' ? (
          <iframe
            src={youtubePreviewUrl(media.videoId)}
            title={`${movie.title} trailer preview`}
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setReady(true)}
          />
        ) : (
          <video src={media.src} muted loop autoPlay playsInline preload="auto" tabIndex={-1}
            onPlaying={() => setReady(true)} onError={() => setReady(false)} />
        )}
        <span className="trailer-pop-tag">
          <span className="trailer-pop-bars"><i /><i /><i /></span>
          Trailer
        </span>
      </div>
      <div className="trailer-pop-info">
        <strong>{movie.title}</strong>
        {meta && <span className="trailer-pop-meta">{meta}</span>}
        {movie.description && <p>{movie.description}</p>}
      </div>
    </div>,
    document.body,
  );
}
