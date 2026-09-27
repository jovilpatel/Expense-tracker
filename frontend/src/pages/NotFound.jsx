import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page">
      <div className="page-state">
        <div style={{ fontSize: 42, fontWeight: 800, color: 'var(--primary)' }}>404</div>
        <p className="text-muted" style={{ margin: 0 }}>The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
      </div>
    </div>
  );
}