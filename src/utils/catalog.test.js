import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMovieCatalog, loadMovieRecord } from './catalog.js';
import { canEnterBooking, loadUpcomingShowings, moviesForDay } from './bookingHero.js';
import { displayClock, displayTime, manilaDay } from './manila.js';
import { groupShowtimesByMovie } from './showtimesBoard.js';

test('explicit demo mode needs no service; live outages never return sample data', async () => {
  let calls=0;
  const offline=async () => { calls++; throw new Error('Offline'); };
  assert.equal((await loadMovieCatalog(offline,true)).length,6);
  assert.equal((await loadMovieRecord(offline,'demo-midnight-signal',true))._id,'demo-midnight-signal');
  assert.equal(calls,0);
  await assert.rejects(loadMovieCatalog(offline,false),/Offline/);
  await assert.rejects(loadMovieRecord(offline,'demo-midnight-signal',false),/Offline/);
  assert.deepEqual(await loadMovieCatalog(async()=>[],false),[]);
});
test('only verified data and customer roles may enter booking', () => {
  const row={ startTime:'2099-10-10T19:00:00+08:00',remainingSeats:5,verified:true };
  assert.equal(canEnterBooking(row,'user'),true);
  for(const bad of [null,{...row,verified:false},{...row,verified:undefined},{...row,bookable:false},{...row,remainingSeats:0},{...row,status:'cancelled'},{...row,startTime:'bad'},{...row,startTime:'2000-01-01T10:00:00+08:00'}]) assert.equal(canEnterBooking(bad,'user'),false);
  assert.equal(canEnterBooking(row,'admin'),false);
});
test('live schedule failure and malformed responses never yield verified fallback sessions', async () => {
  await assert.rejects(loadUpcomingShowings(async()=>{throw new Error('Offline');},null,'2026-10-10'),/Offline/);
  await assert.rejects(loadUpcomingShowings(async()=>[{_id:'x',startTime:'bad',remainingSeats:80}],null,'2026-10-10'),/Invalid/);
  const result=await loadUpcomingShowings(async()=>[{_id:'live',startTime:'2026-10-10T19:00:00+08:00',remainingSeats:3}],null,'2026-10-10');
  assert.equal(result[0].verified,true);
});
test('Manila midnight, filtering, and 12-hour labels are independent of browser timezone', () => {
  assert.equal(manilaDay('2026-10-10T16:05:00Z'),'2026-10-11');
  assert.equal(displayTime('2026-10-10T11:00:00Z'),'7:00 PM');
  assert.equal(displayClock('00:00'),'12:00 AM');
  const movie={_id:'m'};
  const rows=[{movie,startTime:'2026-10-10T16:05:00Z'}];
  assert.deepEqual(moviesForDay([movie],rows,'2026-10-10'),[]);
  assert.deepEqual(moviesForDay([movie],rows,'2026-10-11'),[movie]);
});
test('movie grouping preserves distinct showing IDs, rooms, and chronological ordering', () => {
  const movie={_id:'m',title:'Film'};
  const groups=groupShowtimesByMovie([{id:'b',movie,time:'19:00',room:'two'},{id:'a',movie,time:'10:00',room:'one'},{id:'c',movie:{_id:'n'},time:'12:00'}]);
  assert.equal(groups.length,2);
  assert.deepEqual(groups[0].showings.map(row=>row.id),['a','b']);
});
