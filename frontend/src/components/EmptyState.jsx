import Icon from './Icon.jsx';

export default function EmptyState({ title = 'Nothing here yet', message, children, icon = 'list' }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" style={{ color: 'var(--border-strong)' }}>
        <Icon name={icon} size={34} />
      </div>
      <h3>{title}</h3>
      {message ? (
        <p className="text-muted" style={{ margin: '4px 0 0' }}>
          {message}
        </p>
      ) : null}
      {children ? <div style={{ marginTop: 14 }}>{children}</div> : null}
    </div>
  );
}