import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageLoader, ErrorState } from '../components/States.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import DebtCard from '../components/DebtCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import { formatINR, cn } from '../utils/format.js';

export default function PersonDetail() {
  const { name } = useParams();
  const navigate = useNavigate();
  const person = decodeURIComponent(name);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/search', { q: person });
      setData(res.data || res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [person]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader label={`Searching for ${person}…`} />;
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={load}
      />
    );

  const transactions = data.transactions || [];
  const receive = data.receive || [];
  const pay = data.pay || [];
  const payments = data.payments || [];

  const toReceive = receive
    .filter((d) => d.status !== 'Received')
    .reduce((s, d) => s + (d.remaining_amount || 0), 0);
  const toPay = pay.filter((d) => d.status !== 'Paid').reduce((s, d) => s + (d.remaining_amount || 0), 0);
  const lent = receive.reduce((s, d) => s + (d.original_amount || 0), 0);
  const borrowed = pay.reduce((s, d) => s + (d.original_amount || 0), 0);

  const overview = [
    { label: 'Total Lent', value: lent, tone: 'positive' },
    { label: 'Yet to Receive', value: toReceive, tone: 'positive' },
    { label: 'Total Borrowed', value: borrowed, tone: 'negative' },
    { label: 'Yet to Pay', value: toPay, tone: 'negative' },
  ];

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate('/people')}>
        <Icon name="chevronLeft" size={16} />
        Back to People
      </button>

      <PageHeader title={person} subtitle="Complete history with this person" />

      {transactions.length === 0 && receive.length === 0 && pay.length === 0 && payments.length === 0 ? (
        <EmptyState title="No records" message={`Nothing found for "${person}".`} />
      ) : (
        <>
          <div className="stat-grid">
            {overview.map((o) => (
              <Card key={o.label} className="stat-card">
                <div className="stat-title">{o.label}</div>
                <div className={cn('stat-value', o.tone === 'positive' ? 'col-green' : 'col-red')}>
                  {formatINR(o.value)}
                </div>
              </Card>
            ))}
          </div>

          <div className="section">
            <div className="section-title">Transactions ({transactions.length})</div>
            {transactions.length ? (
              <TransactionTable transactions={transactions} />
            ) : (
              <EmptyState title="No transactions" />
            )}
          </div>

          <div className="section">
            <div className="section-title">Lent To Them ({receive.length})</div>
            {receive.length ? (
              <div className="debt-grid">
                {receive.map((d) => (
                  <DebtCard key={d.id} debt={d} type="receive" amountLabel="Received back" />
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing lent" />
            )}
          </div>

          <div className="section">
            <div className="section-title">Borrowed From Them ({pay.length})</div>
            {pay.length ? (
              <div className="debt-grid">
                {pay.map((d) => (
                  <DebtCard key={d.id} debt={d} type="pay" amountLabel="Paid back" />
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing borrowed" />
            )}
          </div>

          {payments.length ? (
            <div className="section">
              <div className="section-title">Payments ({payments.length})</div>
              <Card>
                <div className="table-wrap" style={{ border: 'none' }}>
                  <table className="table" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Kind</th>
                        <th>Mode</th>
                        <th>Notes</th>
                        <th className="num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.date}</td>
                          <td>{p.kind === 'receive' ? <span className="col-green">Received</span> : <span className="col-red">Paid</span>}</td>
                          <td>{p.payment_mode}</td>
                          <td className="desc">{p.notes || '—'}</td>
                          <td className="num">
                            <strong>{p.kind === 'receive' ? '+' : '−'}{formatINR(p.amount)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}