import { useEffect, useRef, useState } from 'react';
import { trailerPlaylist, initialPlaylist, playableEntries, playlistTransition } from '../utils/trailerPlaylist';
import HeroTrailer from './HeroTrailer';
import './trailerShowcase.css';

const runtime = minutes => minutes ? Math.floor(minutes / 60) + 'h ' + String(minutes % 60).padStart(2, '0') + 'm' : '';

export default function TrailerShowcase(props) {
  const entries = trailerPlaylist(props.movies, props.showings, props.selectedDate, props.isDemo);
  // A new day or source list starts a fresh playlist, including its failure budget.
  return <ShowcaseSession key={props.selectedDate + ':' + entries.map(entry => entry.key).join('|')} {...props} entries={entries} />;
}

function ShowcaseSession({ entries, loading, error, onRetry }) {
  const [playlist, setPlaylist] = useState(() => initialPlaylist(entries));
  const [manualPaused, setManualPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [phase, setPhase] = useState('loading');
  const [fullscreenMessage, setFullscreenMessage] = useState('');
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [fullscreen, setFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const heroRef = useRef(null);
  const mediaRef = useRef(null);
  const playerRef = useRef(null);
  const current = entries.find(entry => entry.key === playlist.current);
  const available = playableEntries(entries, playlist);
  const failed = current && playlist.failed.includes(current.key);
  const active = pageVisible && (inView || fullscreen);
  const canAdvance = active && !reducedMotion && !manualPaused;
  const policyRef = useRef(canAdvance);
  const pendingEnd = useRef(null);
  policyRef.current = canAdvance;
  const transition = action => setPlaylist(state => playlistTransition(state, action, entries));

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > .5), { threshold: [0, .51] });
    observer.observe(mediaRef.current);
    const visibility = () => setPageVisible(!document.hidden);
    const fullscreenChange = () => setFullscreen(!!document.fullscreenElement && heroRef.current?.contains(document.fullscreenElement));
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReducedMotion(preference.matches);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('fullscreenchange', fullscreenChange);
    preference.addEventListener('change', motion);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('fullscreenchange', fullscreenChange); preference.removeEventListener('change', motion); };
  }, []);
  useEffect(() => { setPhase('loading'); setFullscreenMessage(''); pendingEnd.current = null; }, [playlist.current, playlist.generation]);
  useEffect(() => {
    if (canAdvance && pendingEnd.current) {
      transition({ ...pendingEnd.current, canAdvance: true });
      pendingEnd.current = null;
    }
  }, [canAdvance]);
  // Failures encountered while offscreen wait until automatic playback is permitted.
  useEffect(() => {
    if (failed && canAdvance && available.length) transition({ type: 'move', direction: 1 });
  }, [failed, canAdvance, available.length]);

  const exhausted = !available.length;
  const provider = current?.media.kind === 'youtube';
  const message = loading ? 'Loading trailers…' : error ? 'Trailers unavailable' : exhausted ? 'No trailers available for this date' : failed ? 'This trailer could not be played.' : phase === 'blocked' ? 'Autoplay was blocked. Play when you’re ready.' : fullscreenMessage ? fullscreenMessage : reducedMotion && phase !== 'playing' ? 'Automatic playback is off for reduced motion. Play when you’re ready.' : '';
  const playing = phase === 'playing';
  const ready = !['loading', 'failed'].includes(phase);

  return <section ref={heroRef} className={'cinema-hero' + (provider && !exhausted ? ' is-provider' : '')} aria-label="Trailers for the selected date">
    <div className="cinema-topbar">
      <span className="cinema-showcase-brand">FILME <span>TRAILER SHOWCASE</span></span>
    </div>
    <div className="cinema-media" ref={mediaRef}>
      {!loading && !error && current && !failed && !exhausted ? <HeroTrailer key={current.key + ':' + playlist.generation} ref={playerRef} media={current.media} poster={current.movie.backdropUrl || current.movie.posterUrl} active={active} reducedMotion={reducedMotion} manualPaused={manualPaused} muted={muted} onManualPause={setManualPaused} onMutedChange={setMuted} onStatus={setPhase} onFullscreenError={setFullscreenMessage} onFullscreenChange={setFullscreen}
        onEnded={() => {
          const event = { type: 'ended', key: current.key, generation: playlist.generation, canAdvance: policyRef.current };
          if (!event.canAdvance && !reducedMotion && !manualPaused) pendingEnd.current = event;
          transition(event);
        }}
        onFailure={() => transition({ type: 'failed', key: current.key, generation: playlist.generation, canAdvance: policyRef.current })} />
        : <div className="cinema-empty-art" aria-hidden="true">{current?.movie.posterUrl && <img src={current.movie.backdropUrl || current.movie.posterUrl} alt="" />}<span>F</span></div>}
    </div>
    <div className="cinema-bottom">
      <div className="cinema-info" aria-live="polite" aria-atomic="true">
        {!loading && !error && !exhausted && current && <><p className="cinema-counter">Trailer {Math.max(1, available.findIndex(entry => entry.key === current.key) + 1)} of {available.length}</p><h1>{current.movie.title}</h1><p className="cinema-meta">{[current.movie.rating, ...(current.movie.genre || []), runtime(current.movie.duration)].filter(Boolean).join(' · ')}</p></>}
        {message && <p className="cinema-status" role="status">{message}</p>}
        {error && <><p>{error}</p><button type="button" className="cinema-explicit-play" onClick={onRetry}>Try again</button></>}
        {!loading && !error && exhausted && entries.length > 0 && <button type="button" className="cinema-explicit-play" onClick={() => { setManualPaused(false); setPlaylist(state => ({ ...initialPlaylist(entries), generation: state.generation + 1 })); }}>Retry trailers</button>}
        {!loading && !error && !exhausted && !failed && (phase === 'blocked' || reducedMotion && !playing) && <button type="button" className="cinema-explicit-play" disabled={!active || !ready} onClick={() => playerRef.current?.resume()}>Play trailer</button>}
        {!loading && !error && !exhausted && current?.media.label && <p className="cinema-demo-label">{current.media.label}</p>}
        {!loading && !error && !exhausted && current?.media.credit && <p className="cinema-credit"><a href={current.media.credit.source} target="_blank" rel="noreferrer">{current.media.credit.name}</a>{' · '}<a href={current.media.credit.licenseUrl} target="_blank" rel="noreferrer">{current.media.credit.licenseName}</a></p>}
      </div>
    </div>
  </section>;
}
