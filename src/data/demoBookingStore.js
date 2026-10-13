const BOOKINGS_KEY = 'filme_demo_bookings';
export function listDemoBookings() {
  try {
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
    return Array.isArray(bookings) ? bookings : [];
  } catch {
    return [];
  }
}

