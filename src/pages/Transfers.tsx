import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, X } from 'lucide-react';

export default function Transfers() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [coldRooms, setColdRooms] = useState<any[]>([]);
  const [bars, setBars] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ originId: '', destinationId: '', productId: '', quantity: 0, withdrawnById: '', receivedById: '', notes: '' });
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Filters
  const [fStartDate, setFStartDate] = useState('');
  const [fEndDate, setFEndDate] = useState('');
  const [fOriginId, setFOriginId] = useState('');
  const [fDestinationId, setFDestinationId] = useState('');

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
        api.getLocations('type=COLD_ROOM&active=true'),
        api.getLocations('type=BAR&active=true'),
        api.getUsers(),
      ]);
      setColdRooms(cr);
      setBars(br);
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
      setShowModal(false); loadTransfers();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const openNew = () => {
    setForm({ originId: '', destinationId: '', productId: '', quantity: 0, withdrawnById: '', receivedById: '', notes: '' });
    setAvailableProducts([]);
    setAvailableQty(null);
    setShowModal(true); setError('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Transferências</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-zantra-600 hover:bg-zantra-500 text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> Nova Transferência
        </button>
      </div>

      {/* Filters */}
      <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div><label className="block text-xs text-zantra-400 mb-1">Data Início</label><input type="date" value={fStartDate} onChange={(e) => { setFStartDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm" /></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Data Fim</label><input type="date" value={fEndDate} onChange={(e) => { setFEndDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm" /></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Origem</label><select value={fOriginId} onChange={(e) => { setFOriginId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm"><option value="">Todas</option>{coldRooms.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Destino</label><select value={fDestinationId} onChange={(e) => { setFDestinationId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm"><option value="">Todos</option>{bars.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zantra-800 rounded-xl border border-zantra-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zantra-700">
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Produto</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Qtd</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Origem</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Destino</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Retirado por</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Recebido por</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-zantra-400">Carregando...</td></tr>
              ) : transfers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zantra-400">Nenhuma transferência encontrada</td></tr>
              ) : transfers.map((t: any) => (
                <tr key={t.id} className="border-b border-zantra-700/50 hover:bg-zantra-700/30">
                  <td className="px-4 py-3 text-zantra-300">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-white">{t.product.name}</td>
                  <td className="px-4 py-3 text-white">{t.quantity} {t.product.unit}</td>
                  <td className="px-4 py-3 text-zantra-300">{t.origin.name}</td>
                  <td className="px-4 py-3 text-zantra-300">{t.destination.name}</td>
                  <td className="px-4 py-3 text-zantra-300">{t.withdrawnBy.name}</td>
                  <td className="px-4 py-3 text-zantra-300">{t.receivedBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))} className={`px-3 py-1 rounded-lg text-sm ${p === pagination.page ? 'bg-zantra-600 text-white' : 'bg-zantra-800 text-zantra-400 hover:bg-zantra-700'}`}>{p}</button>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zantra-800 rounded-xl border border-zantra-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-zantra-700">
              <h2 className="text-lg font-semibold text-white">Nova Transferência</h2>
              <button onClick={() => setShowModal(false)} className="text-zantra-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-zantra-400 mb-1">Origem (Câmara) *</label><select value={form.originId} onChange={(e) => setForm({ ...form, originId: e.target.value, productId: '' })} className="w-full"><option value="">Selecione...</option>{coldRooms.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Destino (Bar) *</label><select value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })} className="w-full"><option value="">Selecione...</option>{bars.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              </div>
              <div>
                <label className="block text-sm text-zantra-400 mb-1">Produto *</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full" disabled={!form.originId}>
                  <option value="">Selecione a origem primeiro...</option>
                  {availableProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Disponível: {p.availableQuantity} {p.unit})</option>)}
                </select>
              </div>
              {availableQty !== null && (
                <div className={`text-sm px-3 py-2 rounded-lg ${form.quantity > availableQty ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                  Estoque disponível: {availableQty}
                </div>
              )}
              <div><label className="block text-sm text-zantra-400 mb-1">Quantidade *</label><input type="number" min="0" step="0.01" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-zantra-400 mb-1">Retirado por</label><select value={form.withdrawnById} onChange={(e) => setForm({ ...form, withdrawnById: e.target.value })} className="w-full"><option value="">Selecione...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Recebido por</label><select value={form.receivedById} onChange={(e) => setForm({ ...form, receivedById: e.target.value })} className="w-full"><option value="">Selecione...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              </div>
              <div><label className="block text-sm text-zantra-400 mb-1">Observações</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full" rows={2} /></div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-zantra-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-zantra-400 hover:text-white">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-zantra-600 hover:bg-zantra-500 text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
