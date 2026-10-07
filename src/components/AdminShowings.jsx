import { useEffect, useState } from 'react';
import { api } from '../api';

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const localInput = value => { const date = new Date(value); return `${dateKey(date)}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`; };
const clock = value => new Date(value).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',hour12:false});
const pesos = centavos => `₱${(centavos / 100).toLocaleString('en-PH')}`;

export default function AdminShowings({ movies }) {
  const [date, setDate] = useState(() => dateKey(new Date()));
  const [rooms, setRooms] = useState([]);
  const [showings, setShowings] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [adding, setAdding] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api('/auditoriums', { signal: controller.signal }),api(`/admin/showtimes?date=${date}&limit=200`,{signal:controller.signal})])
      .then(([auditoriums, rows]) => { setRooms(auditoriums);setShowings(rows);setError(''); })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [date, revision]);
  const selected = showings.find(row => row._id === selectedId);
  useEffect(() => {
    if (selected) setDraft({ movie: selected.movie?._id, auditorium: selected.auditorium?._id, startTime: localInput(selected.startTime), ticketPrice: String(selected.ticketPrice / 100) });
  }, [selectedId, showings]);
  const shiftDate = offset => { const next = new Date(`${date}T12:00:00`);next.setDate(next.getDate()+offset);setDate(dateKey(next));setSelectedId(''); };
  const startAdd = () => {
    setAdding(true);setSelectedId('');setConfirmCancel(false);
    setDraft({ movie: movies.find(m=>m.status==='published')?._id || '', auditorium: rooms.find(r=>r.isActive)?._id || '', startTime: `${date}T16:00`, ticketPrice:'400' });
  };
  const save = async event => {
    event.preventDefault();if (!draft) return;
    setBusy(true);setError('');setNotice('');
    try {
      const body = { movie:draft.movie, auditorium:draft.auditorium, startTime:new Date(draft.startTime).toISOString(), ticketPrice:Math.round(Number(draft.ticketPrice)*100) };
      if (adding) await api('/showtimes',{method:'POST',body});
      else await api(`/showtimes/${selectedId}`,{method:'PATCH',body});
      setNotice(adding ? 'Showing added.' : 'Showing updated.');setAdding(false);setRevision(v=>v+1);
    } catch(err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!confirmCancel) { setConfirmCancel(true);return; }
    setBusy(true);setError('');
    try { await api(`/showtimes/${selectedId}/cancel`,{method:'PATCH'});setNotice('Showing cancelled.');setSelectedId('');setConfirmCancel(false);setRevision(v=>v+1); }
    catch(err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="showings-admin">
    {error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="showings-top">
      <section className="admin-timeline"><div className="timeline-heading"><h2>{new Date(`${date}T12:00:00`).toLocaleDateString('en-PH',{weekday:'long',day:'numeric',month:'long'})}</h2><div><button className="btn btn-secondary btn-small" onClick={()=>shiftDate(-1)}>← Day</button><button className="btn btn-secondary btn-small" onClick={()=>shiftDate(1)}>Day →</button></div></div>
        <div className="timeline-scroll"><div className="timeline-hours">{['10:00','12:00','14:00','16:00','18:00','20:00','22:00'].map(t=><span key={t}>{t}</span>)}</div>
          {rooms.map(room => <div className="timeline-row" key={room._id}><strong>{room.name}</strong><div className="timeline-track">{showings.filter(s=>s.auditorium?._id===room._id).map(s => { const start = new Date(s.startTime);const end = new Date(s.endTime);const left = Math.max(0,(start.getHours()+start.getMinutes()/60-10)/12*100);const width=Math.max(8,(end-start)/3600000/12*100);return <button type="button" key={s._id} title={`${s.movie?.title} ${clock(s.startTime)}–${clock(s.endTime)}`} className={`timeline-block ${s.status==='cancelled'?'cancelled':''} ${selectedId===s._id?'selected':''}`} style={{left:`${left}%`,width:`${width}%`}} onClick={()=>{setAdding(false);setSelectedId(s._id);setConfirmCancel(false);}}><b>{s.movie?.title}</b><small>{clock(s.startTime)}–{clock(s.endTime)}</small></button>;})}</div></div>)}
        </div><div className="timeline-legend"><span>■ Scheduled</span><span>■ Selected</span><span>▢ Cancelled</span></div>
      </section>
      <section className="showing-editor"><span className="eyebrow">{adding?'New showing':'Selected showing'}</span><h2>{adding?'Add showing':selected?.movie?.title || 'Choose a showing'}</h2>{draft && <form onSubmit={save}><label>Movie<select value={draft.movie} onChange={e=>setDraft({...draft,movie:e.target.value})} required>{movies.filter(m=>m.status==='published').map(m=><option value={m._id} key={m._id}>{m.title}</option>)}</select></label><label>Auditorium<select value={draft.auditorium} onChange={e=>setDraft({...draft,auditorium:e.target.value})} required>{rooms.filter(r=>r.isActive).map(r=><option value={r._id} key={r._id}>{r.name} · {r.rows*r.seatsPerRow} seats</option>)}</select></label><div className="editor-pair"><label>Start<input type="datetime-local" required value={draft.startTime} onChange={e=>setDraft({...draft,startTime:e.target.value})}/></label><label>Price per seat<input type="number" min="0" step=".01" required value={draft.ticketPrice} onChange={e=>setDraft({...draft,ticketPrice:e.target.value})}/></label></div>{selected && <p className="editor-note">If tickets were booked, the time, room and price are locked. Cancel this showing and create a new one to change them.</p>}<div className="editor-actions">{selected && selected.status==='scheduled' && <button className="btn btn-danger btn-small" type="button" disabled={busy} onClick={cancel}>{confirmCancel?'Confirm cancellation':'Cancel showing'}</button>}<button className="btn btn-primary btn-small" disabled={busy || selected?.status==='cancelled'} type="submit">{adding?'Add showing':'Save changes'}</button></div></form>}</section>
    </div>
    <section className="admin-showings-list"><div className="timeline-heading"><h2>Upcoming showings</h2><button className="btn btn-primary btn-small" onClick={startAdd}>Add showing</button></div><div className="showings-table-wrap"><table><thead><tr><th>Movie</th><th>Room</th><th>Start</th><th>Price</th><th>Seats left</th><th>Status</th></tr></thead><tbody>{showings.map(s=><tr key={s._id} onClick={()=>{setSelectedId(s._id);setAdding(false);}}><td>{s.movie?.title}</td><td>{s.auditorium?.name}</td><td>{new Date(s.startTime).toLocaleDateString('en-PH',{weekday:'short',day:'numeric',month:'short'})} · {clock(s.startTime)}</td><td>{pesos(s.ticketPrice)}</td><td>{s.remainingSeats} / {s.totalSeats}</td><td><span className={`admin-status ${s.status}`}>{s.status}</span></td></tr>)}</tbody></table></div>{!showings.length && <p className="admin-empty">No showings on this day. Add one to build the schedule.</p>}</section>
  </div>;
}
