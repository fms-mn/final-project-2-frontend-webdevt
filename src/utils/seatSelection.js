export const MAX_SEATS_PER_BOOKING = 10;

export function toggleSeatSelection(selectedSeats, seatId, bookedSeats) {
  if (bookedSeats.includes(seatId)) return selectedSeats;
  if (selectedSeats.includes(seatId)) return selectedSeats.filter(seat => seat !== seatId);
  if (selectedSeats.length >= MAX_SEATS_PER_BOOKING) return selectedSeats;
  return [...selectedSeats, seatId];
}
