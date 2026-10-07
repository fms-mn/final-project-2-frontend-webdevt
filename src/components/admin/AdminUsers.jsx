import { useState } from 'react';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

export default function AdminUsers({ users, reload }) {
  const { busy, busyAction, error, notice, run } = useAdminAction();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(needle));

  const setActive = async (user, isActive) => {
    const done = await run(
      () => api(`/users/${user._id}/status`, { method: 'PATCH', body: { isActive } }),
      `${user.name}'s account was ${isActive ? 'enabled' : 'disabled'}`, `user:${user._id}`,
    );
    if (done) reload();
  };

  return (
    <>
      <Feedback error={error} notice={notice} />
      <div className="admin-panel admin-toolbar">
        <label className="admin-search">Search accounts<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" /></label>
        <span className="admin-count">{shown.length} of {users.length}</span>
      </div>
      <div className="admin-list">
        {shown.length === 0 && <div className="admin-panel">No account matches.</div>}
        {shown.map((user) => (
          <div className="admin-row" key={user._id}>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email} · {user.role} · {user.isActive ? 'active' : 'disabled'} · joined {new Date(user.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', day: 'numeric', month: 'short', year: 'numeric' })}</small>
            </div>
            {user.role === 'user' && (
              <button type="button" className="btn btn-secondary btn-small" disabled={busy} aria-busy={busyAction === `user:${user._id}`} onClick={() => setActive(user, !user.isActive)}>
                <ActionPending pending={busyAction === `user:${user._id}`}>{busyAction === `user:${user._id}` ? 'Updating...' : user.isActive ? 'Disable' : 'Enable'}</ActionPending>
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
