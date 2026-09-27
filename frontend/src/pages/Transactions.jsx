import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { PageLoader, ErrorState } from '../components/States.jsx';
import PageHeader from '../components/PageHeader.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { Field, Select } from '../components/Form.jsx';
import Pagination from '../components/Pagination.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import useDebounce from '../hooks/useDebounce.js';
import { TRANSACTION_TYPES, PAYMENT_MODES, SORT_OPTIONS, PAGE_SIZE } from '../constants/index.js';
import Icon from '../components/Icon.jsx';

export default function Transactions() {
  const toast = useToast();
  const [filters, setFilters] = useState({
    type: '',
    payment_mode: '',
    category: '',
    start_date: '',
    end_date: '',
    q: '',
  });
  const debouncedQ = useDebounce(filters.q, 400);
  const [sort, setSort] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data || []))
      .catch((err) => toast.error(err.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  const applySort = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ type: '', payment_mode: '', category: '', start_date: '', end_date: '', q: '' });
    setSort('date_desc');
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/transactions', {
        type: filters.type,
        payment_mode: filters.payment_mode,
        category: filters.category,
        person_name: debouncedQ,
        start_date: filters.start_date,
        end_date: filters.end_date,
        page,
        limit: PAGE_SIZE,
        sort,
      });
      setData(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedQ, page, sort]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/transactions/${editing.id}`, payload);
        toast.success('Transaction updated');
      } else {
        await api.post('/transactions', payload);
        toast.success('Transaction added');
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

  function openEdit(tx) {
    setEditing(tx);
    setFormOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.del(`/transactions/${deleting.id}`);
      toast.success('Transaction deleted');
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
        title="Transactions"
        subtitle="All income and expense entries"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={16} />
            Add Transaction
          </button>
        }
      />

      <FilterBar>
        <Field label="Type">
          <Select value={filters.type} onChange={setFilter('type')} aria-label="Filter by type">
            <option value="">All Types</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment Mode">
          <Select value={filters.payment_mode} onChange={setFilter('payment_mode')} aria-label="Filter by payment mode">
            <option value="">All Modes</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={filters.category} onChange={setFilter('category')} aria-label="Filter by category">
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From">
          <input type="date" className="input" value={filters.start_date} onChange={setFilter('start_date')} aria-label="Start date" />
        </Field>
        <Field label="To">
          <input type="date" className="input" value={filters.end_date} onChange={setFilter('end_date')} aria-label="End date" />
        </Field>
        <Field label="Sort">
          <Select value={sort} onChange={applySort} aria-label="Sort order">
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Search" className="search-input">
          <input
            type="search"
            className="input"
            placeholder="Search by person name"
            value={filters.q}
            onChange={setFilter('q')}
            aria-label="Search by person"
          />
        </Field>
        <div className="filter-actions">
          <button type="button" className="btn btn-ghost" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </FilterBar>

      {loading ? (
        <PageLoader label="Loading transactions…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No transactions found"
          message="Try adjusting your filters, or add a new transaction."
          children={
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Icon name="plus" size={16} />
              Add Transaction
            </button>
          }
        />
      ) : (
        <>
          <TransactionTable transactions={data} onEdit={openEdit} onDelete={setDeleting} />
          <Pagination
            page={pagination?.page || 1}
            pages={pagination?.pages || 1}
            total={pagination?.total || 0}
            limit={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      {formOpen ? (
        <TransactionForm
          initial={editing}
          categories={categories}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete transaction?"
        message={`Delete the ${deleting ? `${deleting.type.toLowerCase()}` : ''} of ${deleting ? `₹${deleting.amount}` : ''} on ${deleting ? deleting.date : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}