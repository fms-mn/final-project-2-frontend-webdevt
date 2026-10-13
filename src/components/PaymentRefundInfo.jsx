import { refundSummary } from '../utils/refund';
import './PaymentRefundInfo.css';

export default function PaymentRefundInfo({ info, loading, error, after = false, onRetry }) {
  const summary = refundSummary(info, after);
  return <section className="payment-refund-info" aria-label="Payment and refund">
    <h3>Payment and refund</h3>
    {loading ? <p role="status">Loading payment and refund information…</p> : error ? <p role="alert">Payment and refund information unavailable. {error}</p> : <>
      <p>Payment status: <strong>{summary.paymentStatus}</strong></p>
      <p><strong>{summary.title}</strong></p><p>{summary.message}</p>
      {summary.reference && <p>Refund reference: <code>{summary.reference}</code></p>}
    </>}
    {!loading && (error || summary.unavailable || ['pending', 'failed'].includes(info?.refund?.status)) && onRetry && <button type="button" className="btn btn-secondary btn-small" onClick={onRetry}>Retry refund information</button>}
  </section>;
}
