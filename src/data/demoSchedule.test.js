import test from 'node:test';
import assert from 'node:assert/strict';
import { demoAdminRequest } from './demoAdminApi.js';
import { demoMovies } from './demoMovies.js';
import { DEMO_RULES, findScheduleConflicts, isDemoSlotSafe, listShowtimes } from './demoSchedule.js';
import { normalizeMovie } from '../utils/movies.js';
import { createDemoBooking, demoRemainingSeats, getReservedDemoSeats, cancelDemoBooking, listDemoBookings } from './demoBookings.js';

const day = '2099-10-10';
const values = new Map();
test.beforeEach(() => {
  values.clear();
  globalThis.localStorage = { getItem: key => values.get(key) || null, setItem: (key,value) => values.set(key,value) };
});
test.after(() => { delete globalThis.localStorage; });
const rows = () => demoMovies.slice(0,4).flatMap(movie => listShowtimes(movie._id,day).map(slot => ({ _id: slot.id, auditoriumId: slot.auditoriumId, movie, startTime: day + 'T' + slot.time + ':00+08:00' })));
test('demo auditorium occupancy includes runtime and the configured turnaround', () => {
  assert.deepEqual(findScheduleConflicts(rows()), []);
  const a = { _id: 'a', auditoriumId: 'one', duration: 120, startTime: day + 'T10:00:00+08:00' };
  const b = { ...a, _id: 'b', startTime: day + 'T12:10:00+08:00' };
  assert.deepEqual(findScheduleConflicts([a,b], DEMO_RULES.turnaroundMinutes), [['a','b']]);
  assert.deepEqual(findScheduleConflicts([a,{ ...b, startTime: day + 'T12:15:00+08:00' }]), []);
  assert.deepEqual(findScheduleConflicts([a,{ ...b, auditoriumId: 'two' }]), []);
  assert.deepEqual(findScheduleConflicts([a,{ ...b, status: 'cancelled' }]), []);
});
test('fixture availability includes open, limited, and sold-out sessions', () => {
  assert.equal(demoRemainingSeats('demo-midnight-signal',day,'19:00'),68);
  assert.equal(demoRemainingSeats('demo-city-after-dark',day,'19:00'),6);
  assert.equal(demoRemainingSeats('demo-blue-hour',day,'19:00'),0);
  assert.equal(new Set(getReservedDemoSeats('demo-blue-hour',day,'19:00')).size,80);
});
test('the exact showing is booked, saved in My Bookings, and cancellation releases seats', () => {
  const movie = normalizeMovie(demoMovies[0]);
  const slot = listShowtimes(movie._id,day).find(row => row.time === '19:00');
  const draft = { userId: 'demo-user', movie, seats: ['A1','A2'], showDate: day, showTime: slot.time, showingId: slot.id };
  assert.throws(() => createDemoBooking({ ...draft, showingId: 'unverified' }), /valid date and showtime/);
  assert.throws(() => createDemoBooking({ ...draft, userId: 'demo-admin' }), /not available/);
  const booking = createDemoBooking(draft);
  assert.equal(booking.showingId,slot.id);
  assert.equal(booking.isDemo,true);
  assert.equal(listDemoBookings()[0]._id,booking._id);
  assert.equal(demoRemainingSeats(movie._id,day,slot.time),66);
  assert.throws(() => createDemoBooking(draft), /already been booked/);
  cancelDemoBooking(booking._id,'demo-user');
  assert.equal(demoRemainingSeats(movie._id,day,slot.time),68);
  assert.equal(listDemoBookings()[0].status,'cancelled');
});
test('fixture reservations cannot be sold and confirmed legacy history is never reset', () => {
  const legacy = { _id: 'legacy', movieId: 'demo-city-after-dark', showDate: day, showTime: '19:00', auditoriumId: 'aud-1', userId: 'demo-user', seats: ['A3'], status: 'confirmed' };
  values.set('filme_demo_bookings',JSON.stringify([legacy]));
  const before = values.get('filme_demo_bookings');
  assert.equal(listShowtimes(legacy.movieId,day).find(slot => slot.time === legacy.showTime).auditoriumId,'aud-1');
  assert.equal(isDemoSlotSafe(legacy.movieId,day,legacy.showTime),false);
  assert.equal(isDemoSlotSafe('demo-midnight-signal',day,'19:00'),false);
  assert.equal(values.get('filme_demo_bookings'),before);
  assert.equal(listDemoBookings()[0]._id,'legacy');
  assert.equal(demoRemainingSeats(legacy.movieId,day,legacy.showTime),5);
  const movie=normalizeMovie(demoMovies[2]);
  assert.throws(() => createDemoBooking({ userId:'demo-user',movie,seats:['A1'],showDate:day,showTime:'19:00',showingId:listShowtimes(movie._id,day).find(slot=>slot.time==='19:00').id }), /already been booked/);
});

test('admin mock schedule has no room conflicts and counts showing-specific blocked seats', async () => {
  const showings=await demoAdminRequest('/admin/showtimes?date='+day);
  assert.deepEqual(findScheduleConflicts(showings),[]);
  const showing=showings.find(row=>row._id.startsWith('demo-show-3-'));
  assert.equal(showing.totalSeats,77);
  assert.equal(showing.remainingSeats,46);
});
