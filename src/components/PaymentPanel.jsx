import { useRef, useState } from 'react';
import { FiInfo } from 'react-icons/fi';
import {
  cardBrandOf, cardErrors, formatCardNumber, formatExpiry, methodName, mobileError,
} from '../utils/payment';
import './payment.css';

const METHODS = [
  { id: 'card', label: 'Test Card', note: 'Visa · Mastercard' },
  { id: 'gcash', label: 'GCash Simulation', note: 'Test wallet' },
  { id: 'maya', label: 'Maya Simulation', note: 'Test wallet' },
];

// Cards that behave in a known way, so every outcome can be shown on purpose.
const DEMO_CARDS = [
  { number: '4242 4242 4242 4242', result: 'Succeeds' },
  { number: '5555 5555 5555 4444', result: 'Succeeds (Mastercard)' },
  { number: '4000 0000 0000 0002', result: 'Declined' },
  { number: '4000 0000 0000 9995', result: 'Insufficient funds' },
  { number: '4000 0000 0000 0069', result: 'Expired card' },
  { number: '4000 0000 0000 0127', result: 'Wrong security code' },
  { number: '4000 0000 0000 0119', result: 'Processing error' },
];

export function PaymentSimulationNotice() {
  return <div className="pay-simulation-notice" role="note"><FiInfo aria-hidden="true" /><p><strong>Test Payment Only</strong> — No real money will be charged. Use the provided test card numbers. Do not enter real payment credentials.</p></div>;
}

function Field({ id, label, error, children }) {
  return (
    <div className={`pay-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="pay-field-error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  );
}

// The wallet app: where a GCash or Maya payment is approved. Simulated.
function WalletApproval({ payment, total, pending, onAuthorize }) {
  const name = methodName(payment.method);
  return (
    <div className={`pay-wallet pay-wallet-${payment.method}`} role="group" aria-label={`${name} payment approval`}>
      <div className="pay-wallet-bar"><b>{name} Simulation</b><span>Test request</span></div>
      <div className="pay-wallet-body">
        <p className="pay-wallet-to">FILME Cinemas</p>
        <p className="pay-wallet-amount">₱{total.toLocaleString('en-PH')}</p>
        <p className="pay-wallet-account">From account •••• {payment.walletLast4}</p>
        <div className="pay-wallet-actions">
          <button type="button" className="btn btn-secondary" onClick={() => onAuthorize(false)} disabled={pending}>Decline</button>
          <button type="button" className="btn btn-primary" onClick={() => onAuthorize(true)} disabled={pending} aria-busy={pending}>
            {pending ? 'Simulating…' : `Simulate Payment ₱${total.toLocaleString('en-PH')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPanel({ formId, mode, total, pending, error, walletPayment, onPay, onAuthorize }) {
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState({});
  const numberRef = useRef(null);
  const mobileRef = useRef(null);
  const brand = cardBrandOf(card.number);

  const setField = (field, value) => { setCard((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: '' })); };
  const submit = (event) => {
    event.preventDefault();
    if (pending || mode !== 'simulated') return;
    const found = method === 'card' ? cardErrors(card) : { mobile: mobileError(mobile) };
    const clean = Object.fromEntries(Object.entries(found).filter(([, message]) => message));
    setErrors(clean);
    if (Object.keys(clean).length) {
      (method === 'card' ? numberRef : mobileRef).current?.focus();
      return;
    }
    onPay(method === 'card'
      ? { method, number: card.number, expiry: card.expiry, cvc: card.cvc, name: card.name }
      : { method, mobile });
  };

  if (mode !== 'simulated' || (walletPayment && walletPayment.mode !== 'simulated')) {
    return <div className="pay-panel"><p className="pay-error" role="alert">Payment unavailable: the payment mode could not be verified. No payment can be submitted.</p></div>;
  }
  if (walletPayment) {
    return (
      <div className="pay-panel">
        <PaymentSimulationNotice />
        <WalletApproval payment={walletPayment} total={total} pending={pending} onAuthorize={onAuthorize} />
        {error && <p className="pay-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form className="pay-panel" id={formId} onSubmit={submit} noValidate aria-busy={pending}>
      <PaymentSimulationNotice />
      <div className="pay-methods" role="radiogroup" aria-label="Payment method">
        {METHODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={method === item.id}
            className={`pay-method pay-method-${item.id}${method === item.id ? ' is-active' : ''}`}
            onClick={() => { setMethod(item.id); setErrors({}); }}
            disabled={pending}
          >
            <span className="pay-method-mark" aria-hidden="true">{item.label[0]}</span>
            <span><b>{item.label}</b><small>{item.note}</small></span>
          </button>
        ))}
      </div>

      {method === 'card' ? (
        <fieldset className="pay-fields" disabled={pending}>
          <Field id="pay-number" label="Test card number" error={errors.number}>
            <div className="pay-number">
              <input
                id="pay-number" ref={numberRef} inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242"
                value={card.number} onChange={(event) => setField('number', formatCardNumber(event.target.value))}
                aria-invalid={Boolean(errors.number)} aria-describedby={errors.number ? 'pay-number-error' : undefined}
              />
              {brand && <span className="pay-brand" aria-label={brand}>{brand === 'American Express' ? 'AMEX' : brand}</span>}
            </div>
          </Field>
          <div className="pay-row">
            <Field id="pay-expiry" label="Expiry" error={errors.expiry}>
              <input
                id="pay-expiry" inputMode="numeric" autoComplete="off" placeholder="MM/YY" maxLength={5}
                value={card.expiry} onChange={(event) => setField('expiry', formatExpiry(event.target.value, card.expiry))}
                aria-invalid={Boolean(errors.expiry)} aria-describedby={errors.expiry ? 'pay-expiry-error' : undefined}
              />
            </Field>
            <Field id="pay-cvc" label="Security code" error={errors.cvc}>
              <input
                id="pay-cvc" inputMode="numeric" autoComplete="off" placeholder={brand === 'American Express' ? '1234' : '123'} maxLength={4}
                value={card.cvc} onChange={(event) => setField('cvc', event.target.value.replace(/\D/g, ''))}
                aria-invalid={Boolean(errors.cvc)} aria-describedby={errors.cvc ? 'pay-cvc-error' : undefined}
              />
            </Field>
          </div>
          <Field id="pay-name" label="Test name (optional)">
            <input id="pay-name" autoComplete="off" placeholder="Example name" value={card.name} onChange={(event) => setField('name', event.target.value)} />
          </Field>

          <details className="pay-demo">
            <summary>Supported test cards</summary>
            <p>Use any future expiry and any 3-digit security code.</p>
            <ul>
              {DEMO_CARDS.map((item) => (
                <li key={item.number}>
                  <code>{item.number}</code><span>{item.result}</span>
                  <button type="button" className="pay-demo-use" onClick={() => { setCard({ number: item.number, expiry: '12/30', cvc: '123', name: card.name }); setErrors({}); }}>Use</button>
                </li>
              ))}
            </ul>
          </details>
        </fieldset>
      ) : (
        <fieldset className="pay-fields" disabled={pending}>
          <Field id="pay-mobile" label={`${methodName(method)} simulation mobile number`} error={errors.mobile}>
            <input
              id="pay-mobile" ref={mobileRef} type="tel" inputMode="tel" autoComplete="off" placeholder="0917 123 4567"
              value={mobile} onChange={(event) => { setMobile(event.target.value); setErrors({}); }}
              aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? 'pay-mobile-error' : undefined}
            />
          </Field>
          <p className="pay-wallet-help">Use the example number 0917 123 4567. The next step uses local approve/decline simulation controls. No real wallet, password, MPIN, or OTP is needed.</p>
        </fieldset>
      )}

      {error && <p className="pay-error" role="alert">{error}</p>}
      {pending && <p className="pay-processing" role="status"><span className="pay-spinner" aria-hidden="true" /> Processing payment…</p>}
    </form>
  );
}
