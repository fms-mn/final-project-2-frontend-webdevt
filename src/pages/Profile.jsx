import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ActionPending from '../components/ActionPending';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasChanges = name.trim() !== user.name || phone.trim() !== (user.phone || '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasChanges || saving) return;
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const updated = await updateProfile({ name, phone });
      setName(updated.name);
      setPhone(updated.phone || '');
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-page profile-page fade-in">
      <div className="auth-container profile-container">
        <div className="auth-card">
          <h1>My Profile</h1>
          <p className="subtitle">Your FILME account details</p>
          {error && <div className="error-message" role="alert">{error}</div>}
          {saved && <div className="profile-success" role="status">Profile saved.</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="profile-name">Name</label>
              <input id="profile-name" type="text" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setError(''); setSaved(false); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'profile-name-error' : undefined} required />
              {error && <span id="profile-name-error" className="profile-field-error">{error}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="profile-phone">Phone <span className="profile-optional">(optional)</span></label>
              <input id="profile-phone" type="text" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setSaved(false); }} placeholder="e.g. 09171234567" />
            </div>
            <div className="form-group">
              <span className="profile-label">Email</span>
              <div className="profile-email">{user.email}</div>
              <p className="profile-help">Email cannot be changed here.</p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={!hasChanges || saving} aria-busy={saving}><ActionPending pending={saving}>{saving ? 'Saving...' : 'Save Profile'}</ActionPending></button>
          </form>
        </div>
      </div>
    </div>
  );
}
