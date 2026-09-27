import Modal from './Modal.jsx';
import { cn } from '../utils/format.js';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  tone = 'danger',
  confirmTone = true,
  onConfirm,
  onCancel,
  loading,
}) {
  return (
    <Modal
      title={title}
      open={open}
      onClose={onCancel}
      size="sm"
      footer={
        <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={cn('btn', `btn-${tone}`)}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}