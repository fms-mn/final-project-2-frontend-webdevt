import { useState } from 'react';
import { FiEdit2, FiGrid, FiPlus, FiTrash2, FiX } from 'react-icons/fi';

const blankCinema = { name: '', rows: 6, seatsPerRow: 10, seatStates: {} };
const seatIds = (room) => Array.from({ length: Number(room.rows) }, (_, row) => Array.from({ length: Number(room.seatsPerRow) }, (_, seat) => `${String.fromCharCode(65 + row)}${seat + 1}`));

export default function AdminCinemas({ cinemas, setCinemas, showtimes }) {
  const [selectedId, setSelectedId] = useState(cinemas[0]?.id || '');
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const selected = cinemas.find((cinema) => cinema.id === selectedId) || cinemas[0];

  const openAdd = () => { setDraft({ ...blankCinema, seatStates: {} }); setError(''); setNotice(''); };
  const openEdit = (room) => { setDraft({ ...room, seatStates: { ...room.seatStates } }); setError(''); setNotice(''); };
  const save = (event) => {
    event.preventDefault();
    const duplicate = cinemas.some((room) => room.id !== draft.id && room.name.trim().toLowerCase() === draft.name.trim().toLowerCase());
    if (duplicate) { setError('A cinema room with this name already exists.'); return; }
    const rows = Number(draft.rows); const seatsPerRow = Number(draft.seatsPerRow);
    const validStates = Object.fromEntries(Object.entries(draft.seatStates).filter(([seat]) => seat.charCodeAt(0) - 65 < rows && Number(seat.slice(1)) <= seatsPerRow));
    const saved = { ...draft, name: draft.name.trim(), rows, seatsPerRow, seatStates: validStates };
    if (saved.id) {
      setCinemas((items) => items.map((room) => room.id === saved.id ? saved : room));
      setNotice(`${saved.name} was updated.`);
    } else {
      saved.id = `cinema-${Date.now()}`;
      setCinemas((items) => [...items, saved]); setSelectedId(saved.id); setNotice(`${saved.name} was created.`);
    }
    setDraft(null); setError('');
  };
  const remove = (room) => {
    if (showtimes.some((show) => show.cinemaId === room.id)) { setError(`Delete or reassign ${room.name}'s screenings first.`); return; }
    if (deleteId !== room.id) { setDeleteId(room.id); setError(''); return; }
    setCinemas((items) => items.filter((item) => item.id !== room.id));
    setDeleteId(''); setNotice(`${room.name} was deleted.`);
  };
  const cycleSeat = (seat) => {
    if (!selected) return;
    const current = selected.seatStates[seat] || 'available';
    const next = current === 'available' ? 'unavailable' : current === 'unavailable' ? 'maintenance' : 'available';
    setCinemas((items) => items.map((room) => {
      if (room.id !== selected.id) return room;
      const seatStates = { ...room.seatStates };
      if (next === 'available') delete seatStates[seat]; else seatStates[seat] = next;
      return { ...room, seatStates };
    }));
    setNotice(`${seat} marked ${next}.`);
  };

  const capacity = selected ? selected.rows * selected.seatsPerRow : 0;
  const blocked = selected ? Object.keys(selected.seatStates).length : 0;
  return <>
    {draft && <form className="admin-panel cinema-editor" onSubmit={save}>
      <div className="admin-card-heading"><div><span className="home-section-eyebrow">{draft.id ? 'EDIT CINEMA' : 'CREATE CINEMA'}</span><h2>{draft.id ? `Configure ${draft.name}` : 'Create a cinema room'}</h2></div><button type="button" className="icon-button" aria-label="Close cinema form" onClick={() => setDraft(null)}><FiX /></button></div>
      {error && <div className="error-message" role="alert">{error}</div>}
      <div className="cinema-form-grid"><label>Room name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Cinema 4" /></label><label>Seat rows<input required type="number" min="1" max="12" value={draft.rows} onChange={(event) => setDraft({ ...draft, rows: event.target.value })} /></label><label>Seats per row<input required type="number" min="1" max="16" value={draft.seatsPerRow} onChange={(event) => setDraft({ ...draft, seatsPerRow: event.target.value })} /></label><div className="cinema-capacity-preview"><span>Room capacity</span><strong>{Number(draft.rows || 0) * Number(draft.seatsPerRow || 0)} seats</strong></div><div className="cinema-form-actions"><button type="button" className="btn btn-secondary btn-small" onClick={() => setDraft(null)}>Cancel</button><button type="submit" className="btn btn-primary btn-small">{draft.id ? 'Save room' : 'Create room'}</button></div></div>
    </form>}

    <section className="admin-panel cinema-management">
      <div className="admin-card-heading"><div><span className="home-section-eyebrow">CINEMA & SEAT MANAGEMENT</span><h2>Cinema rooms</h2><p>Configure rooms, capacity and individual seat availability.</p></div><button type="button" className="btn btn-primary btn-small" onClick={openAdd}><FiPlus /> Create room</button></div>
      {notice && <div className="admin-notice" role="status">{notice}</div>}{error && !draft && <div className="error-message" role="alert">{error}</div>}
      <div className="cinema-management-layout">
        <div className="cinema-room-list">{cinemas.map((room) => <article className={`cinema-room-card ${selected?.id === room.id ? 'selected' : ''}`} key={room.id} onClick={() => setSelectedId(room.id)}><div><FiGrid /><span><strong>{room.name}</strong><small>{room.rows} rows · {room.seatsPerRow} seats per row</small></span></div><div className="cinema-room-meta"><strong>{room.rows * room.seatsPerRow}</strong><span>capacity</span></div><div className="cinema-room-actions"><button type="button" aria-label={`Edit ${room.name}`} onClick={(event) => { event.stopPropagation(); openEdit(room); }}><FiEdit2 /></button><button type="button" className={deleteId === room.id ? 'confirm-delete' : ''} aria-label={deleteId === room.id ? `Confirm delete ${room.name}` : `Delete ${room.name}`} onClick={(event) => { event.stopPropagation(); remove(room); }}><FiTrash2 /></button></div></article>)}</div>
        <div className="seat-layout-panel">{selected ? <>
          <div className="seat-layout-heading"><div><span className="home-section-eyebrow">SEAT LAYOUT</span><h3>{selected.name}</h3></div><div><strong>{capacity - blocked}</strong><span>usable of {capacity}</span></div></div>
          <div className="cinema-screen">SCREEN</div>
          <div className="admin-seat-map" style={{ '--seats-per-row': selected.seatsPerRow }}>{seatIds(selected).map((row) => <div className="admin-seat-row" key={row[0][0]}><span>{row[0][0]}</span><div>{row.map((seat) => <button type="button" key={seat} className={selected.seatStates[seat] || 'available'} aria-label={`${seat}, ${selected.seatStates[seat] || 'available'}`} title={`${seat}: ${selected.seatStates[seat] || 'available'}. Click to change.`} onClick={() => cycleSeat(seat)}>{seat.slice(1)}</button>)}</div></div>)}</div>
          <div className="admin-seat-legend"><span><i className="available" />Available</span><span><i className="unavailable" />Unavailable</span><span><i className="maintenance" />Maintenance</span></div><p className="seat-layout-help">Click a seat to cycle through available, unavailable and maintenance.</p>
        </> : <div className="admin-empty"><FiGrid /><strong>No cinema rooms</strong><span>Create a room to configure its seats.</span></div>}</div>
      </div>
      <p className="admin-local-note">Cinema rooms and seat changes are frontend-only and reset when the page is refreshed.</p>
    </section>
  </>;
}
