import { useEffect, useRef, useState } from 'react';
import { FiMaximize, FiPause, FiPlay, FiVolume2, FiVolumeX } from 'react-icons/fi';

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

function PlaybackControls({ paused, muted, onTogglePlayback, onToggleMute, onFullscreen }) {
  return <div className="cinema-playback-controls" role="group" aria-label="Trailer playback controls">
    <button type="button" onClick={onTogglePlayback} aria-label={paused ? 'Resume trailer' : 'Pause trailer'} title={paused ? 'Resume trailer' : 'Pause trailer'}>{paused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}</button>
    <button type="button" onClick={onToggleMute} aria-label={muted ? 'Unmute trailer' : 'Mute trailer'} title={muted ? 'Unmute trailer' : 'Mute trailer'}>{muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}</button>
    <button type="button" onClick={onFullscreen} aria-label="View trailer fullscreen" title="View trailer fullscreen"><FiMaximize aria-hidden="true" /></button>
  </div>;
}

function MediaFrame({ poster, label, status, controls, children }) {
  return <div className={'cinema-media-frame' + (status === 'playing' ? ' is-playing' : '')}>
    <img className="cinema-media-poster" src={poster} alt="" />
    {children}
    {label && <span className="cinema-media-label">{label}</span>}
    {(status === 'blocked' || status === 'failed') && <span className="cinema-preview-status" role="status">Preview unavailable</span>}
    {status === 'playing' && controls}
  </div>;
}

function NativeTrailer({ media, poster, active }) {
  const videoRef = useRef(null);
  const activeRef = useRef(active);
  const manualPaused = useRef(false);
  const automaticPause = useRef(false);
  const unavailable = useRef(false);
  const [status, setStatus] = useState('idle');
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(true);
  activeRef.current = active;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || unavailable.current) return;
    if (!active) {
      if (!video.paused) {
        automaticPause.current = true;
        video.pause();
      }
      return;
    }
    if (manualPaused.current || !video.paused) return;
    const attempt = video.play();
    attempt?.catch((error) => {
      if (!activeRef.current || unavailable.current || error.name === 'AbortError') return;
      unavailable.current = true;
      setStatus(error.name === 'NotAllowedError' ? 'blocked' : 'failed');
    });
  }, [active]);

  const fail = () => {
    if (unavailable.current) return;
    unavailable.current = true;
    setStatus('failed');
  };

  const controls = <PlaybackControls paused={paused} muted={muted}
    onTogglePlayback={() => { const video = videoRef.current; if (video.paused) video.play().catch(fail); else video.pause(); }}
    onToggleMute={() => { const video = videoRef.current; video.muted = !video.muted; }}
    onFullscreen={() => { videoRef.current?.requestFullscreen?.().catch(() => {}); }} />;

  return <MediaFrame poster={poster} label={media.label} status={status} controls={controls}>
    {!unavailable.current && <video ref={videoRef} className="cinema-video" src={media.src} playsInline muted preload="metadata" loop={media.loop}
      aria-label={media.label || 'Movie trailer'}
      onPlaying={() => {
        if (!activeRef.current) {
          automaticPause.current = true;
          videoRef.current?.pause();
          return;
        }
        manualPaused.current = false;
        setStatus('playing');
        setPaused(false);
      }}
      onPause={() => {
        setPaused(true);
        if (automaticPause.current) automaticPause.current = false;
        else manualPaused.current = true;
      }}
      onVolumeChange={() => setMuted(videoRef.current?.muted ?? true)}
      onFullscreenChange={() => { const video = videoRef.current; if (video) video.controls = document.fullscreenElement === video; }}
      onError={fail} />}
  </MediaFrame>;
}

function YouTubeTrailer({ media, poster, active }) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const activeRef = useRef(active);
  const manualPaused = useRef(false);
  const automaticPause = useRef(false);
  const unavailable = useRef(false);
  const [status, setStatus] = useState('idle');
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(true);
  activeRef.current = active;

  useEffect(() => {
    let disposed = false;
    const mount = mountRef.current;
    loadYouTubeApi().then((YT) => {
      if (disposed) return;
      const target = document.createElement('div');
      mount.appendChild(target);
      playerRef.current = new YT.Player(target, {
        videoId: media.videoId,
        playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: ({ target: player }) => {
            if (disposed) return;
            const iframe = player.getIframe();
            iframe.title = `${media.title} trailer`;
            iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
            iframe.allowFullscreen = true;
            player.mute();
            if (activeRef.current) player.playVideo();
          },
          onStateChange: ({ data }) => {
            if (disposed) return;
            if (data === YT.PlayerState.PLAYING) {
              if (!activeRef.current) {
                automaticPause.current = true;
                playerRef.current?.pauseVideo();
                return;
              }
              manualPaused.current = false;
              setStatus('playing');
              setPaused(false);
              setMuted(playerRef.current?.isMuted() ?? true);
            }
            if (data === YT.PlayerState.PAUSED) {
              setPaused(true);
              if (automaticPause.current) automaticPause.current = false;
              else manualPaused.current = true;
            }
          },
          onAutoplayBlocked: () => { if (!disposed) { unavailable.current = true; setStatus('blocked'); } },
          onError: () => { if (!disposed) { unavailable.current = true; setStatus('failed'); } },
        },
      });
    }).catch(() => { if (!disposed) { unavailable.current = true; setStatus('failed'); } });
    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      mount.replaceChildren();
    };
  }, [media.videoId, media.title]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || unavailable.current) return;
    if (!active) {
      if (player.getPlayerState() === window.YT?.PlayerState.PLAYING) {
        automaticPause.current = true;
        player.pauseVideo();
      }
    } else if (!manualPaused.current && player.getPlayerState() !== window.YT?.PlayerState.PLAYING) {
      player.playVideo();
    }
  }, [active, status]);

  const controls = <PlaybackControls paused={paused} muted={muted}
    onTogglePlayback={() => { const player = playerRef.current; if (paused) player?.playVideo(); else player?.pauseVideo(); }}
    onToggleMute={() => { const player = playerRef.current; if (!player) return; if (player.isMuted()) player.unMute(); else player.mute(); setMuted(player.isMuted()); }}
    onFullscreen={() => { playerRef.current?.getIframe()?.requestFullscreen?.().catch(() => {}); }} />;

  return <MediaFrame poster={poster} status={status} controls={controls}>
    <div className="cinema-youtube" ref={mountRef} aria-label={`${media.title} trailer player`} />
  </MediaFrame>;
}

export default function HeroTrailer({ media, poster, active, reducedMotion }) {
  if (!media || reducedMotion) return <MediaFrame poster={poster} status="idle" />;
  return media.kind === 'video'
    ? <NativeTrailer media={media} poster={poster} active={active} />
    : <YouTubeTrailer media={media} poster={poster} active={active} />;
}
