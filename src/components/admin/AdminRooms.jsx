import { useEffect, useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import { describeError } from '../../utils/adminTools';
import Feedback from './Feedback';
import { SeatPreview } from './SeatGrid';
import RoomBlockedSeats from './RoomBlockedSeats';
import useAdminAction from './useAdminAction';

const blankRoom = { name: '', rows: 8, seatsPerRow: 10, isActive: true };

export default function AdminRooms() {
  const { busy, busyAction, error, notice, setError, clear, run } = useAdminAction();
  const [rooms, setRooms] = useState([]);
  const [draft, setDraft] = useState(blankRoom);
  const [confirmRemove, setConfirmRemove] = useState('');
  const [revision, setRevision] = useState(0);
  const [blockedDirty, setBlockedDirty] = useState(false);
  const [blockingBusy, setBlockingBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api('/auditoriums', { signal: controller.signal })
      .then(setRooms)
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [revision, setError]);

  const edit = (field) => (event) => setDraft({ ...draft, [field]: event.target.value });
  const mayLeaveBlocked = () => !blockedDirty || window.confirm('Discard unsaved blocked-seat changes for this auditorium?');
  const chooseRoom = room => {
    if (room && room._id === draft._id) return;
    if (busy || blockingBusy || !mayLeaveBlocked()) return;
    setDraft(room ? { _id: room._id, name: room.name, rows: room.rows, seatsPerRow: room.seatsPerRow, isActive: room.isActive } : blankRoom);
    setBlockedDirty(false);
    clear();
  };

  const save = async (event) => {
    event.preventDefault();
    if (busy || blockingBusy || !mayLeaveBlocked()) return;
    const body = { name: draft.name, rows: Number(draft.rows), seatsPerRow: Number(draft.seatsPerRow), isActive: draft.isActive };
    const done = await run(
      () => api(draft._id ? `/auditoriums/${draft._id}` : '/auditoriums', { method: draft._id ? 'PATCH' : 'POST', body }),
      draft._id ? 'Room updated' : 'Room added', 'save',
    );
    if (done) { setDraft(blankRoom); setRevision((value) => value + 1); }
  };

  const remove = async (room) => {
    if (busy || blockingBusy || (room._id === draft._id && !mayLeaveBlocked())) return;
    if (confirmRemove !== room._id) { setConfirmRemove(room._id); return; }
    setConfirmRemove('');
    if (await run(() => api(`/auditoriums/${room._id}`, { method: 'DELETE' }), 'Room deleted', `remove:${room._id}`)) { if (room._id === draft._id) { setDraft(blankRoom); setBlockedDirty(false); } setRevision((value) => value + 1); }
  };

  return (
    <div className="admin-grid-two">
      <form className="admin-panel admin-form room-editor-form" onSubmit={save}>
        <h2>{draft._id ? 'Edit room' : 'Add room'}</h2>
        <Feedback error={error} notice={notice} />
        <label>Name<input required value={draft.name} onChange={edit('name')} /></label>
        <label>Rows (A to Z)<input required type="number" min="1" max="26" value={draft.rows} onChange={edit('rows')} /></label>
        <label>Seats per row<input required type="number" min="1" max="50" value={draft.seatsPerRow} onChange={edit('seatsPerRow')} /></label>
        <label className="admin-check"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Active (can be scheduled)</label>
        {!draft._id && <SeatPreview rows={Number(draft.rows)} seatsPerRow={Number(draft.seatsPerRow)} />}
        <p className="profile-help">The seat layout is locked once any showing has used the room; you can still rename it. A room with upcoming showings cannot be deactivated.</p>
        <div className="admin-actions">
          <button className="btn btn-primary btn-small" type="submit" disabled={busy || blockingBusy} aria-busy={busyAction === 'save'}><ActionPending pending={busyAction === 'save'}>{busyAction === 'save' ? 'Saving...' : 'Save room'}</ActionPending></button>
          {draft._id && <button type="button" className="btn btn-secondary btn-small" disabled={busy || blockingBusy} onClick={() => chooseRoom(null)}>Cancel edit</button>}
        </div>
        {draft._id && (
          <RoomBlockedSeats key={draft._id} roomId={draft._id} disabled={busy} onDirtyChange={setBlockedDirty} onSavingChange={setBlockingBusy}
            onSaved={room => setRooms(current => current.map(item => item._id === room._id ? room : item))} />
        )}
      </form>
      <div className="admin-list">
        {rooms.length === 0 && <div className="admin-panel show-empty">No rooms yet. Add one to start scheduling showings.</div>}
        {rooms.map((room) => (
          <div className="admin-row room-row" key={room._id}>
            <div>
              <strong>{room.name}</strong>
              <small title={`${room.rows} rows, ${room.seatsPerRow} seats per row`}>{room.rows}×{room.seatsPerRow} · {room.rows * room.seatsPerRow} seats</small>
              <span className="room-badges">
                <span className={`admin-status${room.isActive ? '' : ' expired'}`}>{room.isActive ? 'Active' : 'Inactive'}</span>
                {room.blockedSeats?.length > 0 && <span className="admin-status pending">{room.blockedSeats.length} blocked</span>}
              </span>
            </div>
            <div className="admin-actions">
              <button type="button" className="btn btn-secondary btn-small" disabled={busy || blockingBusy} onClick={() => chooseRoom(room)}>Edit</button>
              <button type="button" className="btn btn-danger btn-small" disabled={busy || blockingBusy} aria-busy={busyAction === `remove:${room._id}`} onClick={() => remove(room)}>
                <ActionPending pending={busyAction === `remove:${room._id}`}>{busyAction === `remove:${room._id}` ? 'Deleting...' : confirmRemove === room._id ? 'Confirm delete' : 'Delete'}</ActionPending>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
