import { cn } from '../utils/format.js';

export default function Card({ className, children, ...rest }) {
  return (
    <div className={cn('card', className)} {...rest}>
      {children}
    </div>
  );
}