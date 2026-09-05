import { useEffect, useState } from 'react';
import { CheckCircle, Printer, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from './Toast';

export default function ZantraAgentPanel() {
  const { showToast } = useToast();
  const [printers, setPrinters] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const normalizePrinters = (value: any): string[] => (Array.isArray(value) ? value : value?.printers || value?.data || []).map((item: any) => typeof item === 'string' ? item : item.name || item.printer_name).filter(Boolean);

  const check = async () => {
    setLoading(true);
    try {
      await api.getPrinterHealth();
      const [printerList, current] = await Promise.all([api.getPrinters(), api.getSelectedPrinter()]);
      setPrinters(normalizePrinters(printerList)); setSelected(current?.printer_name || current?.name || ''); setOnline(true);
    } catch (error: any) { setOnline(false); showToast('warning', `${error.message}. As vendas continuam disponíveis.`); }
    finally { setLoading(false); }
  };
  useEffect(() => { void check(); }, []);
  const select = async (printerName: string) => { setSelected(printerName); try { await api.selectPrinter(printerName); showToast('success', 'Impressora selecionada'); } catch (error: any) { showToast('error', error.message); } };
  const test = async () => { try { await api.testPrinter(); showToast('success', 'Cupom de teste enviado'); } catch (error: any) { showToast('error', error.message); } };

  return <div className="space-y-5">
    <section className="card p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className={`rounded-xl p-3 ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{online ? <CheckCircle size={24}/> : <XCircle size={24}/>}</span><div><h2 className="font-semibold">Zantra Agent</h2><p className="text-sm text-surface-500">{online ? 'Agent conectado ao backend' : 'Agent indisponível ou não configurado'}</p></div></div><button className="btn-secondary" disabled={loading} onClick={check}><span className="flex items-center gap-2"><RefreshCw className={loading ? 'animate-spin' : ''} size={16}/> Verificar</span></button></div></section>
    <section className="card p-5"><div className="mb-4 flex items-center gap-2"><Printer size={20} className="text-brand-600"/><h2 className="font-semibold">Impressora térmica</h2></div><div className="grid gap-3 md:grid-cols-[1fr_auto]"><select className="w-full" value={selected} disabled={!online} onChange={(event) => void select(event.target.value)}><option value="">Selecione uma impressora...</option>{printers.map((printer) => <option key={printer} value={printer}>{printer}</option>)}</select><button className="btn-primary" disabled={!online || !selected} onClick={test}>Imprimir teste</button></div><p className="mt-3 text-xs text-surface-400">Endereço e token são definidos exclusivamente na configuração protegida do backend.</p></section>
  </div>;
}
