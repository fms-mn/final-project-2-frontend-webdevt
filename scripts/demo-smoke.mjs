import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const auth = await server.ssrLoadModule('/src/data/demoAuth.js');
  const catalog = await server.ssrLoadModule('/src/data/catalog.js');
  const schedule = await server.ssrLoadModule('/src/data/demoSchedule.js');
  const bookings = await server.ssrLoadModule('/src/data/demoBookings.js');
  const { default: Admin } = await server.ssrLoadModule('/src/pages/Admin.jsx');
  const { default: Login } = await server.ssrLoadModule('/src/pages/Login.jsx');
  const { default: Profile } = await server.ssrLoadModule('/src/pages/Profile.jsx');
  const { default: MyBookings } = await server.ssrLoadModule('/src/pages/MyBookings.jsx');
  const { default: MovieDetail, toggleSeatSelection } = await server.ssrLoadModule('/src/pages/MovieDetail.jsx');
  const { AuthProvider } = await server.ssrLoadModule('/src/context/AuthContext.jsx');

  await assert.rejects(auth.loginDemoUser('customer@filme.example', 'wrong'));
  const customer = await auth.loginDemoUser('customer@filme.example', 'nigga123');
  assert.equal(customer.role, 'customer');
  assert.equal(auth.getCurrentUser().id, customer.id);
  assert.throws(() => auth.updateDemoCustomerProfile(customer.id, { name: '   ', phone: '09171234567' }), /Name is required/);
  const updatedProfile = auth.updateDemoCustomerProfile(customer.id, { name: '  Alex P. Rivera  ', phone: '09171234567', email: 'changed@example.com', role: 'admin', active: false });
  assert.equal(updatedProfile.name, 'Alex P. Rivera');
  assert.equal(updatedProfile.phone, '09171234567');
  assert.equal(updatedProfile.email, customer.email);
  assert.equal(updatedProfile.role, 'customer');
  assert.equal(updatedProfile.active, true);
  assert.equal(auth.getCurrentUser().name, 'Alex P. Rivera'); // refresh-style read from storage
  auth.logoutDemoUser();
  assert.equal(auth.getCurrentUser(), null);
  const signedInAgain = await auth.loginDemoUser('customer@filme.example', 'nigga123');
  assert.equal(signedInAgain.name, 'Alex P. Rivera');
  assert.equal(signedInAgain.phone, '09171234567');
  auth.logoutDemoUser();
  const admin = await auth.loginDemoUser('admin@filme.example', 'nigga123');
  assert.equal(admin.role, 'admin');
  assert.throws(() => auth.updateDemoCustomerProfile(admin.id, { name: 'Other' }), /Customer profile not found/);

  const movie = catalog.listMovies({ status: 'now_showing' })[0];
  catalog.saveDemoMovie({ ...movie, price: 499 });
  assert.equal(catalog.getMovieById(movie._id).price, 499);
  const auditorium = schedule.listAuditoriums()[0];
  schedule.saveDemoAuditorium({ ...auditorium, name: 'Updated Cinema' });
  assert.equal(schedule.listAuditoriums()[0].name, 'Updated Cinema');
  const slot = schedule.listShowtimes(movie._id)[0];
  assert.ok(slot);
  schedule.saveDemoShowtime({ movieId: movie._id, auditoriumId: auditorium.id, time: '23:45' });
  assert.ok(schedule.listShowtimes(movie._id).some((item) => item.time === '23:45'));

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const booking = bookings.createDemoBooking({ userId: customer.id, movieId: movie._id, seats: ['A1', 'A2'], showDate: date, showTime: slot.time });
  assert.equal(booking.totalPrice, 998);
  assert.deepEqual(bookings.getBookedSeats(movie._id, date, slot.time), ['A1', 'A2']);
  assert.equal(bookings.getDemoBookings(customer.id).length, 1);
  assert.throws(() => bookings.createDemoBooking({ userId: customer.id, movieId: movie._id, seats: ['A1'], showDate: date, showTime: slot.time }));
  assert.equal(bookings.canCancelDemoBooking(booking), true);
  bookings.cancelDemoBooking(booking._id, customer.id);
  assert.deepEqual(bookings.getBookedSeats(movie._id, date, slot.time), []);

  const registered = await auth.registerDemoUser('Sam Lee', 'sam@example.com', 'secret123');
  auth.updateDemoCustomerProfile(registered.id, { name: 'Sam L. Lee', phone: '0012345' });
  assert.equal(auth.getCurrentUser().phone, '0012345');
  auth.setDemoUserActive(registered.id, false);
  await assert.rejects(auth.loginDemoUser('sam@example.com', 'secret123'));
  assert.equal(auth.getCurrentUser(), null);
  const managed = auth.saveDemoUser({ name: 'Jordan Cruz', email: 'jordan@example.com', role: 'customer', password: 'secret123' });
  auth.saveDemoUser({ ...managed, name: 'Jordan M. Cruz', role: 'admin' });
  assert.equal(auth.listDemoUsers().find((user) => user.id === managed.id).role, 'admin');
  const adminHtml = renderToString(React.createElement(MemoryRouter, null, React.createElement(Admin)));
  assert.match(adminHtml, /Admin dashboard/);
  assert.match(adminHtml, /Confirmed bookings/);
  const loginHtml = renderToString(React.createElement(AuthProvider, null,
    React.createElement(MemoryRouter, { initialEntries: ['/login'] },
      React.createElement(Routes, null, React.createElement(Route, { path: '/login', element: React.createElement(Login) }))
    )
  ));
  assert.match(loginHtml.replaceAll('<!-- -->', ''), /Use demo customer/);
  assert.match(loginHtml.replaceAll('<!-- -->', ''), /Use demo admin/);
  await auth.loginDemoUser('customer@filme.example', 'nigga123');
  const profileHtml = renderToString(React.createElement(AuthProvider, null, React.createElement(Profile)));
  assert.match(profileHtml, /Alex P\. Rivera/);
  assert.match(profileHtml, /09171234567/);
  assert.match(profileHtml, /customer@filme\.example/);
  assert.doesNotMatch(profileHtml, /type="email"/);

  const upcomingBooking = bookings.createDemoBooking({ userId: customer.id, movieId: movie._id, seats: ['B1'], showDate: date, showTime: slot.time });
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const yesterday = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
  const pastBooking = { ...upcomingBooking, _id: 'past-customer-booking', seats: ['C1'], showDate: yesterday, status: 'confirmed' };
  localStorage.setItem('filme_demo_bookings', JSON.stringify([...bookings.listDemoBookings(), pastBooking]));
  const otherCustomer = auth.saveDemoUser({ name: 'Taylor Lim', email: 'taylor@example.com', role: 'customer', password: 'secret123' });
  const otherBooking = bookings.createDemoBooking({ userId: otherCustomer.id, movieId: movie._id, seats: ['D1'], showDate: date, showTime: slot.time });
  assert.equal(bookings.getDemoBookings(customer.id).length, 3);
  assert.equal(bookings.getDemoBookings(otherCustomer.id).length, 1);
  assert.throws(() => bookings.cancelDemoBooking(otherBooking._id, customer.id), /Booking not found/);
  assert.equal(bookings.isUpcomingDemoBooking(upcomingBooking), true);
  assert.equal(bookings.isUpcomingDemoBooking(pastBooking), false);
  assert.equal(bookings.isUpcomingDemoBooking(bookings.getDemoBookings(customer.id).find((item) => item._id === booking._id)), false);
  assert.throws(() => bookings.cancelDemoBooking(pastBooking._id, customer.id), /Only future bookings/);
  assert.throws(() => bookings.cancelDemoBooking(booking._id, customer.id), /already cancelled/);
  assert.deepEqual(bookings.getBookedSeats(movie._id, date, slot.time).sort(), ['B1', 'D1']);

  const customerHtml = renderToString(React.createElement(AuthProvider, null, React.createElement(MemoryRouter, null, React.createElement(MyBookings)))).replaceAll('<!-- -->', '');
  const upcomingHtml = customerHtml.match(/<section class="bookings-group" aria-labelledby="upcoming-bookings-title">([\s\S]*?)<\/section>/)?.[1];
  const historyHtml = customerHtml.match(/<section class="bookings-group" aria-labelledby="booking-history-title">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(upcomingHtml && historyHtml);
  assert.match(upcomingHtml, new RegExp(bookings.getDemoBookingReference(upcomingBooking)));
  assert.match(upcomingHtml, /Cancel Booking/);
  assert.match(historyHtml, new RegExp(bookings.getDemoBookingReference(pastBooking)));
  assert.match(historyHtml, new RegExp(bookings.getDemoBookingReference(booking)));
  assert.doesNotMatch(historyHtml, /Cancel Booking/);
  assert.doesNotMatch(customerHtml, new RegExp(bookings.getDemoBookingReference(otherBooking)));
  assert.match(customerHtml, /Total amount/);
  assert.match(customerHtml, /Seats/);
  assert.match(customerHtml, /Show time/);
  assert.match(customerHtml, /confirmed/);
  assert.match(customerHtml, /cancelled/);

  bookings.cancelDemoBooking(upcomingBooking._id, customer.id);
  assert.deepEqual(bookings.getBookedSeats(movie._id, date, slot.time), ['D1']);
  const afterCancellationHtml = renderToString(React.createElement(AuthProvider, null, React.createElement(MemoryRouter, null, React.createElement(MyBookings))));
  assert.match(afterCancellationHtml, /No upcoming bookings/);
  assert.match(afterCancellationHtml, new RegExp(bookings.getDemoBookingReference(upcomingBooking)));
  assert.equal(bookings.getDemoBookings(customer.id).find((item) => item._id === upcomingBooking._id).status, 'cancelled');

  auth.logoutDemoUser();
  await auth.loginDemoUser('taylor@example.com', 'secret123');
  const otherHtml = renderToString(React.createElement(AuthProvider, null, React.createElement(MemoryRouter, null, React.createElement(MyBookings))));
  assert.match(otherHtml, new RegExp(bookings.getDemoBookingReference(otherBooking)));
  assert.doesNotMatch(otherHtml, new RegExp(bookings.getDemoBookingReference(upcomingBooking)));
  auth.logoutDemoUser();
  await auth.loginDemoUser('admin@filme.example', 'nigga123');
  assert.equal(bookings.getDemoBookings(auth.getCurrentUser().id).length, 0);
  auth.logoutDemoUser();
  await auth.loginDemoUser('customer@filme.example', 'nigga123');
  assert.equal(bookings.getDemoBookings(customer.id).length, 3); // persists through account switches and a fresh storage read
  const emptyCustomer = auth.saveDemoUser({ name: 'New Viewer', email: 'new.viewer@example.com', role: 'customer', password: 'secret123' });
  auth.logoutDemoUser();
  await auth.loginDemoUser(emptyCustomer.email, 'secret123');
  const emptyHtml = renderToString(React.createElement(AuthProvider, null, React.createElement(MemoryRouter, null, React.createElement(MyBookings))));
  assert.match(emptyHtml, /No upcoming bookings/);
  assert.match(emptyHtml, /No booking history yet/);
  assert.deepEqual(toggleSeatSelection([], 'A1', []), ['A1']);
  assert.deepEqual(toggleSeatSelection(['A1'], 'A1', []), []);
  assert.deepEqual(toggleSeatSelection([], 'A1', ['A1']), []);
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const bookedChairFixtures = [todayString, date].flatMap((showDate) => schedule.listShowtimes(movie._id).map((showtime) => ({
    _id: `chair-${showDate}-${showtime.id}`, userId: customer.id, movieId: movie._id, seats: ['A1'], showDate,
    showTime: showtime.time, status: 'confirmed', createdAt: new Date().toISOString(), totalPrice: movie.price,
  })));
  localStorage.setItem('filme_demo_bookings', JSON.stringify([...bookings.listDemoBookings(), ...bookedChairFixtures]));
  const detailHtml = renderToString(React.createElement(AuthProvider, null,
    React.createElement(MemoryRouter, { initialEntries: [`/movie/${movie._id}`] },
      React.createElement(Routes, null, React.createElement(Route, { path: '/movie/:id', element: React.createElement(MovieDetail) }))
    )
  ));
  assert.match(detailHtml, /Cinema seat map; scroll horizontally/);
  assert.match(detailHtml, /SCREEN/);
  assert.match(detailHtml, /chair-backrest/);
  assert.match(detailHtml, /chair-cushion/);
  assert.match(detailHtml, /seat-aisle/);
  assert.match(detailHtml, /aria-label="Seat A1, booked"/);
  assert.match(detailHtml, /<button[^>]*disabled=""[^>]*aria-label="Seat A1, booked"/);
  assert.match(detailHtml, /aria-label="Seat A2, available"/);
  assert.match(detailHtml, /A1<\/span>/);
  assert.match(detailHtml, /H10<\/span>/);
  assert.equal((detailHtml.match(/aria-label="Seat [A-H](?:10|[1-9]),/g) || []).length, auditorium.capacity);
  console.log('PASS demo auth, profile, catalog, schedule, bookings, seat selection, booked chairs, and persistence');
} finally {
  await server.close();
}
