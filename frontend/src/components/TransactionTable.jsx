import Icon from './Icon.jsx';
import Badge from './Badge.jsx';
import AmountBadge from './AmountBadge.jsx';
import EmptyState from './EmptyState.jsx';

export default function TransactionTable({ transactions, onEdit, onDelete }) {
  if (!transactions || transactions.length === 0) {
    return <EmptyState title="No transactions" message="No transactions match your filters." />;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th className="hide-sm">Time</th>
            <th>Person</th>
            <th>Type</th>
            <th>Mode</th>
            <th>Category</th>
            <th className="hide-sm">Description</th>
            <th className="hide-sm">Status</th>
            <th className="num">Amount</th>
            <th className="actions-col">{onEdit || onDelete ? 'Actions' : ''}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.date}</td>
              <td className="hide-sm">{t.time || '—'}</td>
              <td>{t.person_name || '—'}</td>
              <td>
                <Badge status={t.type} />
              </td>
              <td>{t.payment_mode}</td>
              <td>{t.category || '—'}</td>
              <td className="hide-sm desc">{t.description || '—'}</td>
              <td className="hide-sm">{t.status ? <Badge status={t.status} /> : '—'}</td>
              <td className="num">
                <AmountBadge amount={t.amount} positive={t.type === 'Credit'} />
              </td>
              <td className="actions-col">
                {onEdit ? (
                  <button type="button" className="icon-btn" onClick={() => onEdit(t)} aria-label="Edit">
                    <Icon name="edit" size={16} />
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => onDelete(t)}
                    aria-label="Delete"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}