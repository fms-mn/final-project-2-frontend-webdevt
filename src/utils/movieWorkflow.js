import { manilaDay, today } from './manila.js';
import { validDay } from './calendar.js';

// One answer for the list, movie panel and publishing actions.
export function movieWorkflow(movie, currentDay = today()) {
  const bookable = movie.upcomingShowings ?? 0;
  const hidden = movie.hiddenShowings ?? 0;
  const scheduled = movie.scheduledShowings ?? bookable;
  const release = validDay(movie.releaseDate) ? movie.releaseDate : manilaDay(movie.releaseDate);
  const coming = release > currentDay;
  if (movie.status === 'archived') return { tone: 'muted', title: movie.autoArchivedAt ? 'Archived automatically' : 'Archived', text: 'Hidden from customers. Restore as a draft to schedule it again.', action: 'restore', label: 'Restore as draft' };
  if (movie.status === 'draft') {
    if (bookable > 0) return { tone: 'warn', title: 'Ready to publish', text: `${bookable} visible showing${bookable === 1 ? '' : 's'} ready. Publish once to make the movie and these showings available to customers.`, action: 'publish', label: 'Publish movie' };
    if (hidden > 0) return { tone: 'warn', title: 'Showings hidden', text: `${hidden} showing${hidden === 1 ? ' is' : 's are'} hidden. Make a showing visible before putting tickets on sale.`, action: 'showings', label: 'Review showings' };
    return { tone: 'warn', title: 'Draft · hidden', text: coming ? 'Add showings and publish in one step, or publish a coming-soon announcement from Details.' : 'Add showings and publish in one step. Until then, customers cannot see this movie.', action: 'schedule', label: 'Add showings & publish' };
  }
  if (bookable > 0) return { tone: 'ok', title: coming ? 'Advance tickets on sale' : 'Tickets on sale', text: `${bookable} showing${bookable === 1 ? '' : 's'} available to customers.${hidden ? ` ${hidden} more hidden.` : ''}`, action: 'schedule', label: 'Add more showings' };
  if (hidden > 0) return { tone: 'warn', title: 'Published · showings hidden', text: 'The movie page is visible, but its showings are hidden. Make them visible to sell tickets.', action: 'showings', label: 'Review showings' };
  if (coming) return { tone: 'ok', title: 'Coming soon · announcement live', text: 'Customers can see the movie and release date. Add showings when you are ready to sell advance tickets.', action: 'schedule', label: 'Add showings' };
  return { tone: 'warn', title: 'Needs showings', text: scheduled ? 'Online sales have closed for the remaining showings. Add a later showing to sell tickets again.' : 'Customers can see the movie page, with no tickets available. Add showings to sell tickets again.', action: 'schedule', label: 'Add showings' };
}
