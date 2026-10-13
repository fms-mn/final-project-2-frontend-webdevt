export function eligibleMovies(movies, availableRows) {
  const ids = new Set(availableRows.map(row => row.movie?._id));
  return movies.filter(movie => movie.status === 'now_showing' && ids.has(movie._id));
}

export function activeCarouselMovie(movies, selectedId) {
  return movies.find(movie => movie._id === selectedId) || movies[0] || null;
}
