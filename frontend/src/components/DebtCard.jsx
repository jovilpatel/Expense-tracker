import { Link } from 'react-router-dom';
import Badge from './Badge.jsx';
import { formatINR } from '../utils/format.js';

export default function DebtCard({ debt, type, onEdit, onDelete, amountLabel }) {
  const prefix = type === 'receive' ? 'receive' : 'pay';
  const progressAmount = type === 'receive' ? debt.received_amount : debt.paid_amount;
  const label = amountLabel || (type === 'receive' ? 'Received' : 'Paid');
  const completed = debt.status === 'Received' || debt.status === 'Paid';
  const remainingClass = completed ? 'col-muted' : type === 'receive' ? 'col-green' : 'col-red';

  return (
    <div className="debt-card">
      <Link to={`/${prefix}/${debt.id}`} className="debt-card-link">
        <div className="debt-card-top">
          <span className="debt-person">{debt.person_name}</span>
          <Badge status={debt.status} />
        </div>
        <div className="debt-reason">{debt.reason || <span className="text-muted">No reason given</span>}</div>
        <div className="debt-amounts">
          <div className="debt-amt">
            <span className="muted">Original</span>
            <b>{formatINR(debt.original_amount)}</b>
          </div>
          <div className="debt-amt">
            <span className="muted">{label}</span>
            <b>{formatINR(progressAmount)}</b>
          </div>
          <div className="debt-amt">
            <span className="muted">Remaining</span>
            <b className={remainingClass}>{formatINR(debt.remaining_amount)}</b>
          </div>
        </div>
        <div className="debt-meta">
          <span>
            {type === 'receive' ? 'Lent' : 'Borrowed'} {debt.date || '—'}
          </span>
          {debt.expected_date ? <span>Expected {debt.expected_date}</span> : <span />}
        </div>
      </Link>
      {onEdit || onDelete ? (
        <div className="debt-actions">
          {onEdit ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => onEdit(debt)}>
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="btn btn-sm btn-ghost text-danger" onClick={() => onDelete(debt)}>
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}