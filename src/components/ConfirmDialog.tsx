import { useState, createContext, useContext, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((res) => {
      setOptions(opts);
      setResolve(() => res);
    });
  };

  const handleConfirm = () => {
    resolve?.(true);
    setResolve(null);
    setOptions(null);
  };

  const handleCancel = () => {
    resolve?.(false);
    setResolve(null);
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4 fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl scale-in">
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  options.type === 'danger' ? 'bg-red-100' :
                  options.type === 'warning' ? 'bg-amber-100' : 'bg-brand-100'
                }`}>
                  <AlertTriangle size={20} className={
                    options.type === 'danger' ? 'text-red-600' :
                    options.type === 'warning' ? 'text-amber-600' : 'text-brand-600'
                  } />
                </div>
                <h3 className="text-lg font-semibold text-surface-900">{options.title}</h3>
              </div>
              <button onClick={handleCancel} className="text-surface-400 hover:text-surface-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-surface-600">{options.message}</p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-surface-200 bg-surface-50 rounded-b-2xl">
              <button onClick={handleCancel} className="btn-secondary flex-1">
                {options.cancelText || 'Cancelar'}
              </button>
              <button onClick={handleConfirm} className={`flex-1 font-medium px-4 py-2.5 rounded-lg transition-all duration-200 ${
                options.type === 'danger'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}>
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
