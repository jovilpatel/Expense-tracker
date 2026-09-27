import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { PageLoader, ErrorState } from '../components/States.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatINR } from '../utils/format.js';
import useDebounce from '../hooks/useDebounce.js';

export default function People() {
  const toast = useToast();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 250);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get('/persons')
      .then((res) => {
        if (!cancelled) setPeople(res.data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((p) => p.person_name.toLowerCase().includes(needle));
  }, [people, debouncedQ]);

  return (
    <div className="page">
      <PageHeader title="People" subtitle="Everyone you have money dealings with" />

      <FilterInput value={q} onChange={setQ} />

      {loading ? (
        <PageLoader label="Loading people…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : people.length === 0 ? (
        <EmptyState title="No people yet" message="People appear here when you record a transaction or debt with a person name." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" message={`Nobody matches "${debouncedQ}".`} />
      ) : (
        <div className="person-list">
          {filtered.map((p) => (
            <Link key={p.person_name} to={`/people/${encodeURIComponent(p.person_name)}`} className="card person-card">
              <span className="person-name">{p.person_name}</span>
              <div className="person-stats">
                <div className="person-row">
                  <span className="text-muted">You receive</span>
                  <strong className="col-green">{formatINR(p.netToReceive || 0)}</strong>
                </div>
                <div className="person-row">
                  <span className="text-muted">You pay</span>
                  <strong className="col-red">{formatINR(p.netToPay || 0)}</strong>
                </div>
                <div className="person-row" style={{ borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                  <span className="text-muted">Net balance</span>
                  <strong className={(p.balanceNet || 0) >= 0 ? 'col-green' : 'col-red'}>
                    {(p.balanceNet || 0) >= 0 ? '+' : '−'}
                    {formatINR(Math.abs(p.balanceNet || 0))}
                  </strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterInput({ value, onChange }) {
  return (
    <div style={{ marginBottom: 18, maxWidth: 420 }}>
      <input
        type="search"
        className="input"
        placeholder="Search people…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search people"
      />
    </div>
  );
}