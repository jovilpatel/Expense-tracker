export function Spinner() {
  return <div className="spinner" role="status" aria-live="polite" aria-label="Loading" />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-state">
      <Spinner />
      <p className="text-muted" style={{ margin: 0 }}>{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="page-state">
      <p style={{ fontWeight: 600, color: 'var(--danger)' }}>{message}</p>
      {onRetry ? (
        <button type="button" className="btn" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}