import { moviesForDay } from './bookingHero.js';
import { trailerVideoId } from './trailer.js';
import { demoHeroMediaFor } from '../data/demoHeroMedia.js';

export function trailerPlaylist(movies, showings, day, isDemo = false) {
  return moviesForDay(movies, showings, day).filter(movie => !['draft', 'archived'].includes(movie.status)).flatMap(movie => {
    const videoId = trailerVideoId(movie);
    const media = videoId ? { kind: 'youtube', videoId, title: movie.title } : isDemo ? demoHeroMediaFor(movie._id) : null;
    return media ? [{ key: movie._id + ':' + (videoId || media.src), movie, media }] : [];
  });
}

export const initialPlaylist = entries => ({ current: entries[0]?.key || '', failed: [], generation: 0 });
export const playableEntries = (entries, state) => entries.filter(entry => !state.failed.includes(entry.key));

export function playlistTransition(state, action, entries) {
  const available = playableEntries(entries, state);
  const index = entries.findIndex(entry => entry.key === state.current);
  const nextKey = (direction, failed = state.failed) => {
    for (let step = 1; step <= entries.length; step += 1) {
      const entry = entries[(index + direction * step + entries.length * 2) % entries.length];
      if (entry && !failed.includes(entry.key)) return entry.key;
    }
    return '';
  };
  if (action.type === 'select') {
    const entry = available.find(item => item.movie._id === action.movieId);
    return entry ? { ...state, current: entry.key, generation: state.generation + 1 } : state;
  }
  if (action.type === 'move') {
    const current = nextKey(action.direction);
    return current ? { ...state, current, generation: state.generation + 1 } : state;
  }
  // Disposed players and repeated end/error notifications cannot change the new session.
  if (action.key !== state.current || action.generation !== state.generation) return state;
  if (action.type === 'ended') {
    if (!action.canAdvance || !available.length) return state;
    return { ...state, current: nextKey(1), generation: state.generation + 1 };
  }
  if (action.type === 'failed' && !state.failed.includes(action.key)) {
    const failed = [...state.failed, action.key];
    const current = action.canAdvance ? nextKey(1, failed) : state.current;
    return { ...state, failed, current, generation: state.generation + 1 };
  }
  return state;
}
