import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { PageLoader, ErrorState } from '../components/States.jsx';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import AmountBadge from '../components/AmountBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PaymentForm from '../components/PaymentForm.jsx';
import Icon from '../components/Icon.jsx';
import { formatINR } from '../utils/format.js';

export default function PayDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [debt, setDebt] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/money-to-pay/${id}`);
      setDebt(res.data);
      setPayments(res.data.payments || []);
    } catch (err) {
      setError(err.message);
      if (err.status === 404) toast.error('Record not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader label="Loading record…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const completed = debt.status === 'Paid';

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate('/pay')}>
        <Icon name="chevronLeft" size={16} />
        Back to Money To Pay
      </button>

      <PageHeader title={debt.person_name} subtitle={`Money to pay · record #${debt.id}`} />

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div className="card-title">Overview</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <Badge status={debt.status} />
              {debt.expected_date && debt.expected_date < new Date().toISOString().slice(0, 10) && !completed ? (
                <Badge tone="red">Overdue</Badge>
              ) : null}
            </div>
            <div className="amount-row">
              <span className="text-muted">Original amount</span>
              <strong>{formatINR(debt.original_amount)}</strong>
            </div>
            <div className="amount-row">
              <span className="text-muted">Paid back</span>
              <AmountBadge amount={debt.paid_amount} positive />
            </div>
            <div className="amount-row">
              <span className="text-muted">Remaining</span>
              <AmountBadge amount={debt.remaining_amount} />
            </div>
          </Card>

          <Card>
            <div className="card-title">Details</div>
            <div className="kv-list">
              <div className="kv">
                <span className="k">Borrowed on</span>
                <span className="v">{debt.date || '—'}</span>
              </div>
              <div className="kv">
                <span className="k">Expected by</span>
                <span className="v">{debt.expected_date || '—'}</span>
              </div>
              <div className="kv">
                <span className="k">Reason</span>
                <span className="v">{debt.reason || '—'}</span>
              </div>
              <div className="kv">
                <span className="k">Notes</span>
                <span className="v">{debt.notes || '—'}</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="card-title">Payment History</div>
            {payments.length === 0 ? (
              <EmptyState title="No payments yet" message="Record the first payment using the form." />
            ) : (
              <div className="table-wrap">
                <table className="table" style={{ minWidth: 0 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Notes</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td>{p.payment_mode}</td>
                        <td className="desc">{p.notes || '—'}</td>
                        <td className="num">
                          <AmountBadge amount={p.amount} positive />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <div className="card-title">Make Payment · {formatINR(debt.remaining_amount)} remaining</div>
          {completed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
              <div style={{ fontSize: 34, color: 'var(--success)' }}>
                <Icon name="check" size={34} />
              </div>
              <p style={{ margin: 0, fontWeight: 600 }}>Fully paid</p>
              <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>This debt is fully settled.</p>
            </div>
          ) : (
            <PaymentForm kind="pay" debtId={debt.id} remaining={debt.remaining_amount} onSubmitted={load} />
          )}
        </Card>
      </div>
    </div>
  );
}