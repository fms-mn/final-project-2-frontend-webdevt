import { useCallback, useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function PosterCarousel({ movies, selectedId, onSelect }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ first: true, last: true });
  const movieIds = movies.map(movie => movie._id).join('|');
  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const inset = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    setEdges({ first: track.scrollLeft <= inset + 2, last: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const first = track.firstElementChild;
    const selected = track.querySelector('.poster-carousel-card.selected');
    track.scrollTo({ left: selected && first ? selected.offsetLeft - first.offsetLeft : 0, behavior: 'instant' });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    Array.from(track.children).forEach(child => observer.observe(child));
    updateEdges();
    return () => observer.disconnect();
  }, [movieIds, updateEdges]);

  const move = direction => {
    const track = trackRef.current;
    const card = track?.firstElementChild;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: reduced ? 'instant' : 'smooth' });
  };

  return <div className="poster-carousel" aria-label="Movies with available showtimes">
    <div className="poster-carousel-top"><h2>Choose a film</h2><div className="poster-carousel-arrows">
      <button type="button" aria-label="Scroll movies left" disabled={edges.first} onClick={() => move(-1)}><FiChevronLeft aria-hidden="true" /></button>
      <button type="button" aria-label="Scroll movies right" disabled={edges.last} onClick={() => move(1)}><FiChevronRight aria-hidden="true" /></button>
    </div></div>
    <div className="poster-carousel-track" ref={trackRef} onScroll={updateEdges}>
      {movies.map(movie => <button type="button" key={movie._id} className={`poster-carousel-card ${selectedId === movie._id ? 'selected' : ''}`} aria-label={`Select ${movie.title}`} aria-pressed={selectedId === movie._id} onClick={() => onSelect(movie._id)}>
        <span className="poster-carousel-image"><img src={movie.posterUrl || '/filme-mark.svg'} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/filme-mark.svg'; }} /></span>
        <span className="poster-carousel-title">{movie.title}</span>
      </button>)}
    </div>
  </div>;
}
