import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { CreditCard, Loader2, Radio, X } from 'lucide-react';
import { api } from '../lib/api';
import { useRFIDReader } from '../hooks/useRFIDReader';

export type IdentifiedCommand = { comandaId: string; cardCode: string; valorTotal: number; status: 'active' };
type ReaderStatus = 'waiting' | 'reading' | 'processing' | 'success' | 'not_found' | 'blocked' | 'invalid' | 'error';

const labels: Record<ReaderStatus, string> = {
  waiting: 'Aguardando aproximação do cartão', reading: 'Lendo cartão', processing: 'Consultando comanda',
  success: 'Comanda identificada', not_found: 'Comanda não encontrada', blocked: 'Cartão bloqueado',
  invalid: 'Leitura inválida', error: 'Falha de comunicação',
};

export default function RFIDCommandPanel({ enabled, busy, selected, onSelect, cardInputRef }: { enabled: boolean; busy: boolean; selected: IdentifiedCommand | null; onSelect: (command: IdentifiedCommand | null) => void; cardInputRef?: RefObject<HTMLInputElement> }) {
  const [status, setStatus] = useState<ReaderStatus>('waiting');
  const [cardInput, setCardInput] = useState('');
  const identifying = useRef(false);
  const [simulation, setSimulation] = useState('0001234567');
  const identify = useCallback(async (cardCode: string) => {
    if (identifying.current) return;
    identifying.current = true;
    setStatus('processing');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await api.identifyRFIDCard(cardCode, controller.signal);
      setCardInput(''); onSelect(response.data); setStatus('success');
    } catch (error: any) {
      if (error?.name === 'AbortError') setStatus('error');
      else if (error?.code === 'RFID_CARD_NOT_FOUND' || error?.code === 'COMANDA_NOT_FOUND') setStatus('not_found');
      else if (error?.code === 'RFID_CARD_BLOCKED' || error?.code === 'COMANDA_UNAVAILABLE') setStatus('blocked');
      else setStatus('error');
      throw error;
    } finally { clearTimeout(timer); identifying.current = false; }
  }, [onSelect]);

  const reader = useRFIDReader({
    enabled: enabled && !busy && !selected && status !== 'processing',
    preventDefaultWhenActive: true,
    onRead: identify,
    onInvalidRead: () => setStatus('invalid'),
    onError: () => undefined,
  });

  useEffect(() => {
    if (selected) setStatus('success');
    else if (reader.isReading) setStatus('reading');
    else if (!busy && status !== 'processing' && status !== 'not_found' && status !== 'blocked' && status !== 'invalid' && status !== 'error') setStatus('waiting');
  }, [busy, reader.isReading, selected, status]);

  const simulate = async () => {
    const value = simulation.trim();
    if (!/^[0-9]{4,64}$/.test(value)) { setStatus('invalid'); return; }
    (document.activeElement as HTMLElement | null)?.blur();
    for (const key of value) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  };

  const identifyInput = async () => {
    if (busy || status === 'processing') return;
    const value = cardInput.trim();
    if (!/^[0-9]{4,64}$/.test(value)) { setStatus('invalid'); return; }
    try { await identify(value); } catch { /* O estado do painel exibe o erro. */ }
  };

  return <section className="card p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3"><span className={`rounded-xl p-2.5 ${status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-600'}`}>{status === 'processing' ? <Loader2 className="animate-spin" size={21}/> : selected ? <CreditCard size={21}/> : <Radio size={21}/>}</span><div><p className="text-xs uppercase tracking-wide text-surface-400">Comanda RFID</p><p className="font-semibold text-surface-900">{labels[status]}</p>{selected && <p className="text-xs text-surface-500">Cartão {selected.cardCode} · saldo {Number(selected.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}</div></div>
      {selected && <button className="rounded-lg p-2 text-surface-400 hover:bg-surface-100" title="Remover comanda" onClick={() => { onSelect(null); reader.clearLastRead(); setStatus('waiting'); }}><X size={18}/></button>}
    </div>
    {!selected && <div className="mt-2 flex gap-2">
      <input ref={cardInputRef} aria-label="Número ou leitura da comanda" inputMode="numeric" autoComplete="off" className="min-w-0 flex-1" placeholder="Digite ou aproxime o cartão" maxLength={64} value={cardInput} disabled={!enabled || busy || status === 'processing'} onChange={(event) => setCardInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); void identifyInput(); } }} />
      <button type="button" className="btn-secondary shrink-0" disabled={!enabled || busy || status === 'processing' || !cardInput.trim()} onClick={() => void identifyInput()}>Consultar</button>
    </div>}
    {import.meta.env.DEV && !selected && <div className="mt-3 flex gap-2 border-t border-dashed pt-3"><input aria-label="Código RFID para simulação" className="min-w-0 flex-1" value={simulation} onChange={(event) => setSimulation(event.target.value)} placeholder="Simular cartão"/><button className="btn-secondary shrink-0" onClick={simulate}>Simular leitura</button></div>}
  </section>;
}
