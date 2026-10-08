import { useEffect, useRef } from 'react';

let apiPromise;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => {
        apiPromise = undefined;
        reject(new Error('The trailer player did not respond.'));
      }, 8000);
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        apiPromise = undefined;
        reject(new Error('The trailer player could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

export default function HeroTrailer({ videoId, onFailure }) {
  const mountRef = useRef(null);
  const failureRef = useRef(onFailure);
  failureRef.current = onFailure;

  useEffect(() => {
    let disposed = false;
    let player;
    const mount = mountRef.current;
    loadYouTubeApi().then((YT) => {
      if (disposed) return;
      const target = document.createElement('div');
      mount.appendChild(target);
      player = new YT.Player(target, {
        videoId,
        playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (event) => event.target.playVideo(),
          onError: () => failureRef.current?.(),
        },
      });
    }).catch(() => { if (!disposed) failureRef.current?.(); });
    return () => {
      disposed = true;
      player?.destroy();
      mount.replaceChildren();
    };
  }, [videoId]);

  return <div className="cinema-player" ref={mountRef} aria-label="Movie trailer player" />;
}
