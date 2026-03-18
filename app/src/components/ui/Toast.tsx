import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ id, type, message, duration = 5000, onClose }: {
  id: string; type: string; message: string; duration?: number; onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const Icon = icons[type as keyof typeof icons] || Info;

  return (
    <div className={`toast toast-${type}`}>
      <Icon size={18} style={{ flexShrink: 0, color: `var(--${type === 'error' ? 'danger' : type})` }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 2 }}>
        <X size={14} />
      </button>
    </div>
  );
}
