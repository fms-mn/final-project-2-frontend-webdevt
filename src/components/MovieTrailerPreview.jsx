import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PREVIEW_WIDTH, peekPlacement, previewLoopTarget, previewNeedsRestart, previewPlacement, previewPlayerVars, previewVideoVisible } from '../utils/trailerPreview';
import { loadYouTubeApi } from '../utils/youtubeApi';

// The floating trailer panel that opens beside a movie card while the pointer rests on it.
// `media` is { kind: 'youtube', videoId }, { kind: 'video', src } or null (no trailer yet).
// It is drawn on the page itself (not inside the card) so it can be larger than the card.
export default function MovieTrailerPreview({ media, movie, anchorRef, visible, mode = 'hover' }) {
  const panelRef = useRef(null);
  const playerMount = useRef(null);
  const [ready, setReady] = useState(false);
  const [place, setPlace] = useState(null);

  // The trailer comes from YouTube. Its player draws a pause/play symbol, a spinner or an error
  // whenever the video is not playing, so the video stays hidden (the shimmer shows instead)
  // until YouTube says it is playing, and hides again if it pauses or buffers.
  const videoId = media?.kind === 'youtube' ? media.videoId : '';
  useEffect(() => {
    if (!videoId) return undefined;
    let disposed = false;
    let player;
    let watch = 0;
    loadYouTubeApi().then((YT) => {
      if (disposed || !playerMount.current) return;
      const target = document.createElement('div');
      playerMount.current.appendChild(target);
      player = new YT.Player(target, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        playerVars: previewPlayerVars(videoId, window.location.origin),
        events: {
          onReady: ({ target: ready }) => { ready.mute(); ready.playVideo(); },
          onStateChange: ({ data, target: p }) => {
            if (disposed) return;
            setReady(previewVideoVisible(data));
            if (previewNeedsRestart(data)) p.playVideo();
            // Keep to a short window of the trailer so the player never shows its end screen.
            window.clearInterval(watch);
            if (previewVideoVisible(data)) {
              watch = window.setInterval(() => {
                const back = previewLoopTarget(p.getCurrentTime(), p.getDuration());
                if (back !== null) p.seekTo(back, true);
              }, 400);
            }
          },
          onError: () => { if (!disposed) setReady(false); },
        },
      });
    }).catch(() => {});
    return () => {
      disposed = true;
      window.clearInterval(watch);
      player?.destroy?.();
      playerMount.current?.replaceChildren();
    };
  }, [videoId]);

  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      const card = anchorRef.current;
      const panel = panelRef.current;
      if (!card) return;
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
      const size = { width: PREVIEW_WIDTH, height: panel?.offsetHeight || undefined };
      setPlace(mode === 'peek' ? peekPlacement(viewport, size) : previewPlacement(card.getBoundingClientRect(), viewport, size));
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
  }, [anchorRef, mode]);

  const meta = [movie.duration && `${movie.duration} min`, movie.genre?.[0], movie.rating].filter(Boolean).join(' · ');

  return createPortal(
    <>
    {mode === 'peek' && <div className={`trailer-pop-backdrop${visible ? ' is-open' : ''}`} aria-hidden="true" />}
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
          <div className="trailer-pop-player" ref={playerMount} />
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
        {mode === 'peek' && <span className="trailer-pop-hint">Release to close</span>}
      </div>
    </div>
    </>,
    document.body,
  );
}
