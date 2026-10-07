const localDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

export const initialCinemas = [
  { id: 'cinema-1', name: 'Cinema 1', rows: 6, seatsPerRow: 10, seatStates: { A1: 'maintenance', A2: 'maintenance', F10: 'unavailable' } },
  { id: 'cinema-2', name: 'Cinema 2', rows: 7, seatsPerRow: 12, seatStates: { C6: 'unavailable', C7: 'unavailable' } },
  { id: 'cinema-3', name: 'Cinema 3', rows: 5, seatsPerRow: 8, seatStates: {} },
];

export const initialShowtimes = [
  { id: 'show-1', movieId: 'demo-midnight-signal', cinemaId: 'cinema-1', date: localDate(), startTime: '10:30', price: 280, bookedSeats: 34 },
  { id: 'show-2', movieId: 'demo-beyond-the-tide', cinemaId: 'cinema-3', date: localDate(), startTime: '13:15', price: 280, bookedSeats: 21 },
  { id: 'show-3', movieId: 'demo-midnight-signal', cinemaId: 'cinema-1', date: localDate(), startTime: '15:45', price: 280, bookedSeats: 42 },
  { id: 'show-4', movieId: 'demo-oppenheimer-aftermath', cinemaId: 'cinema-2', date: localDate(), startTime: '18:30', price: 320, bookedSeats: 56 },
  { id: 'show-5', movieId: 'demo-beyond-the-tide', cinemaId: 'cinema-3', date: localDate(1), startTime: '11:00', price: 280, bookedSeats: 8 },
];

export const todayInputValue = () => localDate();
