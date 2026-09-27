import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageLoader, ErrorState } from '../components/States.jsx';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import AmountBadge from '../components/AmountBadge.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { formatINR } from '../utils/format.js';
import { cn } from '../utils/format.js';

const STAT_CARDS = [
  { title: 'Total Balance', key: 'totalBalance', tone: 'auto', big: true },
  { title: 'Cash Balance', key: 'cashBalance', tone: 'auto' },
  { title: 'Online Balance', key: 'onlineBalance', tone: 'auto' },
  { title: 'Money To Receive', key: 'moneyToReceive', tone: 'positive' },
  { title: 'Money To Pay', key: 'moneyToPay', tone: 'negative' },
  { title: 'Cash Credit', key: 'totalCashCredit', tone: 'positive' },
  { title: 'Cash Debit', key: 'totalCashDebit', tone: 'negative' },
  { title: 'Online Credit', key: 'totalOnlineCredit', tone: 'positive' },
  { title: 'Online Debit', key: 'totalOnlineDebit', tone: 'negative' },
];

function StatCard({ title, value, tone, big }) {
  const t = tone === 'auto' ? (value >= 0 ? 'positive' : 'negative') : tone;
  const className = t === 'positive' ? 'stat-value col-green' : t === 'negative' ? 'stat-value col-red' : 'stat-value';
  return (
    <Card className="stat-card">
      <div className="stat-title">{title}</div>
      <div className={cn(className, big && 'is-big')} style={big ? { fontSize: 26 } : undefined}>
        {formatINR(value)}
      </div>
    </Card>
  );
}

function AlertSections({ title, type, alerts }) {
  const groups = [
    { key: 'overdue', label: 'Overdue', tone: 'red' },
    { key: 'dueToday', label: 'Due Today', tone: 'amber' },
    { key: 'dueSoon', label: 'Due Soon', tone: 'blue' },
  ];

  const any = groups.some((g) => (alerts[g.key] || []).length > 0);

  return (
    <Card>
      <div className="card-title">{title}</div>
      {!any ? (
        <p className="text-muted" style={{ margin: 0, fontSize: 13.5 }}>
          No upcoming or overdue items.
        </p>
      ) : (
        groups.map(
          (g) =>
            (alerts[g.key] || []).length > 0 && (
              <div className="alert-group" key={g.key}>
                <h4>
                  <Badge tone={g.tone}>{g.label}</Badge>
                </h4>
                <div className="alert-list">
                  {(alerts[g.key] || []).map((d) => (
                    <Link key={`${type}-${d.id}`} to={`/${type}/${d.id}`} className="alert-item">
                      <div className="alert-item-main">
                        <span className="alert-person">{d.person_name}</span>
                        <span className="text-muted">{d.reason || 'No reason'}</span>
                      </div>
                      <div className="alert-item-side">
                        <AmountBadge amount={d.remaining_amount} positive={type === 'receive'} />
                        <span className="text-muted">due {d.expected_date}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
        )
      )}
    </Card>
  );
}

export default function Dashboard() {
  const [balances, setBalances] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [b, a] = await Promise.all([api.get('/balances'), api.get('/alerts')]);
      setBalances(b.data);
      setAlerts(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader label="Loading balances…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle="Your money at a glance" />

      <div className="stat-grid">
        {STAT_CARDS.map((c) => (
          <StatCard key={c.key} title={c.title} value={balances[c.key]} tone={c.tone} big={c.big} />
        ))}
      </div>

      <div className="section">
        <div className="section-title">Alerts</div>
        <div className="alert-columns">
          <AlertSections title="To Receive" type="receive" alerts={alerts.receive || {}} />
          <AlertSections title="To Pay" type="pay" alerts={alerts.pay || {}} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">Active Debts</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/receive" className="btn">
            Money To Receive · {formatINR(balances.moneyToReceive)}
          </Link>
          <Link to="/pay" className="btn">
            Money To Pay · {formatINR(balances.moneyToPay)}
          </Link>
        </div>
      </div>
    </div>
  );
}