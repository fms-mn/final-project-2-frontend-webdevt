// The error and success messages every admin screen shows above its content.
export default function Feedback({ error, notice }) {
  return (
    <>
      {error && <div className="error-message" role="alert">{error}</div>}
      {notice && <div className="admin-notice" role="status">{notice}</div>}
    </>
  );
}
