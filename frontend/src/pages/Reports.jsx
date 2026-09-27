import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { PageLoader, ErrorState } from '../components/States.jsx';
import PageHeader from '../components/PageHeader.jsx';
import TabBar from '../components/TabBar.jsx';
import Card from '../components/Card.jsx';
import FilterBar from '../components/FilterBar.jsx';
import BarChart from '../components/BarChart.jsx';
import { Field } from '../components/Form.jsx';
import { formatINR, cn } from '../utils/format.js';

const PERIOD_TABS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function StatCard({ title, value, tone }) {
  const t = tone === 'auto' ? (value >= 0 ? 'positive' : 'negative') : tone;
  return (
    <Card className="stat-card">
      <div className="stat-title">{title}</div>
      <div className={cn('stat-value', t === 'positive' ? 'col-green' : t === 'negative' ? 'col-red' : '')}>{formatINR(value)}</div>
    </Card>
  );
}

function BarRow({ label, income, expense }) {
  const max = Math.max(income, expense, 1);
  return (
    <div className="bar-row">
      <span className="bar-label" title={label}>{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${(expense / max) * 100}%`, background: 'var(--danger)' }} />
      </div>
      <span className="bar-value mini-nums" style={{ justifyContent: 'flex-end' }}>
        <span className="col-green">+{formatINR(income)}</span>
        <span className="col-red">−{formatINR(expense)}</span>
      </span>
    </div>
  );
}

export default function Reports() {
  const toast = useToast();
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports', {
        period,
        start_date: startDate,
        end_date: endDate,
      });
      setReport(res.data || res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = report?.totals || {};
  const breakdown = report?.breakdown || {};

  const byPaymentMode = breakdown.byPaymentMode || {};
  const cash = byPaymentMode.cash || { credit: 0, debit: 0 };
  const online = byPaymentMode.online || { credit: 0, debit: 0 };
  const byType = breakdown.byType || { credit: 0, debit: 0 };
  const byCategory = breakdown.byCategory || [];
  const byDay = breakdown.byDay || [];

  const modeRows = [
    { key: 'cash-credit', label: 'Cash Income', value: cash.credit },
    { key: 'cash-debit', label: 'Cash Expense', value: cash.debit },
    { key: 'online-credit', label: 'Online Income', value: online.credit },
    { key: 'online-debit', label: 'Online Expense', value: online.debit },
  ];
  const typeRows = [
    { key: 'credit', label: 'Credits (Income)', value: byType.credit || 0, color: 'var(--success)' },
    { key: 'debit', label: 'Debits (Expense)', value: byType.debit || 0, color: 'var(--danger)' },
  ];

  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Income, expense and cash flow analysis" />

      <TabBar tabs={PERIOD_TABS} value={period} onChange={setPeriod} />

      <FilterBar>
        <Field label="From" htmlFor="report-start-date">
          <input
            id="report-start-date"
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="To" htmlFor="report-end-date">
          <input
            id="report-end-date"
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear dates
          </button>
        </div>
      </FilterBar>

      {loading ? (
        <PageLoader label="Computing report…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="section">
            <div className="stat-grid">
              <StatCard title="Income" value={totals.income || 0} tone="positive" />
              <StatCard title="Expense" value={totals.expense || 0} tone="negative" />
              <StatCard title="Net" value={totals.net || 0} tone="auto" />
              <StatCard title="Net Cash Flow" value={totals.netCashFlow || 0} tone="auto" />
              <StatCard title="Money Received" value={totals.moneyReceived || 0} tone="positive" />
              <StatCard title="Money Returned" value={totals.moneyReturned || 0} tone="negative" />
              <StatCard title="To Receive Now" value={totals.moneyToReceiveNow || 0} tone="positive" />
              <StatCard title="To Pay Now" value={totals.moneyToPayNow || 0} tone="negative" />
            </div>
          </div>

          <div className="section reports-grid">
            <Card>
              <div className="card-title">Credit vs Debit</div>
              <BarChart rows={typeRows} format={formatINR} />
            </Card>

            <Card>
              <div className="card-title">Cash vs Online</div>
              {modeRows.map((r) => (
                <div className="bar-row" key={r.key}>
                  <span className="bar-label">{r.label}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max((r.value / Math.max(...modeRows.map((m) => m.value), 1)) * 100, r.value ? 2 : 0)}%`,
                        background: r.key.endsWith('credit') ? 'var(--primary)' : 'var(--blue)',
                      }}
                    />
                  </div>
                  <span className="bar-value">{formatINR(r.value)}</span>
                </div>
              ))}
            </Card>
          </div>

          <div className="section reports-grid reports-grid-wide">
            <Card>
              <div className="card-title">Category Breakdown</div>
              {byCategory.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>No category data in this range.</p>
              ) : (
                <div className="bar-chart">
                  {[...byCategory].sort((a, b) => (b.expense || 0) - (a.expense || 0)).map((c) => (
                    <BarRow key={c.category} label={c.category} income={c.income || 0} expense={c.expense || 0} />
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="card-title">
                {period === 'daily' ? 'Daily Breakdown' : period === 'weekly' ? 'Weekly Breakdown' : 'Period Breakdown'}
                {report.range ? (
                  <span className="text-muted" style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                    {' '}
                    · {report.range.start_date} → {report.range.end_date}
                  </span>
                ) : null}
              </div>
              {byDay.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>No daily data in this range.</p>
              ) : (
                <div className="bar-chart">
                  {byDay.map((d) => (
                    <BarRow key={d.date} label={d.date} income={d.income || 0} expense={d.expense || 0} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}