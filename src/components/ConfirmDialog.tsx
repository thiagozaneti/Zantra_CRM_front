import { useEffect, useRef, useState, createContext, useContext, ReactNode } from 'react';
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';

interface ConfirmOptions { title: string; message: string; confirmText?: string; cancelText?: string; type?: 'danger' | 'warning' | 'info' }
interface PromptOptions extends ConfirmOptions { label?: string; placeholder?: string; required?: boolean; minLength?: number }
interface DialogRequest { kind: 'confirm' | 'prompt'; options: PromptOptions; resolve: (value: boolean | string | null) => void }
interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);
export function useConfirm() { const value = useContext(ConfirmContext); if (!value) throw new Error('useConfirm must be used within ConfirmProvider'); return value; }

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const confirm = (options: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ kind: 'confirm', options, resolve: (value) => resolve(value === true) }));
  const prompt = (options: PromptOptions) => new Promise<string | null>((resolve) => {
    setInput(''); setInputError('');
    setDialog({ kind: 'prompt', options: { required: true, minLength: 3, ...options }, resolve: (value) => resolve(typeof value === 'string' ? value : null) });
  });

  const close = () => { dialog?.resolve(dialog.kind === 'confirm' ? false : null); setDialog(null); setInput(''); setInputError(''); };
  const accept = () => {
    if (!dialog) return;
    if (dialog.kind === 'prompt') {
      const value = input.trim();
      if (dialog.options.required && !value) return setInputError('Preencha este campo para continuar.');
      if (value.length < (dialog.options.minLength || 0)) return setInputError(`Informe pelo menos ${dialog.options.minLength} caracteres.`);
      dialog.resolve(value);
    } else dialog.resolve(true);
    setDialog(null); setInput(''); setInputError('');
  };

  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => { if (dialog.kind === 'prompt') inputRef.current?.focus(); else dialogRef.current?.focus(); }, 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') || []);
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [dialog]);

  const tone = dialog?.options.type || 'info';
  const Icon = tone === 'info' ? Info : tone === 'warning' ? HelpCircle : AlertTriangle;

  return <ConfirmContext.Provider value={{ confirm, prompt }}>
    {children}
    {dialog && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-surface-900/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" className="w-full max-w-[420px] overflow-hidden rounded-xl border border-surface-200 bg-white shadow-2xl scale-in">
        <div className="flex items-start gap-3 px-5 pt-5">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone === 'danger' ? 'bg-red-50 text-red-600' : tone === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-600'}`}><Icon size={19}/></span>
          <div className="min-w-0 flex-1"><h2 id="dialog-title" className="text-base font-semibold text-surface-900">{dialog.options.title}</h2><p id="dialog-description" className="mt-1 text-sm leading-relaxed text-surface-600">{dialog.options.message}</p></div>
          <button onClick={close} className="-mr-1 rounded-md p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700" aria-label="Fechar"><X size={18}/></button>
        </div>

        {dialog.kind === 'prompt' && <div className="px-5 pt-4">
          <label htmlFor="dialog-input" className="mb-1.5 block text-sm font-medium text-surface-700">{dialog.options.label || 'Justificativa'}{dialog.options.required ? ' *' : ''}</label>
          <textarea id="dialog-input" ref={inputRef} aria-invalid={!!inputError} aria-describedby={inputError ? 'dialog-input-error' : undefined} rows={3} maxLength={500} value={input} onChange={(event) => { setInput(event.target.value); setInputError(''); }} placeholder={dialog.options.placeholder || 'Descreva o motivo...'} className={`w-full resize-none rounded-lg text-sm ${inputError ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''}`}/>
          <div className="mt-1 flex justify-between gap-3"><p id="dialog-input-error" role={inputError ? 'alert' : undefined} className="text-sm text-red-700">{inputError}</p><span className="text-xs text-surface-600">{input.length}/500</span></div>
        </div>}

        <div className="mt-5 flex justify-end gap-2 border-t border-surface-100 bg-surface-50 px-5 py-3.5">
          <button onClick={close} className="btn-secondary">{dialog.options.cancelText || 'Cancelar'}</button>
          <button onClick={accept} className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : tone === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'}`}>{dialog.options.confirmText || 'Confirmar'}</button>
        </div>
      </div>
    </div>}
  </ConfirmContext.Provider>;
}
