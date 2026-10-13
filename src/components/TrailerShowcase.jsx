import { useEffect, useRef, useState } from 'react';
import { trailerPlaylist, initialPlaylist, playableEntries, playlistTransition } from '../utils/trailerPlaylist';
import HeroTrailer from './HeroTrailer';
import './trailerShowcase.css';

const runtime = minutes => minutes ? Math.floor(minutes / 60) + 'h ' + String(minutes % 60).padStart(2, '0') + 'm' : '';

function MoviePreview({ entry, sizing = false }) {
  const { movie, media } = entry;
  const Title = sizing ? 'div' : 'h1';
  return <div className={'cinema-entry' + (sizing ? ' is-sizing' : '')} aria-hidden={sizing || undefined} inert={sizing || undefined}>
    <div className="cinema-identity">
      <div className="cinema-poster">{!sizing && movie.posterUrl && <img src={movie.posterUrl} alt="" />}</div>
      <div className="cinema-copy"><Title className="cinema-title">{movie.title}</Title><div className="cinema-meta">
        {movie.rating && <span className="cinema-rating">{movie.rating}</span>}{(movie.genre || []).map(genre => <span key={genre}>{genre}</span>)}{movie.duration && <span>{runtime(movie.duration)}</span>}
      </div>{(movie.description || movie.synopsis) && <p className="cinema-synopsis">{movie.description || movie.synopsis}</p>}</div>
    </div>
    {(media.label || media.credit) && <div className="cinema-attribution has-credit">
      {media.label && <p className="cinema-demo-label">{media.label}</p>}
      {media.credit && <p className="cinema-credit">{sizing ? <>{media.credit.name}{' · '}{media.credit.licenseName}</> : <><a href={media.credit.source} target="_blank" rel="noreferrer">{media.credit.name}</a>{' · '}<a href={media.credit.licenseUrl} target="_blank" rel="noreferrer">{media.credit.licenseName}</a></>}</p>}
    </div>}
  </div>;
}

export default function TrailerShowcase(props) {
  const entries = trailerPlaylist(props.movies, props.showings, props.selectedDate, props.isDemo);
  return <ShowcaseSession key={props.selectedDate + ':' + entries.map(entry => entry.key).join('|')} {...props} entries={entries} />;
}

function ShowcaseSession({ entries, loading, error, onBookTickets }) {
  const [playlist, setPlaylist] = useState(() => initialPlaylist(entries));
  const [manualPaused, setManualPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [phase, setPhase] = useState('loading');
  const [outgoing, setOutgoing] = useState(null);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [fullscreen, setFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const heroRef = useRef(null);
  const mediaRef = useRef(null);
  const current = entries.find(entry => entry.key === playlist.current);
  const available = playableEntries(entries, playlist);
  const failed = current && playlist.failed.includes(current.key);
  const active = pageVisible && (inView || fullscreen);
  const canAdvance = active && !reducedMotion && !manualPaused;
  const policyRef = useRef(canAdvance);
  const pendingEnd = useRef(null);
  policyRef.current = canAdvance;
  const commit = action => { setMuted(true); setPlaylist(state => playlistTransition(state, action, entries)); };
  const transition = action => {
    if (action.canAdvance || action.type === 'move') setOutgoing(previous => previous || action);
    else commit(action);
  };

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
  // This delay finishes the exit animation; only player end/error events request advancement.
  useEffect(() => {
    if (!outgoing || !canAdvance) return;
    const timer = setTimeout(() => {
      if (!policyRef.current || document.hidden) return;
      commit(outgoing);
      setOutgoing(null);
    }, 360);
    return () => clearTimeout(timer);
  }, [outgoing, canAdvance]);
  useEffect(() => { setPhase('loading'); pendingEnd.current = null; }, [playlist.current, playlist.generation]);
  useEffect(() => {
    if (canAdvance && pendingEnd.current) {
      transition({ ...pendingEnd.current, canAdvance: true });
      pendingEnd.current = null;
    }
  }, [canAdvance]);
  useEffect(() => {
    if (failed && canAdvance && available.length) transition({ type: 'move', direction: 1 });
  }, [failed, canAdvance, available.length]);

  const exhausted = !available.length;
  const showMovie = !loading && !error && !exhausted && current;
  const provider = current?.media.kind === 'youtube';
  const message = loading ? 'Loading trailers…' : error ? 'Trailers unavailable' : exhausted ? 'No trailers available for this date' : failed ? 'This trailer could not be played.' : phase === 'blocked' ? 'Autoplay is unavailable. The movie preview is shown instead.' : reducedMotion && phase !== 'playing' ? 'Automatic playback is off for reduced motion.' : '';

  return <section ref={heroRef} data-movie-id={showMovie ? current.movie._id : ''} className={'cinema-hero' + (provider ? ' is-provider' : '') + (outgoing && canAdvance ? ' is-exiting' : '')} aria-label="Trailers for the selected date">
    <div className="cinema-media" ref={mediaRef}>
      {showMovie && !failed ? <HeroTrailer key={current.key + ':' + playlist.generation} media={current.media} poster={current.movie.backdropUrl || current.movie.posterUrl} active={active} reducedMotion={reducedMotion} manualPaused={manualPaused} muted={muted} onManualPause={setManualPaused} onMutedChange={setMuted} onStatus={setPhase} onFullscreenChange={setFullscreen}
        onEnded={() => {
          const event = { type: 'ended', key: current.key, generation: playlist.generation, canAdvance: policyRef.current && !document.hidden };
          if (!event.canAdvance && !reducedMotion && !manualPaused) pendingEnd.current = event;
          transition(event);
        }}
        onFailure={() => transition({ type: 'failed', key: current.key, generation: playlist.generation, canAdvance: policyRef.current && !document.hidden })} />
        : <div className="cinema-empty-art" aria-hidden="true">{current?.movie.posterUrl && <img src={current.movie.backdropUrl || current.movie.posterUrl} alt="" />}<span>F</span></div>}
    </div>
    <div className="cinema-panel">
      {showMovie && (current.movie.backdropUrl || current.movie.posterUrl) && <img key={current.key + ':' + playlist.generation} className="cinema-panel-art" src={current.movie.backdropUrl || current.movie.posterUrl} alt="" aria-hidden="true" />}
      <div className="cinema-topbar"><span className="cinema-showcase-brand">Now playing · trailer</span>
        <p className="cinema-counter" aria-label={'Trailer ' + (showMovie ? available.findIndex(entry => entry.key === current.key) + 1 : 0) + ' of ' + available.length}>{showMovie ? available.findIndex(entry => entry.key === current.key) + 1 : 0} / {available.length}</p>
      </div>
      <div className="cinema-indicators" aria-hidden="true">{available.map(entry => <span key={entry.key} className={entry.key === current?.key ? 'is-active' : ''} />)}</div>
      <div className="cinema-info" aria-live="polite" aria-atomic="true">
        {showMovie && <div className="cinema-details-stage">
          {/* Inert sizing copies reserve the tallest entry's space without a second active movie/player. */}
          {entries.map(entry => <MoviePreview key={'size:' + entry.key} entry={entry} sizing />)}
          <MoviePreview key={current.key + ':' + playlist.generation} entry={current} />
        </div>}
        <p className="cinema-status" role="status">{message}</p>
        {error && <p className="cinema-error">{error}</p>}
        {showMovie && onBookTickets && <button type="button" className="btn btn-primary cinema-book-tickets" onClick={() => onBookTickets(current.movie)}>Book Tickets</button>}
      </div>
    </div>
  </section>;
}
