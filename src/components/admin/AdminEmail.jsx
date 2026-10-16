import { useEffect, useState } from 'react';
import { FiCheckCircle, FiMail, FiSend } from 'react-icons/fi';
import { api } from '../../api';
import ActionPending from '../ActionPending';
import { describeError } from '../../utils/adminTools';
import Feedback from './Feedback';
import useAdminAction from './useAdminAction';

const WHAT_CUSTOMERS_GET = [
  ['Welcome', 'When they create an account'],
  ['Booking confirmed', 'The tickets and receipt, right after they pay'],
  ['Booking cancelled', 'When they cancel, with the refund'],
  ['Showing cancelled', 'When the cinema cancels a showing, with the refund'],
  ['Showing moved', 'When the time or room changes, with the old and new'],
  ['Reminder', 'A few hours before the showing starts'],
];

// Email: is a provider connected, what customers receive, and a button to send yourself a test.
export default function AdminEmail() {
  const { busy, busyAction, error, setError, run } = useAdminAction();
  const [info, setInfo] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api('/admin/settings/mail', { signal: controller.signal })
      .then(setInfo)
      .catch((err) => { if (err.name !== 'AbortError') setError(describeError(err)); });
    return () => controller.abort();
  }, [setError]);

  const sendTest = () => {
    setResult(null);
    run(async () => { setResult(await api('/admin/settings/mail/test', { method: 'POST', body: {} })); }, '', 'test');
  };

  return (
    <section className="admin-panel admin-email" aria-label="Email notifications">
      <div className="admin-email-head">
        <h2><FiMail aria-hidden="true" /> Email notifications</h2>
        {info && <span className={`admin-status${info.ready ? '' : ' pending'}`}>{info.ready ? `Connected · ${info.label}` : 'Not connected'}</span>}
      </div>
      <Feedback error={error} notice="" />

      {info && (
        <>
          <p className="profile-help">
            {info.ready
              ? <>Customers get their emails through {info.label}, from <b>{info.from}</b>.</>
              : <>No email service is connected, so emails are not delivered to customers yet. {info.problem} See &quot;Emails&quot; in docs/DEPLOY.md to set one up (it takes about five minutes).</>}
          </p>
          {info.ready && !info.appUrl && (
            <p className="admin-warning" role="note">APP_URL is not set, so emails have no buttons or logo. Set it to your website&apos;s address (for example https://your-site.vercel.app).</p>
          )}

          <div className="admin-email-test">
            <button type="button" className="btn btn-primary btn-small" disabled={busy} aria-busy={busyAction === 'test'} onClick={sendTest}>
              <FiSend aria-hidden="true" /> <ActionPending pending={busyAction === 'test'}>{busyAction === 'test' ? 'Sending…' : 'Send me a test email'}</ActionPending>
            </button>
            <span className="profile-help">Goes to your own address only.</span>
          </div>
          {result && (
            result.ok
              ? <p className="admin-notice" role="status"><FiCheckCircle aria-hidden="true" /> {result.simulated
                ? `Nothing was sent, because no email service is connected. The email was only prepared for ${result.to}.`
                : `Sent to ${result.to}. It should arrive in a minute; check the spam folder if it does not.`}</p>
              : <p className="error-message" role="alert">The test email failed: {result.error}</p>
          )}

          <h3 className="admin-email-subhead">What customers receive</h3>
          <ul className="admin-email-list">
            {WHAT_CUSTOMERS_GET.map(([name, when]) => <li key={name}><b>{name}</b><span>{when}</span></li>)}
          </ul>
        </>
      )}
    </section>
  );
}
