import { useEffect, useRef, useState } from 'react';
import { CreditCard, FileDown, Search } from 'lucide-react';
import { api } from '../lib/api';
import { createUuid } from '../lib/uuid';
import { hasActionPermission } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { CardRefund, downloadCardRefundReceipt, refundMethods, refundMoney } from '../lib/cardRefundReceipt';
import { Link } from 'react-router-dom';

type Card = { id: string; cardCode: string; status: string; balance: string; cardholderName: string | null };
type Pending = { commandId: string; requestId: string; amount: string; paymentMethod: string; reason: string; cardCode: string };
const statuses: Record<string, string> = { ATIVA: 'Ativa', BLOQUEADA: 'Bloqueada', ENCERRADA: 'Encerrada' };

function loadPending(key: string): Pending | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!value || !['commandId', 'requestId', 'amount', 'paymentMethod', 'reason', 'cardCode'].every((field) => typeof value[field] === 'string')) return null;
    return value as Pending;
  } catch { return null; }
}

export default function CardRefunds() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const canCreate = hasActionPermission('card-refunds:create');
  const storageKey = `zantra_refund_pending_${user?.id || 'unknown'}`;
  const [pending, setPending] = useState<Pending | null>(() => loadPending(storageKey));
  const [cardCode, setCardCode] = useState('');
  const [card, setCard] = useState<Card | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('DINHEIRO');
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<CardRefund[]>([]);
  const [lastRefund, setLastRefund] = useState<CardRefund | null>(null);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const cardRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    try { setHistory(await api.getCardRefunds()); }
    catch { showToast('warning', 'Não foi possível atualizar o histórico de devoluções.'); }
    finally { setLoadingHistory(false); }
  };
  useEffect(() => { void loadHistory(); if (!pending) cardRef.current?.focus(); }, []);

  const identify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current || pending) return;
    if (!/^\d{4,64}$/.test(cardCode.trim())) { setCard(null); setError('Informe um código numérico de 4 a 64 dígitos.'); return; }
    busyRef.current = true; setBusy(true); setError(''); setCard(null); setLastRefund(null);
    try { setCard(await api.identifyRefundCard(cardCode.trim())); setCardCode(''); }
    catch (failure: any) { setError(failure.message || 'Não foi possível consultar o cartão.'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const send = async (operation: Pending) => {
    try {
      const result: CardRefund = await api.createCardRefund({ commandId: operation.commandId, requestId: operation.requestId, amount: operation.amount, paymentMethod: operation.paymentMethod, reason: operation.reason });
      sessionStorage.removeItem(storageKey); setPending(null); setLastRefund(result); setCard(null); setAmount(''); setReason(''); setError('');
      showToast('success', 'Devolução registrada. Efetue a entrega do valor pela forma escolhida.');
      void loadHistory();
    } catch (failure: any) {
      setError(`${failure.message || 'Não foi possível confirmar a devolução.'} Confira o histórico ou reenvie a mesma solicitação antes de fazer outra.`);
    }
  };

  const create = async () => {
    if (busyRef.current || !card || !canCreate) return;
    const normalized = amount.trim().replace(',', '.');
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) { setError('Informe um valor positivo com até duas casas decimais.'); return; }
    if (Number(normalized) > Number(card.balance)) { setError('O valor não pode superar o saldo disponível.'); return; }
    if (card.status === 'ENCERRADA') { setError('Não é possível devolver saldo de uma comanda encerrada.'); return; }
    if (reason.trim().length < 3) { setError('Informe o motivo da devolução com pelo menos 3 caracteres.'); return; }
    busyRef.current = true; setBusy(true); setError('');
    try {
      const approved = await confirm({ title: 'Confirmar devolução de saldo', message: `Debitar ${refundMoney(normalized)} do cartão ${card.cardCode}, com devolução em ${refundMethods[method]}. A entrega do valor é uma operação externa ao sistema.`, confirmText: 'Confirmar devolução', type: 'warning' });
      if (!approved) return;
      const operation: Pending = { commandId: card.id, requestId: createUuid(), amount: Number(normalized).toFixed(2), paymentMethod: method, reason: reason.trim(), cardCode: card.cardCode };
      try { sessionStorage.setItem(storageKey, JSON.stringify(operation)); }
      catch { setError('Não foi possível guardar a solicitação com segurança neste navegador. Nenhuma devolução foi enviada.'); return; }
      setPending(operation);
      await send(operation);
    } finally { busyRef.current = false; setBusy(false); }
  };

  const retry = async () => {
    if (!pending || busyRef.current || !canCreate) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await send(pending); } finally { busyRef.current = false; setBusy(false); }
  };

  const discard = async () => {
    if (!pending || busyRef.current) return;
    const approved = await confirm({ title: 'Descartar tentativa pendente?', message: 'Confira primeiro o histórico. Descartar esta tentativa não cancela nem desfaz uma devolução que já tenha sido registrada.', confirmText: 'Descartar tentativa', type: 'warning' });
    if (!approved) return;
    sessionStorage.removeItem(storageKey); setPending(null); setCard(null); setError(''); setCardCode('');
    setTimeout(() => cardRef.current?.focus(), 0);
  };

  return <div className="mx-auto max-w-6xl space-y-5">
    <div><h1 className="text-2xl font-bold text-surface-900">Estorno de saldo</h1><p className="mt-1 text-sm text-surface-500">Consulte o cartão e registre a devolução do saldo ao portador.</p></div>
    {hasActionPermission('commands:view') && <nav aria-label="Operações de comandas" className="flex flex-wrap gap-2"><Link to="/commands" className="btn-secondary">Comandas</Link><span aria-current="page" className="rounded-lg bg-brand-100 px-4 py-2 font-semibold text-brand-800">Estorno de saldo</span></nav>}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {pending && <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Solicitação aguardando confirmação</p><p className="mt-1">Cartão {pending.cardCode} · {refundMoney(pending.amount)} · {refundMethods[pending.paymentMethod]}. A resposta pode ter sido interrompida. Confira o histórico; reenviar usa o mesmo identificador e não deve gerar outra devolução.</p><div className="mt-3 flex flex-wrap gap-2"><button className="btn-primary" type="button" disabled={busy || !canCreate} onClick={() => void retry()}>Reenviar mesma solicitação</button><button className="btn-secondary" type="button" disabled={busy} onClick={() => void discard()}>Descartar tentativa</button></div></section>}
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold"><CreditCard size={19}/> Identificar cartão</h2><form onSubmit={identify}><label htmlFor="refund-card" className="mb-1 block text-sm font-medium">Número do cartão</label><div className="flex gap-2"><input ref={cardRef} id="refund-card" className="min-w-0 flex-1" inputMode="numeric" autoComplete="off" maxLength={64} placeholder="Digite ou aproxime o cartão" value={cardCode} disabled={busy || !!pending} onChange={(event) => setCardCode(event.target.value)}/><button type="submit" disabled={busy || !!pending} className="btn-primary flex items-center gap-2"><Search size={16}/>Consultar</button></div></form>
        {card && <div className="mt-4 space-y-2 border-t border-surface-100 pt-4 text-sm"><p>Cartão: <strong>{card.cardCode}</strong></p><p>Portador: <strong>{card.cardholderName || 'Não cadastrado no sistema'}</strong></p><p>Situação: <strong>{statuses[card.status] || card.status}</strong></p><p className="pt-2 text-surface-500">Saldo disponível</p><p className="text-3xl font-bold text-brand-700">{refundMoney(card.balance)}</p>{card.status === 'BLOQUEADA' && <p className="text-amber-700">Cartão bloqueado: a devolução de saldo é permitida para operadores autorizados.</p>}{card.status === 'ENCERRADA' && <p className="text-red-700">Comanda encerrada: a devolução está indisponível.</p>}</div>}
      </section>
      <section className="card p-5"><h2 className="mb-3 font-semibold">Registrar devolução</h2><p className="mb-4 text-xs text-surface-500">A operação registra a baixa no saldo. A entrega por dinheiro, PIX ou outro meio deve ser feita pelo operador.</p><div className="space-y-3"><div><label htmlFor="refund-amount" className="mb-1 block text-sm font-medium">Valor da devolução (R$)</label><input id="refund-amount" type="text" inputMode="decimal" className="w-full" placeholder="0,00" value={amount} disabled={!card || busy || !!pending || !canCreate} onChange={(event) => setAmount(event.target.value)}/></div><div><label htmlFor="refund-method" className="mb-1 block text-sm font-medium">Forma de devolução</label><select id="refund-method" className="w-full" value={method} disabled={!card || busy || !!pending || !canCreate} onChange={(event) => setMethod(event.target.value)}>{Object.entries(refundMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="refund-reason" className="mb-1 block text-sm font-medium">Motivo</label><input id="refund-reason" className="w-full" maxLength={500} value={reason} disabled={!card || busy || !!pending || !canCreate} onChange={(event) => setReason(event.target.value)} placeholder="Motivo da devolução"/></div><button type="button" className="btn-primary w-full" disabled={!card || card.status === 'ENCERRADA' || busy || !!pending || !canCreate} onClick={() => void create()}>{busy ? 'Processando...' : 'Confirmar devolução'}</button>{!canCreate && <p className="text-xs text-surface-500">Seu acesso permite somente consulta.</p>}</div></section>
    </div>
    {lastRefund && <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div><p className="font-semibold">Devolução registrada: {refundMoney(lastRefund.amount)}</p><p>Cartão {lastRefund.cardCode} · Saldo após a operação: {refundMoney(lastRefund.balance)}</p></div><button type="button" className="btn-secondary flex items-center gap-2" onClick={() => downloadCardRefundReceipt(lastRefund)}><FileDown size={16}/> Baixar comprovante</button></section>}
    <section className="card overflow-hidden"><div className="border-b border-surface-200 px-5 py-3"><h2 className="font-semibold">Últimas devoluções</h2><p className="text-xs text-surface-500">Até 50 operações, com cartão parcialmente oculto.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-surface-50 text-xs text-surface-500"><tr>{['Data e hora', 'Cartão', 'Operador', 'Forma', 'Valor', 'Saldo após', ''].map((label, index) => <th key={index} className="px-4 py-2">{label}</th>)}</tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-t border-surface-100"><td className="px-4 py-3">{new Date(item.createdAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3">{item.cardCode}</td><td className="px-4 py-3">{item.operator}</td><td className="px-4 py-3">{refundMethods[item.paymentMethod] || item.paymentMethod}</td><td className="px-4 py-3">{refundMoney(item.amount)}</td><td className="px-4 py-3">{refundMoney(item.balance)}</td><td className="px-4 py-3"><button type="button" aria-label={`Baixar comprovante ${item.id}`} className="text-brand-600" onClick={() => downloadCardRefundReceipt(item)}><FileDown size={17}/></button></td></tr>)}</tbody></table></div>{!history.length && <p className="p-6 text-center text-sm text-surface-400">{loadingHistory ? 'Carregando...' : 'Nenhuma devolução encontrada.'}</p>}</section>
  </div>;
}
