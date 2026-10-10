import { useState } from 'react';
import { trailerVideoId } from '../utils/trailer';
export default function MovieDetails({ movie, isDemo }) {
  const [watching, setWatching] = useState(false);
  const videoId = trailerVideoId(movie);
  return <section className="movie-details-copy" aria-label={movie.title + ' information'}>
    <p>{movie.description || movie.synopsis}</p>
    {isDemo && <p className="movie-fixture-note">Fictional demo film. Prices, format, language, and subtitles are fixture values.</p>}
    <p>{[movie.format, movie.language, movie.subtitles && 'Subtitles: ' + movie.subtitles].filter(Boolean).join(' · ')}</p>
    {videoId ? <><button className="btn btn-secondary" type="button" aria-expanded={watching} onClick={() => setWatching(value => !value)}>{watching ? 'Close trailer' : 'Watch movie trailer'}</button>
      {watching && <iframe className="details-trailer" title={movie.title + ' official trailer'} src={'https://www.youtube-nocookie.com/embed/' + videoId} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />}</> : <p>No movie trailer supplied.</p>}
  </section>;
}
