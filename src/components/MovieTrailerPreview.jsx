import { useState } from 'react';
import { youtubePreviewUrl } from '../utils/trailerPreview';

// The small "screen" that opens over a poster while the pointer rests on a movie card.
// `media` is { kind: 'youtube', videoId } or { kind: 'video', src }.
export default function MovieTrailerPreview({ media, title, visible }) {
  const [ready, setReady] = useState(false);

  return (
    <div className={`movie-card-preview${visible ? ' is-open' : ''}${ready ? ' is-ready' : ''}`} aria-hidden="true">
      <div className="movie-card-preview-screen">
        <span className="movie-card-preview-loader" />
        {media.kind === 'youtube' ? (
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
        Trailer
      </span>
    </div>
  );
}
