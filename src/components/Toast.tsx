import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const toastTitles: Record<ToastType, string> = { success: 'Concluído', error: 'Não foi possível concluir', warning: 'Atenção', info: 'Informação' };

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[100] space-y-2 sm:left-auto sm:right-4 sm:top-4 sm:w-full sm:max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={20} className="text-emerald-500" />,
    error: <XCircle size={20} className="text-red-500" />,
    warning: <AlertTriangle size={20} className="text-amber-500" />,
    info: <Info size={20} className="text-brand-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-brand-50 border-brand-200',
  };

  return (
    <div role="status" className={`pointer-events-auto ${bgColors[toast.type]} flex items-start gap-3 rounded-lg border p-3.5 shadow-lg slide-down`}>
      <span className="mt-0.5 shrink-0">{icons[toast.type]}</span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-surface-800">{toastTitles[toast.type]}</p><p className="mt-0.5 break-words text-xs leading-relaxed text-surface-600">{toast.message}</p></div>
      <button onClick={() => onRemove(toast.id)} className="shrink-0 rounded p-1 text-surface-400 hover:bg-black/5 hover:text-surface-700" aria-label="Fechar notificação">
        <X size={16} />
      </button>
    </div>
  );
}
