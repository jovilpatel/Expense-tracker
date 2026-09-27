import { cn } from '../utils/format.js';

const STATUS_TONES = {
  Pending: 'amber',
  'Partially Received': 'blue',
  'Partially Paid': 'blue',
  Received: 'green',
  Paid: 'green',
  Overdue: 'red',
  Completed: 'green',
  Active: 'blue',
  Credit: 'green',
  Debit: 'red',
};

export default function Badge({ children, status, tone, className }) {
  const t = tone || STATUS_TONES[status] || 'neutral';
  return <span className={cn('badge', `badge-${t}`, className)}>{children ?? status ?? ''}</span>;
}