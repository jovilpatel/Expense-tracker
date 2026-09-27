import { cn } from '../utils/format.js';

export default function TabBar({ tabs, value, onChange }) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((t) => {
        const v = typeof t === 'string' ? t : t.value;
        const label = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'object' && t.count !== undefined ? t.count : undefined;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={value === v}
            className={cn('tab', value === v && 'active')}
            onClick={() => onChange(v)}
          >
            {label}
            {count !== undefined ? <span className="tab-count">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}