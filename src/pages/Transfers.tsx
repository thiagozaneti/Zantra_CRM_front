import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { Plus, X, Filter, AlertTriangle } from 'lucide-react';
import { hasActionPermission } from '../components/Layout';
import { quantityStep } from '../lib/quantity';
import { useConfirm } from '../components/ConfirmDialog';
import { Pagination } from '../components/DataControls';

export default function Transfers() {
  const { showToast } = useToast();
  const { confirm, prompt } = useConfirm();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [coldRooms, setColdRooms] = useState<any[]>([]);
  const [bars, setBars] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ originId: '', destinationId: '', productId: '', quantity: 0, withdrawnById: '', receivedById: '', notes: '', requiresConfirmation: false, requestNegativeException: false });
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [fStartDate, setFStartDate] = useState('');
  const [fEndDate, setFEndDate] = useState('');
  const [fOriginId, setFOriginId] = useState('');
  const [fDestinationId, setFDestinationId] = useState('');
  const canApprove = hasActionPermission('transfers:approve');
  const canConfirm = hasActionPermission('transfers:confirm');
  const canReverse = hasActionPermission('transfers:reverse');
  const canCreate = hasActionPermission('transfers:create');
  const selectedProduct = availableProducts.find((product) => product.id === form.productId);

  useEffect(() => { loadTransfers(); loadRefs(); }, [pagination.page, fStartDate, fEndDate, fOriginId, fDestinationId]);
  useEffect(() => { if (form.originId) loadAvailableProducts(); }, [form.originId]);
  useEffect(() => { if (form.productId && form.originId) checkStock(); }, [form.productId, form.originId]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fStartDate) params.set('startDate', fStartDate);
      if (fEndDate) params.set('endDate', fEndDate);
      if (fOriginId) params.set('originId', fOriginId);
      if (fDestinationId) params.set('destinationId', fDestinationId);
      params.set('page', pagination.page.toString());
      const result = await api.getTransfers(params.toString());
      setTransfers(result.data);
      setPagination(result.pagination);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadRefs = async () => {
    try {
      const [cr, br, usrs] = await Promise.all([
        api.getReferenceLocations(),
        api.getReferenceLocations(),
        api.getReferenceUsers(),
      ]);
      setColdRooms(cr.filter((location: any) => location.allowsTransferOrigin));
      setBars(br.filter((location: any) => location.allowsTransferDestination));
      setUsers(usrs);
    } catch (err) { console.error(err); }
  };

  const loadAvailableProducts = async () => {
    try {
      const prods = await api.getAvailableProducts(form.originId);
      setAvailableProducts(prods);
    } catch (err) { console.error(err); }
  };

  const checkStock = async () => {
    try {
      const result = await api.checkStock(form.productId, form.originId);
      setAvailableQty(result.quantity);
    } catch (err) { setAvailableQty(null); }
  };

  const handleSave = async () => {
    if (!form.originId || !form.destinationId || !form.productId || form.quantity <= 0) {
      setError('Preencha todos os campos obrigatórios'); return;
    }
    if (availableQty !== null && form.quantity > availableQty) {
      setError(`Quantidade (${form.quantity}) excede o disponível (${availableQty})`); return;
    }
    setSaving(true); setError('');
    try {
      await api.createTransfer(form);
      showToast('success', 'Transferência registrada com sucesso!');
      setShowModal(false); loadTransfers();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const openNew = () => {
    setForm({ originId: '', destinationId: '', productId: '', quantity: 0, withdrawnById: '', receivedById: '', notes: '', requiresConfirmation: false, requestNegativeException: false });
    setAvailableProducts([]);
    setAvailableQty(null);
    setShowModal(true); setError('');
  };

  const runAction = async (action: 'approve' | 'reject' | 'confirm' | 'reverse', transfer: any) => {
    try {
      if (action === 'approve') {
        const accepted = await confirm({ title: 'Aprovar transferência', message: `Confirma a aprovação de ${transfer.quantity} do produto ${transfer.product?.name || ''}?`, confirmText: 'Aprovar', type: 'info' });
        if (!accepted) return;
      }
      if (action === 'confirm') {
        const accepted = await confirm({ title: 'Confirmar recebimento', message: `Confirma que os itens chegaram ao local ${transfer.destination?.name || 'de destino'}?`, confirmText: 'Confirmar recebimento', type: 'info' });
        if (!accepted) return;
      }
      if (action === 'approve') await api.approveTransfer(transfer.id);
      if (action === 'confirm') await api.confirmTransfer(transfer.id);
      if (action === 'reject' || action === 'reverse') {
        const reason = await prompt({ title: action === 'reject' ? 'Rejeitar transferência' : 'Estornar transferência', message: action === 'reject' ? 'A solicitação será encerrada sem movimentar o estoque.' : 'A movimentação será desfeita e os saldos serão recalculados.', label: 'Justificativa', placeholder: 'Descreva o motivo desta ação', confirmText: action === 'reject' ? 'Rejeitar' : 'Estornar', type: 'danger' });
        if (!reason) return;
        if (action === 'reject') await api.rejectTransfer(transfer.id, reason);
        else await api.reverseTransfer(transfer.id, reason);
      }
      showToast('success', 'Transferência atualizada'); loadTransfers();
    } catch (err: any) { showToast('error', err.message); }
  };

  const statusLabel: Record<string, string> = { PENDING_APPROVAL: 'Aguardando aprovação', PENDING_CONFIRMATION: 'Aguardando recebimento', COMPLETED: 'Concluída', REJECTED: 'Rejeitada', REVERSED: 'Estornada' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Transferências</h1>
          <p className="text-surface-500 mt-1">{pagination.total} transferências registradas</p>
        </div>
        {canCreate && <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nova Transferência
        </button>}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
          <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
            <Filter size={16} />
            Filtros
          </div>
          <span className="text-surface-400">{showFilters ? '▲' : '▼'}</span>
        </div>
        {showFilters && (
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Data Início</label>
                <input type="date" value={fStartDate} onChange={(e) => { setFStartDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Data Fim</label>
                <input type="date" value={fEndDate} onChange={(e) => { setFEndDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Origem</label>
                <select value={fOriginId} onChange={(e) => { setFOriginId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full">
                  <option value="">Todas</option>
                  {coldRooms.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Destino</label>
                <select value={fDestinationId} onChange={(e) => { setFDestinationId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full">
                  <option value="">Todos</option>
                  {bars.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-surface-400">Carregando...</div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-12 text-surface-400">Nenhuma transferência encontrada</div>
        ) : transfers.map((t: any) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-surface-900">{t.product.name}</p>
                <p className="text-xs text-surface-500">{t.origin.name} → {t.destination.name}</p>
              </div>
              <span className="font-semibold text-brand-600">{t.quantity} {t.product.unit}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-surface-500">
              <span>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>
              <span>{t.withdrawnBy.name}</span>
            </div>
            <div className="mt-2 text-xs font-medium">{statusLabel[t.status] || t.status}</div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden card overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Data</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Produto</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Qtd</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Origem</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Destino</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Retirado por</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Recebido por</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Situação / Ações</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t: any) => (
                <tr key={t.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3 text-surface-600">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 font-medium text-surface-900">{t.product.name}</td>
                  <td className="px-4 py-3">{t.quantity} {t.product.unit}</td>
                  <td className="px-4 py-3 text-surface-600">{t.origin.name}</td>
                  <td className="px-4 py-3 text-surface-600">{t.destination.name}</td>
                  <td className="px-4 py-3 text-surface-600">{t.withdrawnBy.name}</td>
                  <td className="px-4 py-3 text-surface-600">{t.receivedBy.name}</td>
                  <td className="px-4 py-3"><div className="text-xs mb-1">{statusLabel[t.status] || t.status}</div><div className="flex gap-2">
                    {t.status === 'PENDING_APPROVAL' && canApprove && <><button className="text-emerald-600" onClick={() => runAction('approve', t)}>Aprovar</button><button className="text-red-600" onClick={() => runAction('reject', t)}>Rejeitar</button></>}
                    {t.status === 'PENDING_CONFIRMATION' && canConfirm && <button className="text-brand-600" onClick={() => runAction('confirm', t)}>Confirmar</button>}
                    {t.status === 'COMPLETED' && canReverse && <button className="text-red-600" onClick={() => runAction('reverse', t)}>Estornar</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination {...pagination} onChange={(page) => setPagination((current) => ({ ...current, page }))}/>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 fade-in">
          <div className="bg-white w-full lg:max-w-lg lg:rounded-2xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden shadow-xl scale-in rounded-t-2xl lg:rounded-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">Nova Transferência</h2>
              <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto max-h-[80vh] lg:max-h-[60vh] space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Local de origem *</label>
                  <select value={form.originId} onChange={(e) => setForm({ ...form, originId: e.target.value, productId: '' })} className="w-full">
                    <option value="">Selecione...</option>
                    {coldRooms.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Destino (Bar) *</label>
                  <select value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })} className="w-full">
                    <option value="">Selecione...</option>
                    {bars.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Produto *</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full" disabled={!form.originId}>
                  <option value="">Selecione a origem primeiro...</option>
                  {availableProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Disponível: {p.availableQuantity} {p.unit})</option>)}
                </select>
              </div>
              {availableQty !== null && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${form.quantity > availableQty ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <AlertTriangle size={16} />
                  Estoque disponível: {availableQty}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Quantidade *</label>
                <input type="number" min={quantityStep(selectedProduct?.unit)} step={quantityStep(selectedProduct?.unit)} value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Retirado por</label>
                  <select value={form.withdrawnById} onChange={(e) => setForm({ ...form, withdrawnById: e.target.value })} className="w-full">
                    <option value="">Selecione...</option>
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Recebido por</label>
                  <select value={form.receivedById} onChange={(e) => setForm({ ...form, receivedById: e.target.value })} className="w-full">
                    <option value="">Selecione...</option>
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full" rows={2} />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresConfirmation} onChange={(e) => setForm({ ...form, requiresConfirmation: e.target.checked })}/> Exigir confirmação de recebimento pelo bar</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requestNegativeException} onChange={(e) => setForm({ ...form, requestNegativeException: e.target.checked })}/> Solicitar exceção administrativa se o saldo for insuficiente</label>
            </div>
            <div className="flex gap-3 px-4 lg:px-6 py-4 border-t border-surface-200 bg-surface-50 sticky bottom-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 lg:flex-none">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 lg:flex-none disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
