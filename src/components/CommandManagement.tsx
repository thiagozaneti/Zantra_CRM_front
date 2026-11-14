import { useEffect, useRef, useState } from 'react';
import { CreditCard, Plus, RefreshCw, WalletCards } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from './Toast';
import { hasActionPermission } from './Layout';

const statusLabels: Record<string, string> = { ATIVA: 'Ativa', BLOQUEADA: 'Bloqueada', ENCERRADA: 'Encerrada' };
const movementLabels: Record<string, string> = { RECARGA: 'Recarga', AJUSTE: 'Ajuste', ZERAGEM: 'Zeragem', CONSUMO: 'Consumo', ESTORNO: 'Estorno de venda', DEVOLUCAO: 'Devolução de saldo' };
const paymentMethodLabels: Record<string, string> = { PIX: 'PIX', DINHEIRO: 'Dinheiro', CARTAO_DEBITO: 'Cartão de débito', CARTAO_CREDITO: 'Cartão de crédito', CHEQUE: 'Cheque' };
const paymentMethods = Object.entries(paymentMethodLabels);
const money = (value: number | string) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CommandManagement() {
  const { showToast } = useToast();
  const canManage = hasActionPermission('commands:manage');
  const [commands, setCommands] = useState<any[]>([]);
  const [cardCode, setCardCode] = useState('');
  const [initialValue, setInitialValue] = useState(0);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('PIX');
  const [editing, setEditing] = useState<{ id: string; operation: 'SET' | 'ADD'; label: string } | null>(null);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const load = async () => { try { setLoading(true); setLoadError(false); setCommands(await api.getCommands()); } catch (error: any) { setLoadError(true); showToast('error', error.message); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (operation.current) return;
    if (!/^[0-9]{4,64}$/.test(cardCode)) return showToast('warning', 'Informe um código numérico entre 4 e 64 caracteres');
    operation.current = true; setBusy(true);
    try { await api.createCommand(cardCode, initialValue, initialValue > 0 ? initialPaymentMethod : undefined); setCardCode(''); setInitialValue(0); setInitialPaymentMethod('PIX'); await load(); showToast('success', 'Comanda cadastrada'); }
    catch (error: any) { showToast('error', error.message); }
    finally { operation.current = false; setBusy(false); }
  };
  const saveValue = async () => {
    if (operation.current) return;
    if (!editing || amount < 0 || (editing.operation === 'ADD' && amount <= 0) || reason.trim().length < 3) return showToast('warning', 'Informe valor e motivo válidos');
    operation.current = true; setBusy(true);
    try { await api.updateCommandValue(editing.id, editing.operation, amount, reason, editing.operation === 'ADD' ? paymentMethod : undefined); const wasRecharge = editing.operation === 'ADD'; setEditing(null); setAmount(0); setReason(''); setPaymentMethod('PIX'); await load(); showToast('success', wasRecharge ? 'Recarga realizada' : 'Saldo ajustado'); }
    catch (error: any) { showToast('error', error.message); }
    finally { operation.current = false; setBusy(false); }
  };
  const updateStatus = async (id: string, status: string) => { try { await api.updateCommandStatus(id, status); await load(); } catch (error: any) { showToast('error', error.message); } };

  return <div className="space-y-5">
    {canManage && <section className="card p-5">
      <div className="mb-4 flex items-center gap-2"><CreditCard size={20} className="text-brand-600"/><h2 className="font-semibold">Cadastrar nova comanda</h2></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_220px_auto]"><div><label htmlFor="command-field-1" className="mb-1 block text-xs">Código RFID</label><input id="command-field-1" className="w-full" value={cardCode} onChange={(event) => setCardCode(event.target.value)} placeholder="Aproxime ou digite o código"/></div><div><label htmlFor="command-field-2" className="mb-1 block text-xs">Carga inicial</label><input id="command-field-2" className="w-full" type="number" min="0" step="0.01" value={initialValue || ''} onChange={(event) => setInitialValue(Number(event.target.value))}/></div><div><label htmlFor="command-field-3" className="mb-1 block text-xs">Forma de pagamento</label><select id="command-field-3" className="w-full" value={initialPaymentMethod} onChange={(event) => setInitialPaymentMethod(event.target.value)} disabled={initialValue <= 0}>{paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><button className="btn-primary self-end disabled:opacity-50" disabled={busy} onClick={create}><span className="flex items-center gap-2"><Plus size={17}/> Cadastrar</span></button></div>
    </section>}

    {canManage && editing && <section className="card border-brand-200 p-5"><h2 className="font-semibold">{editing.operation === 'ADD' ? 'Adicionar crédito' : 'Definir saldo'} · {editing.label}</h2><div className={`mt-3 grid gap-3 ${editing.operation === 'ADD' ? 'md:grid-cols-[160px_210px_1fr_auto]' : 'md:grid-cols-[180px_1fr_auto]'}`}><input aria-label="Valor" type="number" min="0" step="0.01" value={amount || ''} onChange={(event) => setAmount(Number(event.target.value))} placeholder="Valor"/>{editing.operation === 'ADD' && <select aria-label="Forma de pagamento" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}<input aria-label="Motivo obrigatório" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatório"/><div className="flex gap-2"><button className="btn-primary disabled:opacity-50" disabled={busy} onClick={saveValue}>{busy ? 'Salvando...' : 'Confirmar'}</button><button className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button></div></div></section>}

    <section className="card overflow-hidden"><div className="card-header flex items-center justify-between"><div><h2 className="font-semibold">Comandas recarregáveis</h2><p className="text-xs text-surface-500">Créditos disponíveis e histórico de movimentações</p></div><button aria-label="Atualizar comandas" className="btn-secondary" onClick={() => void load()}><RefreshCw size={16}/></button></div>
      {loadError && <p role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível atualizar as comandas. Confira sua conexão e tente novamente. Os dados exibidos podem estar desatualizados.</p>}
      <div className="divide-y">{commands.map((command) => <article key={command.id} className="p-4 lg:p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-600"><WalletCards size={20}/></span><div><p className="font-semibold">Cartão {command.cardCode}</p><p className="text-2xl font-bold text-emerald-700">{money(command.totalAmount)}</p></div></div>{canManage && <div className="flex flex-wrap items-center gap-2"><button className="btn-primary" onClick={() => { setEditing({ id: command.id, operation: 'ADD', label: command.cardCode }); setAmount(0); setPaymentMethod('PIX'); setReason('Recarga da comanda'); }}>Adicionar crédito</button><button className="btn-secondary" onClick={() => { setEditing({ id: command.id, operation: 'SET', label: command.cardCode }); setAmount(Number(command.totalAmount)); setReason('Ajuste manual de saldo'); }}>Definir saldo</button><select aria-label={`Situação do cartão ${command.cardCode}`} className="py-2" value={command.status} onChange={(event) => void updateStatus(command.id, event.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}</div>
        {!!command.movements?.length && <div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-surface-400"><th className="py-2">Data</th><th>Operação</th><th>Pagamento</th><th>Valor</th><th>Saldo</th><th>Responsável</th><th>Motivo</th></tr></thead><tbody>{command.movements.map((movement: any) => <tr key={movement.id} className="border-t"><td className="py-2">{new Date(movement.createdAt).toLocaleString('pt-BR')}</td><td>{movementLabels[movement.type] || movement.type}</td><td>{movement.paymentMethod ? paymentMethodLabels[movement.paymentMethod] || movement.paymentMethod : '—'}</td><td className={Number(movement.movedValue) >= 0 ? 'text-emerald-600' : 'text-red-600'}>{money(movement.movedValue)}</td><td>{money(movement.newValue)}</td><td>{movement.user.name}</td><td>{movement.reason}{movement.sale && ` · Venda #${movement.sale.number}`}</td></tr>)}</tbody></table></div>}
      </article>)}{!loading && !loadError && !commands.length && <p className="p-10 text-center text-surface-400">Nenhuma comanda cadastrada</p>}{loading && <p className="p-10 text-center text-surface-400">Carregando...</p>}</div>
    </section>
  </div>;
}
