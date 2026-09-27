import { cn } from '../utils/format.js';

export function Field({ label, htmlFor, required, hint, error, children, className }) {
  return (
    <div className={cn('field', className)}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="req"> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function Select({ children, invalid, className, ...rest }) {
  return (
    <select className={cn('input', invalid && 'input-error', className)} {...rest}>
      {children}
    </select>
  );
}