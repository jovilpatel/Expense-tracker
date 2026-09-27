import { cn } from '../utils/format.js';

export default function Pagination({ page, pages, total, limit, onPageChange }) {
  if (!total) return null;

  const safePages = Math.max(1, pages || 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const maxButtons = 5;
  let start = Math.max(1, page - Math.floor(maxButtons / 2));
  let end = Math.min(safePages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);

  const items = [];
  for (let i = start; i <= end; i += 1) items.push(i);

  return (
    <div className="pagination">
      <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        ‹ Prev
      </button>
      {start > 1 ? (
        <>
          <button type="button" className="btn btn-sm" onClick={() => onPageChange(1)}>
            1
          </button>
          {start > 2 ? <span className="pagination-ellipsis">…</span> : null}
        </>
      ) : null}
      {items.map((p) => (
        <button
          type="button"
          key={p}
          className={cn('btn btn-sm', p === page && 'btn-primary')}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      {end < safePages ? (
        <>
          {end < safePages - 1 ? <span className="pagination-ellipsis">…</span> : null}
          <button type="button" className="btn btn-sm" onClick={() => onPageChange(safePages)}>
            {safePages}
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="btn btn-sm"
        disabled={page >= safePages}
        onClick={() => onPageChange(page + 1)}
      >
        Next ›
      </button>
      <span className="pagination-info">
        {from}–{to} of {total}
      </span>
    </div>
  );
}