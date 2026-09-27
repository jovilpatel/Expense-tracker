import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { PageLoader, ErrorState } from '../components/States.jsx';
import PageHeader from '../components/PageHeader.jsx';
import TabBar from '../components/TabBar.jsx';
import DebtCard from '../components/DebtCard.jsx';
import DebtForm from '../components/DebtForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { PAY_STATUSES } from '../constants/index.js';
import Icon from '../components/Icon.jsx';

const TABS = ['All', ...PAY_STATUSES, 'Overdue'];

export default function Pay() {
  const toast = useToast();
  const [tab, setTab] = useState('All');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = tab === 'All' ? {} : tab === 'Overdue' ? { overdue: true } : { status: tab };
      const res = await api.get('/money-to-pay', query);
      setData(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/money-to-pay/${editing.id}`, payload);
        toast.success('Updated money to pay');
      } else {
        await api.post('/money-to-pay', payload);
        toast.success('Borrowed money recorded');
      }
      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.del(`/money-to-pay/${deleting.id}`);
      toast.success('Record deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Money To Pay"
        subtitle="Money you borrowed from people"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Icon name="plus" size={16} />
            Record Borrow
          </button>
        }
      />

      <TabBar tabs={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <PageLoader label="Loading money to pay…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No records"
          message={tab === 'All' ? 'You have not borrowed any money yet.' : `No ${tab.toLowerCase()} records.`}
          children={
            <button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Icon name="plus" size={16} />
              Record Borrow
            </button>
          }
        />
      ) : (
        <div className="debt-grid">
          {data.map((d) => (
            <DebtCard
              key={d.id}
              debt={d}
              type="pay"
              onEdit={(debt) => { setEditing(debt); setFormOpen(true); }}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {formOpen ? (
        <DebtForm
          kind="pay"
          initial={editing}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this record?"
        message={`Delete the borrow from ${deleting ? deleting.person_name : ''} of ₹${deleting ? deleting.original_amount : ''}? This cannot be undone.`}
        loading={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}