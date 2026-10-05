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
  console.log('PASS demo auth, profile save and reload, catalog, schedule, booking, cancellation, and user management');
} finally {
  await server.close();
}
