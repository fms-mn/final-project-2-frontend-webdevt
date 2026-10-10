import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createTrailerPlayback } from '../utils/trailerPlayback';
import { loadYouTubeApi } from '../utils/youtubeApi';

const HeroTrailer = forwardRef(function HeroTrailer({ media, poster, active, reducedMotion, manualPaused, muted, onManualPause, onMutedChange, onStatus, onEnded, onFailure, onFullscreenError, onFullscreenChange }, ref) {
  const videoRef = useRef(null);
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const sessionRef = useRef(null);
  const adapterRef = useRef(null);
  const latest = useRef(null);
  const [frameVisible, setFrameVisible] = useState(false);
  latest.current = { active, reducedMotion, manualPaused, muted, onManualPause, onMutedChange, onStatus, onEnded, onFailure, onFullscreenError, onFullscreenChange };

  useImperativeHandle(ref, () => ({
    resume: () => sessionRef.current?.resume(),
    pause: () => sessionRef.current?.pause(),
    toggleMute: () => { const next = !latest.current.muted; adapterRef.current?.setMuted(next); latest.current.onMutedChange(next); },
    fullscreen: () => { adapterRef.current?.fullscreen(); },
  }), []);

  useEffect(() => {
    let disposed = false;
    let readinessTimeout;
    const video = videoRef.current;
    const mount = mountRef.current;
    const native = media.kind === 'video';
    const policy = () => ({ active: latest.current.active && !document.hidden, autoplay: !latest.current.reducedMotion, manualPaused: latest.current.manualPaused });
    const fullscreen = element => {
      if (element?.requestFullscreen) element.requestFullscreen().catch(() => latest.current.onFullscreenError('Fullscreen is unavailable in this browser. Use the provider’s fullscreen control if available.'));
      else if (element?.webkitEnterFullscreen) element.webkitEnterFullscreen();
      else latest.current.onFullscreenError('Fullscreen is unavailable in this browser. Use the provider’s fullscreen control if available.');
    };
    const adapter = native ? {
      play: () => video.play(), pause: () => video.pause(), rewind: () => { video.currentTime = 0; },
      setMuted: value => { video.muted = value; }, fullscreen: () => fullscreen(video),
      destroy: () => { video.pause(); video.removeAttribute('src'); video.load(); },
    } : {
      play: () => playerRef.current?.playVideo(), pause: () => playerRef.current?.pauseVideo(), rewind: () => playerRef.current?.seekTo(0, true),
      setMuted: value => { if (value) playerRef.current?.mute(); else playerRef.current?.unMute(); },
      fullscreen: () => fullscreen(playerRef.current?.getIframe()),
      destroy: () => { playerRef.current?.destroy(); playerRef.current = null; mount?.replaceChildren(); },
    };
    adapterRef.current = adapter;
    const session = createTrailerPlayback(adapter, policy(), {
      onStatus: status => {
        if (disposed) return;
        if (status === 'playing' || !native && ['ready', 'blocked'].includes(status)) setFrameVisible(true);
        if (status === 'failed' || native && status === 'blocked') setFrameVisible(false);
        if (['ready', 'playing', 'blocked', 'failed'].includes(status)) clearTimeout(readinessTimeout);
        latest.current.onStatus(status);
      },
      onManualPause: value => latest.current.onManualPause(value),
      onEnded: () => latest.current.onEnded(),
      onFailure: () => latest.current.onFailure(),
    });
    sessionRef.current = session;
    latest.current.onStatus('loading');
    setFrameVisible(false);
    // A source that never becomes ready is failed once; this is not a playback/advance timer.
    readinessTimeout = setTimeout(() => session.fail(), 15000);
    const listeners = [];
    const listen = (name, handler) => { video.addEventListener(name, handler); listeners.push([name, handler]); };
    if (native) {
      listen('loadedmetadata', () => session.ready());
      listen('playing', () => session.playing());
      listen('pause', () => { if (!video.ended) session.paused(policy().active); });
      listen('ended', () => session.ended());
      listen('error', () => session.fail());
      listen('volumechange', () => latest.current.onMutedChange(video.muted));
      listen('fullscreenchange', () => { video.controls = document.fullscreenElement === video; });
      listen('webkitbeginfullscreen', () => latest.current.onFullscreenChange(true));
      listen('webkitendfullscreen', () => latest.current.onFullscreenChange(false));
      video.muted = latest.current.muted;
      video.src = media.src;
      video.load();
    } else {
      loadYouTubeApi().then(YT => {
        if (disposed) return;
        const target = document.createElement('div');
        mount.appendChild(target);
        playerRef.current = new YT.Player(target, {
          videoId: media.videoId, host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, fs: 1, origin: window.location.origin },
          events: {
            onReady: ({ target: player }) => {
              if (disposed) return;
              playerRef.current = player;
              const iframe = player.getIframe();
              iframe.title = media.title + ' trailer';
              iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
              iframe.allowFullscreen = true;
              iframe.referrerPolicy = 'strict-origin-when-cross-origin';
              adapter.setMuted(latest.current.muted);
              session.update(policy());
              session.ready();
            },
            onStateChange: ({ data }) => {
              if (disposed) return;
              if (data === YT.PlayerState.PLAYING) { session.playing(); latest.current.onMutedChange(playerRef.current?.isMuted() ?? true); }
              if (data === YT.PlayerState.PAUSED) session.paused();
              if (data === YT.PlayerState.ENDED) session.ended();
            },
            onAutoplayBlocked: () => { if (!disposed) session.blocked(); },
            onError: () => { if (!disposed) session.fail(); },
          },
        });
      }).catch(() => { if (!disposed) session.fail(); });
    }
    return () => {
      disposed = true;
      clearTimeout(readinessTimeout);
      listeners.forEach(([name, handler]) => video.removeEventListener(name, handler));
      session.destroy();
      sessionRef.current = null;
      adapterRef.current = null;
    };
  }, [media.kind, media.src, media.videoId, media.title]);

  useEffect(() => {
    sessionRef.current?.update({ active, autoplay: !reducedMotion, manualPaused });
  }, [active, reducedMotion, manualPaused]);
  useEffect(() => { adapterRef.current?.setMuted(muted); }, [muted]);

  return <div className={'cinema-media-frame' + (frameVisible ? ' has-frame' : '')}>
    {poster && <img className="cinema-media-poster" src={poster} alt="" />}
    {media.kind === 'video' ? <video ref={videoRef} className="cinema-video" playsInline muted preload="metadata" aria-label={media.label || media.title + ' trailer'} />
      : <div className="cinema-youtube" ref={mountRef} />}
  </div>;
});
export default HeroTrailer;
