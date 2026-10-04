import movies from './movies.json';

export function listMovies({ status, search } = {}) {
  const query = search?.trim().toLowerCase();
  return movies.filter((movie) =>
    (!status || movie.status === status) &&
    (!query || movie.title.toLowerCase().includes(query))
  );
}

export function getMovieById(id) {
  return movies.find((movie) => movie._id === id) || null;
}
