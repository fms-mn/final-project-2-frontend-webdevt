import { useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import ConfirmDialog from './ConfirmDialog';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

export default function AdminUsers({ users, reload }) {
  const { busy, busyAction, error, notice, clear, run } = useAdminAction();
  const [removing, setRemoving] = useState(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const needle = query.trim().toLowerCase();
  const inGroup = {
    all: () => true,
    customers: (user) => user.role === 'user',
    admins: (user) => user.role === 'admin',
    disabled: (user) => !user.isActive,
  };
  const shown = users.filter((user) => inGroup[group](user) && `${user.name} ${user.email}`.toLowerCase().includes(needle));

  const setActive = async (user, isActive) => {
    const done = await run(
      () => api(`/users/${user._id}/status`, { method: 'PATCH', body: { isActive } }),
      `${user.name}'s account was ${isActive ? 'enabled' : 'disabled'}`, `user:${user._id}`,
    );
    if (done) reload();
  };

  const remove = async () => {
    const user = removing;
    const done = await run(
      () => api(`/users/${user._id}`, { method: 'DELETE' }),
      `${user.name}'s account was removed and they were emailed`, `remove:${user._id}`,
    );
    if (done) { setRemoving(null); reload(); }
  };

  return (
    <>
      {removing && (
        <ConfirmDialog tone="danger" title={`Remove ${removing.name}'s account?`} confirmLabel="Remove account" cancelLabel="Keep account"
          busy={busy} error={error} onClose={() => { setRemoving(null); clear(); }} onConfirm={remove}>
          <p><strong>{removing.email}</strong> will no longer be able to sign in. This cannot be undone.</p>
          <p>We will email them to say their account was removed. Their past bookings stay in your records. If they still have upcoming tickets, cancel those first, or disable the account instead.</p>
        </ConfirmDialog>
      )}
      <Feedback error={removing ? '' : error} notice={notice} />
      <div className="admin-panel admin-toolbar">
        <label className="admin-search">Search accounts<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" /></label>
        <span className="admin-count">{shown.length} of {users.length}</span>
      </div>
      <div className="status-chips" role="group" aria-label="Filter accounts">
        {[['all', 'All'], ['customers', 'Customers'], ['admins', 'Admins'], ['disabled', 'Disabled']].map(([value, label]) => (
          <button key={value} type="button" className={`filter-btn ${group === value ? 'active' : ''}`} aria-pressed={group === value} onClick={() => setGroup(value)}>{label} <span className="chip-count">{users.filter(inGroup[value]).length}</span></button>
        ))}
      </div>
      <div className="admin-list">
        {shown.length === 0 && <div className="admin-panel show-empty">No account matches. Try another filter or search.</div>}
        {shown.map((user) => (
          <div className="admin-row" key={user._id}>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email} · {user.role} · {user.isActive ? 'active' : 'disabled'} · joined {new Date(user.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'short', year: 'numeric' })}</small>
            </div>
            {user.role === 'user' && (
              <div className="admin-actions">
                <button type="button" className="btn btn-secondary btn-small" disabled={busy} aria-busy={busyAction === `user:${user._id}`} onClick={() => setActive(user, !user.isActive)}>
                  <ActionPending pending={busyAction === `user:${user._id}`}>{busyAction === `user:${user._id}` ? 'Updating...' : user.isActive ? 'Disable' : 'Enable'}</ActionPending>
                </button>
                <button type="button" className="btn btn-danger btn-small" disabled={busy} aria-label={`Remove ${user.name}'s account`} onClick={() => { clear(); setRemoving(user); }}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
