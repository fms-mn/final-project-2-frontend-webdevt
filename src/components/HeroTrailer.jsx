import { useEffect, useRef, useState } from 'react';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';
import { canAutoplayTrailer } from '../utils/trailer';

// Loads YouTube's player script once for the whole app.
let apiPromise;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previous) previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        apiPromise = undefined;
        reject(new Error('The YouTube player could not be loaded'));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

// A muted, looping trailer that plays behind the banner text. The poster stays visible until the
// video is really playing, so a slow connection, a blocked script or a video that cannot be
// embedded simply leaves the normal banner. It pauses when scrolled out of view or when the tab
// is hidden, and a button turns the sound on.
export default function HeroTrailer({ videoId }) {
  const shellRef = useRef(null);
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!canAutoplayTrailer()) return undefined;
    const shell = shellRef.current;
    const mount = mountRef.current;
    let cancelled = false;
    let inView = true;
    let player = null;
    let observer = null;

    const sync = () => {
      if (!player || typeof player.playVideo !== 'function') return;
      if (inView && !document.hidden) player.playVideo();
      else player.pauseVideo();
    };
    const onVisibility = () => sync();

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        // YouTube replaces the element it is given, so give it a throwaway one inside our own.
        const target = document.createElement('div');
        mount.appendChild(target);
        player = new YT.Player(target, {
          videoId,
          playerVars: {
            autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: videoId, rel: 0, playsinline: 1,
            modestbranding: 1, disablekb: 1, fs: 0, iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              event.target.mute();
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) setPlaying(true);
            },
            onError: () => setPlaying(false),
          },
        });
        playerRef.current = player;
        if ('IntersectionObserver' in window) {
          observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            sync();
          }, { threshold: 0.2 });
          observer.observe(shell);
        }
        document.addEventListener('visibilitychange', onVisibility);
      })
      .catch(() => {}); // the banner just keeps its poster

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (observer) observer.disconnect();
      if (player && typeof player.destroy === 'function') player.destroy();
      playerRef.current = null;
      mount.replaceChildren();
      setPlaying(false);
      setMuted(true);
    };
  }, [videoId]);

  const toggleSound = () => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) {
      player.unMute();
      player.setVolume(60);
    } else {
      player.mute();
    }
    setMuted(!muted);
  };

  return (
    <>
      <div ref={shellRef} className={`hero-trailer ${playing ? 'is-playing' : ''}`} aria-hidden="true">
        <div ref={mountRef} className="hero-trailer-frame" />
      </div>
      {playing && (
        <button
          type="button"
          className="hero-sound"
          onClick={toggleSound}
          aria-pressed={!muted}
          aria-label={muted ? 'Turn trailer sound on' : 'Turn trailer sound off'}
          title={muted ? 'Sound on' : 'Sound off'}
        >
          {muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}
        </button>
      )}
    </>
  );
}
