const paymentLabels = { paid: 'Paid', unpaid: 'Unpaid', refunded: 'Refunded', not_taken: 'No payment collected' };
const money = centavos => `₱${(centavos / 100).toLocaleString('en-PH')}`;

export function refundSummary(info, after = false) {
  const refund = info?.refund;
  const paymentStatus = paymentLabels[info?.paymentStatus] || 'Unavailable';
  const amount = Number.isInteger(refund?.amount) && refund.amount >= 0 ? refund.amount : null;
  const base = { paymentStatus, reference: refund?.reference || null, unavailable: false };
  const test = refund?.mode === 'simulated';
  switch (refund?.status) {
    case 'available':
      if (!after && test && amount !== null) return { ...base, title: 'Simulated refund', message: `A simulated refund of ${money(amount)} will be recorded. No real money was charged or will be returned.` };
      break;
    case 'refunded':
      if (test) return { ...base, title: 'Simulated refund recorded', message: `${amount !== null ? `A simulated refund of ${money(amount)} was recorded.` : 'The payment is marked refunded; its amount is unavailable.'} No real money was charged or will be returned.${after ? '' : ' No additional refund will be issued.'}` };
      break;
    case 'none': return { ...base, title: 'No refund', message: refund.reason || 'There is no payment to refund.' };
    case 'non_refundable':
      if (refund.reason) return { ...base, title: 'Not refundable', message: refund.reason };
      break;
    case 'pending': return { ...base, title: 'Refund pending', message: after ? 'Cancellation is complete, but the refund is pending. Check refund information again; do not cancel again.' : 'The refund is pending. No additional refund will be issued.' };
    case 'failed': return { ...base, title: 'Refund failed', message: after ? 'Cancellation is complete, but the refund failed. Check refund information again; do not cancel again.' : 'The refund failed. Its outcome must be checked before continuing.' };
  }
  return { ...base, unavailable: true, title: 'Refund information unavailable', message: after ? 'Cancellation is complete. The refund outcome could not be verified. Check refund information again; do not cancel again.' : refund?.reason || 'The refund outcome could not be verified. Retry to refresh payment and refund information.' };
}
