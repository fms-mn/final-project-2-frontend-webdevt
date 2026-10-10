import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ActionPending from '../components/ActionPending';
import { profileErrors, profileInitials } from '../utils/profile';
import './Profile.css';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const pending = useRef(false);
  const hasChanges = name.trim() !== user.name || phone.trim() !== (user.phone || '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasChanges || pending.current) return;
    setError('');
    setSaved(false);
    const errors = profileErrors(name, phone);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      event.currentTarget.querySelector(errors.name ? '#profile-name' : '#profile-phone').focus();
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      const updated = await updateProfile({ name, phone });
      setName(updated.name);
      setPhone(updated.phone || '');
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your profile');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="profile-page fade-in">
      <section className="profile-card" aria-labelledby="profile-heading">
        <div className="profile-identity">
          <div className="profile-avatar" aria-label={`Initials for ${user.name}`}>{profileInitials(user.name)}</div>
          <h1 id="profile-heading">My Profile</h1>
          <p className="profile-subtitle">Your FILME account details</p>
          {user.isDemo && <p className="profile-demo-notice">Demo mode — saved in this browser. No real tickets or payments.</p>}
        </div>
        <div className="profile-form-panel">
          {error && <div className="error-message" role="alert">{error}</div>}
          {saved && <div className="profile-success" role="status">Profile saved.</div>}
          <form onSubmit={handleSubmit} noValidate aria-busy={saving}>
            <div className="profile-field">
              <label htmlFor="profile-name">Name</label>
              <input id="profile-name" type="text" autoComplete="name" value={name} disabled={saving} onChange={(event) => { setName(event.target.value); setFieldErrors(current => ({ ...current, name: undefined })); setError(''); setSaved(false); }} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'profile-name-error' : undefined} required />
              {fieldErrors.name && <span id="profile-name-error" className="profile-field-error" role="alert">{fieldErrors.name}</span>}
            </div>
            <div className="profile-field">
              <label htmlFor="profile-phone">Phone <span className="profile-optional">(optional)</span></label>
              <input id="profile-phone" type="tel" autoComplete="tel" value={phone} disabled={saving} onChange={(event) => { setPhone(event.target.value); setFieldErrors(current => ({ ...current, phone: undefined })); setError(''); setSaved(false); }} placeholder="e.g. 09171234567" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'profile-phone-error' : undefined} />
              {fieldErrors.phone && <span id="profile-phone-error" className="profile-field-error" role="alert">{fieldErrors.phone}</span>}
            </div>
            <div className="profile-field">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" type="email" value={user.email} readOnly aria-describedby="profile-email-help" />
              <p className="profile-help" id="profile-email-help">Email cannot be changed here.</p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={!hasChanges || saving} aria-busy={saving}><ActionPending pending={saving}>{saving ? 'Saving...' : 'Save Profile'}</ActionPending></button>
          </form>
        </div>
      </section>
    </div>
  );
}
