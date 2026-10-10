export default function MovieDetails({ movie, isDemo }) {
  return <section className="movie-details-copy" aria-label={movie.title + ' information'}>
    <p>{movie.description || movie.synopsis}</p>
    {isDemo && <p className="movie-fixture-note">Fictional demo film. Prices, format, language, and subtitles are fixture values.</p>}
    <p>{[movie.format, movie.language, movie.subtitles && 'Subtitles: ' + movie.subtitles].filter(Boolean).join(' · ')}</p>
  </section>;
}
