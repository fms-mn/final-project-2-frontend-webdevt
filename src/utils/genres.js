export const MOVIE_GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance',
  'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western',
];

export function splitGenres(value) {
  const values = Array.isArray(value) ? value : [value];
  const genres = values.flatMap(item => typeof item === 'string' ? item.split(/[,/;|]/) : [])
    .map(item => item.trim()).filter(Boolean)
    .map(item => MOVIE_GENRES.find(genre => genre.toLowerCase() === item.toLowerCase()) || item);
  return genres.filter((genre, index) => genres.findIndex(item => item.toLowerCase() === genre.toLowerCase()) === index);
}
