import { Link } from 'react-router-dom';
import { dayWord } from '../utils/featured';
import { manilaDay, displayTime } from '../utils/manila';

const peso = (amount) => `₱${Number(amount).toLocaleString('en-PH')}`;

// The ticket beside the landing page's headline. With a real upcoming showing it is that movie's
// ticket (poster, next showing, price, and a button that goes straight to booking it). Without one
// (an empty catalogue, or the movie service is slow) it is the labelled sample, so the hero never
// looks broken and never pretends to be a real booking.
export default function LandingTicket({ movie }) {
  return movie ? <LiveTicket movie={movie} /> : <SampleTicket />;
}

function SampleTicket() {
  return <div className="landing-ticket-stage" role="img" aria-label="Sample cinema ticket for illustration only. Not a booking or valid cinema ticket.">
    <div className="landing-ticket-float"><div className="landing-ticket" aria-hidden="true">
      <div className="landing-ticket-banner"><span>SAMPLE TICKET</span><span>FILME CINEMA</span></div>
      <div className="landing-ticket-details">
        <p className="landing-ticket-notice">For illustration only — not a booking or valid cinema ticket.</p>
        <strong>Your movie title</strong>
        <dl className="landing-ticket-meta">
          <div><dt>Date</dt><dd>Select a date</dd></div>
          <div><dt>Time</dt><dd>Select a time</dd></div>
          <div><dt>Seats</dt><dd>Your seats</dd></div>
        </dl>
      </div>
      <div className="landing-ticket-bottom">
        <div className="landing-ticket-reference"><span>CODE</span><b>SAMPLE-ONLY</b></div>
        <strong>₱—</strong>
        <span className="landing-ticket-barcode" aria-hidden="true" />
        <p className="landing-ticket-footer-copy">Choose a movie, pick your seats, and receive your ticket.</p>
      </div>
    </div></div>
  </div>;
}

function LiveTicket({ movie }) {
  const facts = [movie.rating, ...(movie.genre || []).slice(0, 2), movie.duration > 0 ? `${Math.floor(movie.duration / 60)}h ${String(movie.duration % 60).padStart(2, '0')}m` : ''].filter(Boolean);
  const more = Math.max(0, (movie.upcomingShowings ?? 1) - 1);
  const label = movie.status === 'coming_soon' ? 'ADVANCE TICKETS' : 'NOW SHOWING';
  const day = dayWord(movie.nextShowing);
  const when = `${day}, ${displayTime(movie.nextShowing)}`;
  const target = `/movie/${movie._id}?${new URLSearchParams({ date: manilaDay(movie.nextShowing) })}`;
  return <div className="landing-ticket-stage is-live">
    <div className="landing-ticket-float"><article className="landing-ticket" aria-label={`${movie.title}. Next showing ${when}.`}>
      <div className="landing-ticket-banner"><span>{label}</span><span>FILME CINEMA</span></div>
      <div className="landing-ticket-details">
        <div className="landing-ticket-feature">
          {movie.posterUrl ? <img className="landing-ticket-poster" src={movie.posterUrl} alt="" /> : <span className="landing-ticket-poster landing-ticket-poster-empty" aria-hidden="true">filme</span>}
          <div>
            <h2>{movie.title}</h2>
            <p className="landing-ticket-facts">{facts.join(' · ')}</p>
          </div>
        </div>
        <dl className="landing-ticket-meta">
          <div><dt>Next showing</dt><dd>{day}</dd></div>
          <div><dt>Time</dt><dd>{displayTime(movie.nextShowing)}</dd></div>
          <div><dt>From</dt><dd>{movie.price != null ? peso(movie.price) : '—'}</dd></div>
        </dl>
      </div>
      <div className="landing-ticket-bottom">
        <Link className="landing-ticket-cta" to={target} state={{ browsingPage: 'home' }}>Get tickets <span aria-hidden="true">→</span></Link>
        <span className="landing-ticket-more">{more > 0 ? `+${more} more ${more === 1 ? 'showing' : 'showings'}` : 'Pick your seats next'}</span>
        <span className="landing-ticket-barcode" aria-hidden="true" />
      </div>
    </article></div>
  </div>;
}
