// Checks for the add/edit movie form. Every problem is reported at once, field by field, so an
// admin fixes the whole form in one pass instead of meeting one error at a time.

const WEB_LINK = /^https?:\/\/[^\s]+$/i;
const YOUTUBE = /^https?:\/\/(www\.|m\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s]+$/i;

export function movieErrors(draft) {
  const errors = {};
  if (!String(draft.title ?? '').trim()) errors.title = 'Enter the movie title.';
  if (!String(draft.synopsis ?? '').trim()) errors.synopsis = 'Write a short description.';
  if (!String(draft.genre ?? '').trim()) errors.genre = 'Enter a genre, for example Action.';
  if (!draft.releaseDate) errors.releaseDate = 'Choose a release date.';
  if (!Number.isInteger(Number(draft.duration)) || Number(draft.duration) < 1) {
    errors.duration = 'Enter the length in minutes, for example 120.';
  }
  const poster = String(draft.posterUrl ?? '').trim();
  if (!poster) errors.posterUrl = 'Add a poster image link.';
  else if (!WEB_LINK.test(poster)) errors.posterUrl = 'That is not a link. It should start with https://';
  const trailer = String(draft.trailerUrl ?? '').trim();
  if (trailer && !YOUTUBE.test(trailer)) errors.trailerUrl = 'Use a YouTube link, for example https://www.youtube.com/watch?v=...';
  return errors;
}

// "1h 40m" for the preview card.
export function durationText(minutes) {
  const total = Number(minutes);
  if (!Number.isInteger(total) || total < 1) return '';
  return total < 60 ? `${total}m` : `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
}
