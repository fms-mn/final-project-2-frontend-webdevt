// The admin menu: a sidebar on a computer, a bar along the bottom of a phone.
// Sections are grouped by what the admin is doing (sales, the catalog, people, settings).

const icon = (paths) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths}</svg>
);

export const SECTIONS = [
  { group: 'Sales', items: [
    { id: 'overview', label: 'Overview', title: 'Overview', subtitle: 'Sales, showings, bookings, and activity at a glance.', icon: icon(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>) },
    { id: 'bookings', label: 'Bookings', title: 'Bookings', subtitle: 'Review ticket bookings, payments and their current status.', icon: icon(<><path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /><path d="M14 5v14" strokeDasharray="2 3" /></>) },
  ] },
  { group: 'Catalog', items: [
    { id: 'movies', label: 'Movies', title: 'Movies', subtitle: "Add titles, publish them, and see which ones still need showings.", icon: icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>) },
    { id: 'showings', label: 'Showings', title: 'Showings', subtitle: 'Plan showtimes and manage the screening schedule.', icon: icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>) },
    { id: 'rooms', label: 'Rooms', title: 'Rooms', subtitle: 'Manage cinema rooms and seating layouts.', icon: icon(<><path d="M5 11V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" /><path d="M3 15a2 2 0 0 1 2-2 2 2 0 0 1 2 2v1h10v-1a2 2 0 1 1 4 0v4H3z" /></>) },
  ] },
  { group: 'People', items: [
    { id: 'users', label: 'Users', title: 'Users', subtitle: 'Review customer and administrator accounts.', icon: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>) },
  ] },
  { group: 'Settings', items: [
    { id: 'settings', label: 'Settings', title: 'Settings', subtitle: 'Cinema-wide scheduling rules.', icon: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>) },
  ] },
];

export const ALL_ITEMS = SECTIONS.flatMap((section) => section.items);

export default function AdminSidebar({ current, onSelect }) {
  return (
    <nav className="admin-sidebar" aria-label="Admin sections">
      {SECTIONS.map((section) => (
        <div className="admin-nav-group" key={section.group}>
          <span className="admin-nav-heading">{section.group}</span>
          {section.items.map((item) => (
            <button
              key={item.id}
              type="button"
              id={`admin-nav-${item.id}`}
              className={`admin-nav-item${current === item.id ? ' active' : ''}`}
              aria-current={current === item.id ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
