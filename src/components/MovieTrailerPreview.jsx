import { useState } from 'react';
import { youtubePreviewUrl } from '../utils/trailerPreview';

// The small "screen" that opens over a poster while the pointer rests on a movie card.
// `media` is { kind: 'youtube', videoId }, { kind: 'video', src } or null (no trailer yet).
export default function MovieTrailerPreview({ media, title, poster, visible }) {
  const [ready, setReady] = useState(false);

  return (
    <div className={`movie-card-preview${visible ? ' is-open' : ''}${ready ? ' is-ready' : ''}${media ? '' : ' is-empty'}`} aria-hidden="true">
      <div className="movie-card-preview-screen">
        {!media ? (
          <>
            <img className="movie-card-preview-still" src={poster} alt="" />
            <span className="movie-card-preview-empty">Trailer coming soon</span>
          </>
        ) : (
          <span className="movie-card-preview-loader" />
        )}
        {!media ? null : media.kind === 'youtube' ? (
          <iframe
            src={youtubePreviewUrl(media.videoId)}
            title={`${title} trailer preview`}
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setReady(true)}
          />
        ) : (
          <video src={media.src} muted loop autoPlay playsInline preload="auto" tabIndex={-1}
            onPlaying={() => setReady(true)} onError={() => setReady(false)} />
        )}
      </div>
      <span className="movie-card-preview-tag">
        <span className="movie-card-preview-bars"><i /><i /><i /></span>
        {media?.kind === 'video' ? 'Sample footage · not a movie trailer' : 'Trailer'}
      </span>
    </div>
  );
}
