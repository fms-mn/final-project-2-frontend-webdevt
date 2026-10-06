export default function ActionPending({ children, pending }) {
  return <>{pending && <span className="action-spinner-delay" aria-hidden="true"><span className="action-spinner" /></span>}{children}</>;
}
