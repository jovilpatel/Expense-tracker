import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { Spinner } from '../components/States.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { downloadCsv } from '../utils/csv.js';
import { formatINR } from '../utils/format.js';
import Icon from '../components/Icon.jsx';

const EXPORTS = [
  { path: '/export/transactions.csv', label: 'Transactions', desc: 'All transactions with filters applied' },
  { path: '/export/debts-receive.csv', label: 'Money To Receive', desc: 'All lent amounts' },
  { path: '/export/debts-pay.csv', label: 'Money To Pay', desc: 'All borrowed amounts' },
  { path: '/export/payments.csv', label: 'Payments', desc: 'All receive/pay payments' },
  { path: '/export/reports.csv', label: 'Reports', desc: 'Current report totals and breakdowns' },
];

export default function Settings() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [busyPath, setBusyPath] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError('');
    api
      .get('/categories')
      .then((res) => {
        if (!cancelled) setCategories(res.data || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setCategoriesError(err.message);
          toast.error(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function handleExport(item) {
    setBusyPath(item.path);
    try {
      await downloadCsv(item.path);
      toast.success(`Exported ${item.label}`);
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setBusyPath('');
    }
  }

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <PageHeader title="Settings" subtitle="Preferences and data export" />

      <div className="settings-grid">
        <Card>
          <div className="setting-card">
            <div>
              <div className="setting-title">Currency</div>
              <p className="setting-desc">
                All amounts are shown in Indian Rupees (₹), e.g. {formatINR(54250)}.
              </p>
            </div>
            <span className="chip highlight" style={{ fontSize: 14 }}>₹ INR</span>
          </div>
        </Card>

        <Card>
          <div className="setting-card">
            <div>
              <div className="setting-title">Theme</div>
              <p className="setting-desc">Choose between light and dark appearance.</p>
            </div>
            <div className="segmented">
              <button
                type="button"
                className={theme === 'light' ? 'active' : ''}
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'active' : ''}
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-title">Export Data (CSV)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {EXPORTS.map((item) => (
              <div key={item.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{item.label}</div>
                  <div className="text-muted" style={{ fontSize: 12.5 }}>{item.desc}</div>
                </div>
                <button type="button" className="btn btn-sm" disabled={busyPath === item.path} onClick={() => handleExport(item)}>
                  <Icon name="download" size={15} />
                  {busyPath === item.path ? 'Downloading…' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="card-title">Categories</div>
          {categoriesLoading ? (
            <div className="page-state" style={{ padding: '24px 0' }} aria-live="polite">
              <Spinner />
              <p className="text-muted" style={{ margin: 0 }}>Loading categories…</p>
            </div>
          ) : categoriesError ? (
            <p className="text-muted" style={{ margin: 0 }}>{categoriesError}</p>
          ) : categories.length ? (
            <div className="chips">
              {categories.map((c) => (
                <span key={c.id} className="chip">
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ margin: 0 }}>No categories available.</p>
          )}
        </Card>
      </div>
    </div>
  );
}