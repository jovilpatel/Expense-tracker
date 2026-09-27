import { formatINR, cn } from '../utils/format.js';

export default function AmountBadge({ amount, positive, className }) {
  const num = Number(amount) || 0;

  if (positive !== undefined) {
    return (
      <span className={cn('amount-badge', positive ? 'positive' : 'negative', className)}>
        {positive ? '+' : '−'}
        {formatINR(num)}
      </span>
    );
  }

  return (
    <span className={cn('amount-badge', num < 0 ? 'negative' : 'positive', className)}>
      {formatINR(num)}
    </span>
  );
}