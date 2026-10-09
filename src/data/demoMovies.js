// Local preview catalog. Keep these dates relative so both movie states remain visible.
const releaseDate = (daysFromToday) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString();
};

export const demoMovies = [
  {
    _id: 'demo-midnight-signal',
    title: 'Midnight Signal',
    synopsis: 'When a mysterious transmission interrupts a quiet city, a radio host follows its clues through one unforgettable night.',
    genre: 'Thriller',
    duration: 118,
    rating: 'PG-13',
    posterUrl: '/demo-posters/midnight-signal.svg',
    releaseDate: releaseDate(-14),
    status: 'published',
  },
  {
    _id: 'demo-city-after-dark',
    title: 'City After Dark',
    synopsis: 'A night-shift photographer follows a trail of lights through the city.',
    genre: 'Drama',
    duration: 105,
    rating: 'PG-13',
    posterUrl: '/demo-posters/aftermath.svg',
    releaseDate: releaseDate(-10),
    status: 'published',
  },
  {
    _id: 'demo-blue-hour',
    title: 'Blue Hour',
    synopsis: 'A coastal family gathers before the tide changes everything.',
    genre: 'Adventure',
    duration: 112,
    rating: 'PG',
    posterUrl: '/demo-posters/beyond-the-tide.svg',
    releaseDate: releaseDate(-7),
    status: 'published',
  },
  {
    _id: 'demo-quiet-frame',
    title: 'The Quiet Frame',
    synopsis: 'A projectionist discovers the story behind a lost reel.',
    genre: 'Mystery',
    duration: 97,
    rating: 'PG',
    posterUrl: '/demo-posters/midnight-signal.svg',
    releaseDate: releaseDate(-3),
    status: 'published',
  },
  {
    _id: 'demo-oppenheimer-aftermath',
    title: 'Oppenheimer: The Aftermath',
    synopsis: 'A gripping follow-up exploring the political fallout and moral reckoning in the years following the creation of the atomic bomb.',
    genre: 'Drama',
    duration: 152,
    rating: 'R',
    posterUrl: '/demo-posters/aftermath.svg',
    releaseDate: releaseDate(30),
    status: 'published',
  },
  {
    _id: 'demo-beyond-the-tide',
    title: 'Beyond the Tide',
    synopsis: 'Two siblings return to their coastal hometown and discover a map to a place that disappears with the rising sea.',
    genre: 'Adventure',
    duration: 126,
    rating: 'PG',
    posterUrl: '/demo-posters/beyond-the-tide.svg',
    releaseDate: releaseDate(60),
    status: 'published',
  },
];

export const getDemoMovie = (id) => demoMovies.find((movie) => movie._id === id);
