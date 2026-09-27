export default function BarChart({
  rows,
  valueKey = 'value',
  color = 'var(--primary)',
  format,
  labelWidth,
}) {
  const max = Math.max(...rows.map((r) => Math.abs(Number(r[valueKey]) || 0)), 1);
  return (
    <div className="bar-chart">
      {rows.map((r, i) => {
        const v = Number(r[valueKey]) || 0;
        const pct = Math.max((Math.abs(v) / max) * 100, v !== 0 ? 3 : 0);
        const fillColor = r.color || color;
        return (
          <div className="bar-row" key={r.key || i} style={labelWidth ? { gridTemplateColumns: `${labelWidth}px 1fr 90px` } : undefined}>
            <span className="bar-label" title={r.label}>
              {r.label}
            </span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: fillColor }} />
            </div>
            <span className="bar-value">{format ? format(v) : v}</span>
          </div>
        );
      })}
    </div>
  );
}