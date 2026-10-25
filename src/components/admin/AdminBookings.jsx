import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import DatePicker from '../DatePicker';
import { describeError, pesos, toCsv } from '../../utils/adminTools';
import { manilaClock, shortDate, today } from '../../utils/manila';
import { paymentSummary } from '../../utils/payment';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

const PAGE = 100;
const STATUS_CHIPS = [['all', 'All'], ['confirmed', 'Confirmed'], ['pending', 'Awaiting payment'], ['cancelled', 'Cancelled'], ['expired', 'Expired']];

export default function AdminBookings() {
  const { busy, busyAction, error, notice, setNotice, setError, run } = useAdminAction();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState('');
  const [movie, setMovie] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState('');
  const [confirm, setConfirm] = useState('');
  const [revision, setRevision] = useState(0);

  // The status and showing date are filtered by the server; the rest of the filtering happens on
  // the rows already loaded.
  useEffect(() => {
    const controller = new AbortController();
    const filters = [`limit=${PAGE}`, `page=${page}`];
    if (status !== 'all') filters.push(`status=${status}`);
    if (date) filters.push(`date=${date}`);
    setLoading(true);
    api(`/bookings?${filters.join('&')}`, { signal: controller.signal })
      .then((list) => {
        setRows((current) => (page === 1 ? list : [...current, ...list]));
        setMore(list.length === PAGE);
        setLoading(false);
      })
      .catch((err) => { if (err.name !== 'AbortError') { setError(describeError(err)); setLoading(false); } });
    return () => controller.abort();
  }, [status, date, page, revision, setError]);

  const changeFilter = (setter) => (event) => { setter(event.target.value); setPage(1); setRows([]); setOpen(''); };

  const movieTitles = useMemo(() => [...new Set(rows.map((row) => row.movie?.title).filter(Boolean))].sort(), [rows]);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => (movie === 'all' || row.movie?.title === movie)
      && (!needle || `${row.bookingCode} ${row.user?.name} ${row.user?.email} ${row.movie?.title} ${row.seats.join(' ')}`.toLowerCase().includes(needle)));
  }, [rows, movie, query]);

  const canCancel = (row) => row.status === 'confirmed' && row.showtime?.startTime && new Date(row.showtime.startTime) > new Date();

  const cancel = async (row) => {
    if (confirm !== row._id) { setConfirm(row._id); return; }
    setConfirm('');
    const done = await run(() => api(`/bookings/${row._id}/cancel`, { method: 'PATCH' }), `${row.bookingCode} was cancelled and its seats are free again`, `cancel:${row._id}`);
    if (done) { setPage(1); setRevision((value) => value + 1); }
  };

  const exportCsv = () => {
    const heading = ['Booking code', 'Customer', 'Email', 'Movie', 'Room', 'Showing', 'Seats', 'Total (PHP)', 'Status', 'Payment', 'Payment reference', 'Booked at'];
    const body = shown.map((row) => [
      row.bookingCode, row.user?.name, row.user?.email, row.movie?.title, row.auditorium?.name,
      row.showtime?.startTime ? `${shortDate(row.showtime.startTime)} ${manilaClock(row.showtime.startTime)}` : '',
      row.seats.join(' '), row.totalAmount / 100, row.status, paymentSummary(row).text, row.payment?.reference || '', new Date(row.bookedAt).toISOString(),
    ]);
    const url = URL.createObjectURL(new Blob([toCsv([heading, ...body])], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `filme-bookings-${today()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Feedback error={error} notice={notice} noticeTitle="Booking cancelled" onDismissNotice={() => setNotice('')} />
      <div className="admin-panel admin-filters">
        <label>Search<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, customer, movie or seat" /></label>
        <label>Movie
          <select value={movie} onChange={(event) => setMovie(event.target.value)}>
            <option value="all">All movies</option>
            {movieTitles.map((title) => <option key={title} value={title}>{title}</option>)}
          </select>
        </label>
        <label>Showing date<DatePicker label="Booking showing date" value={date} onChange={value => changeFilter(setDate)({ target: { value } })} /></label>
        <button type="button" className="btn btn-secondary btn-small" onClick={exportCsv} disabled={shown.length === 0}>Export CSV</button>
      </div>

      <div className="status-chips" role="group" aria-label="Filter by status">
        {STATUS_CHIPS.map(([value, label]) => (
          <button key={value} type="button" className={`filter-btn ${status === value ? 'active' : ''}`} aria-pressed={status === value} onClick={() => changeFilter(setStatus)({ target: { value } })}>{label}</button>
        ))}
      </div>

      <section className="admin-panel" aria-label="Bookings">
        <div className="admin-panel-head"><h2>Bookings</h2><span className="admin-count">{shown.length} shown{more ? ' so far' : ''}</span></div>
        {loading && rows.length === 0 && <div className="loading"><div className="spinner" /></div>}
        {!loading && shown.length === 0 && <p className="show-empty">{rows.length === 0 && status === 'all' && !date ? 'No bookings yet. They appear here as soon as a customer books a seat.' : 'No bookings match these filters. Try another status, or clear the search and date.'}</p>}
        {shown.length > 0 && (
          <div className="admin-table-wrap bookings-table">
            <table className="admin-table">
              <thead><tr><th scope="col">Code</th><th scope="col">Customer</th><th scope="col">Movie</th><th scope="col">Showing</th><th scope="col">Seats</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Payment</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row._id}>
                    <td className="mono"><button type="button" className="link-button" aria-expanded={open === row._id} onClick={() => setOpen(open === row._id ? '' : row._id)}>{row.bookingCode}</button>
                      {open === row._id && (
                        <div className="booking-detail">
                          <span>Booked {new Date(row.bookedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
                          <span>{row.seats.length} × {pesos(row.unitPrice)}</span>
                          <span>{row.auditorium?.name}</span>
                          {row.payment && <span>Payment {row.payment.reference}{row.payment.refundReference ? ` · refund ${row.payment.refundReference}` : ''}</span>}
                          {row.cancelledAt && <span>Cancelled {new Date(row.cancelledAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>}
                        </div>
                      )}
                    </td>
                    <td>{row.user?.name || 'Customer'}<small className="cell-sub">{row.user?.email}</small></td>
                    <td>{row.movie?.title || 'Movie'}</td>
                    <td className="mono">{row.showtime?.startTime ? `${shortDate(row.showtime.startTime)} · ${manilaClock(row.showtime.startTime)}` : '—'}</td>
                    <td className="mono">{row.seats.join(', ')}</td>
                    <td>{pesos(row.totalAmount)}</td>
                    <td><span className={`admin-status ${row.status}`}>{row.status === 'pending' ? 'awaiting payment' : row.status}</span></td>
                    <td>{(() => { const info = paymentSummary(row); return <span className={`admin-payment admin-payment-${info.tone}`}>{info.label}{info.text && <small className="cell-sub">{info.text}</small>}</span>; })()}</td>
                    <td>
                      {canCancel(row) && (
                        <button type="button" className="btn btn-danger btn-small" disabled={busy} aria-busy={busyAction === `cancel:${row._id}`} onClick={() => cancel(row)}>
                          <ActionPending pending={busyAction === `cancel:${row._id}`}>{busyAction === `cancel:${row._id}` ? 'Cancelling...' : confirm === row._id ? 'Confirm' : 'Cancel'}</ActionPending>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {shown.length > 0 && (
          <div className="booking-cards">
            {shown.map((row) => {
              const info = paymentSummary(row);
              return (
                <article className="booking-card" key={row._id}>
                  <div className="booking-card-top">
                    <button type="button" className="link-button mono" aria-expanded={open === row._id} onClick={() => setOpen(open === row._id ? '' : row._id)}>{row.bookingCode}</button>
                    <span className={`admin-status ${row.status}`}>{row.status === 'pending' ? 'awaiting payment' : row.status}</span>
                  </div>
                  <strong>{row.movie?.title || 'Movie'}</strong>
                  <span className="booking-card-line">{row.showtime?.startTime ? `${shortDate(row.showtime.startTime)} · ${manilaClock(row.showtime.startTime)}` : '—'} · {row.auditorium?.name}</span>
                  <span className="booking-card-line">Seats {row.seats.join(', ')} · {pesos(row.totalAmount)}</span>
                  <span className="booking-card-line">{row.user?.name || 'Customer'} · {row.user?.email}</span>
                  <span className={`admin-payment admin-payment-${info.tone}`}>{info.label}{info.text && <small className="cell-sub">{info.text}</small>}</span>
                  {open === row._id && (
                    <div className="booking-detail">
                      <span>Booked {new Date(row.bookedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
                      <span>{row.seats.length} × {pesos(row.unitPrice)}</span>
                      {row.payment && <span>Payment {row.payment.reference}{row.payment.refundReference ? ` · refund ${row.payment.refundReference}` : ''}</span>}
                      {row.cancelledAt && <span>Cancelled {new Date(row.cancelledAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>}
                    </div>
                  )}
                  {canCancel(row) && (
                    <button type="button" className="btn btn-danger btn-small" disabled={busy} aria-busy={busyAction === `cancel:${row._id}`} onClick={() => cancel(row)}>
                      <ActionPending pending={busyAction === `cancel:${row._id}`}>{busyAction === `cancel:${row._id}` ? 'Cancelling...' : confirm === row._id ? 'Confirm cancel' : 'Cancel booking'}</ActionPending>
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {more && <div className="admin-actions"><button type="button" className="btn btn-secondary btn-small" disabled={loading} onClick={() => setPage((value) => value + 1)}>Load more</button></div>}
      </section>
    </>
  );
}
