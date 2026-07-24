import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Search, X } from 'lucide-react';

export default function Entries() {
  const [entries, setEntries] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ locationId: '', productId: '', quantity: 0, unit: 'un', supplier: '', invoiceNumber: '', receivedById: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Filters
  const [fStartDate, setFStartDate] = useState('');
  const [fEndDate, setFEndDate] = useState('');
  const [fProductId, setFProductId] = useState('');
  const [fLocationId, setFLocationId] = useState('');

  useEffect(() => { loadEntries(); loadRefs(); }, [pagination.page, fStartDate, fEndDate, fProductId, fLocationId]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fStartDate) params.set('startDate', fStartDate);
      if (fEndDate) params.set('endDate', fEndDate);
      if (fProductId) params.set('productId', fProductId);
      if (fLocationId) params.set('locationId', fLocationId);
      params.set('page', pagination.page.toString());
      const result = await api.getEntries(params.toString());
      setEntries(result.data);
      setPagination(result.pagination);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadRefs = async () => {
    try {
      const [locs, prods, usrs] = await Promise.all([
        api.getLocations('type=COLD_ROOM&active=true'),
        api.getProducts('active=true&limit=100'),
        api.getUsers(),
      ]);
      setLocations(locs);
      setProducts(prods.data);
      setUsers(usrs);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!form.locationId || !form.productId || form.quantity <= 0) {
      setError('Preencha todos os campos obrigatórios'); return;
    }
    setSaving(true); setError('');
    try {
      await api.createEntry(form);
      setShowModal(false); loadEntries();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const openNew = () => {
    setForm({ locationId: '', productId: '', quantity: 0, unit: 'un', supplier: '', invoiceNumber: '', receivedById: '', notes: '' });
    setShowModal(true); setError('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Entradas</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-zantra-600 hover:bg-zantra-500 text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> Nova Entrada
        </button>
      </div>

      {/* Filters */}
      <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div><label className="block text-xs text-zantra-400 mb-1">Data Início</label><input type="date" value={fStartDate} onChange={(e) => { setFStartDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm" /></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Data Fim</label><input type="date" value={fEndDate} onChange={(e) => { setFEndDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm" /></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Produto</label><select value={fProductId} onChange={(e) => { setFProductId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm"><option value="">Todos</option>{products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Câmara</label><select value={fLocationId} onChange={(e) => { setFLocationId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm"><option value="">Todas</option>{locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
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
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Quantidade</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Câmara</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">NF</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-zantra-400">Carregando...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zantra-400">Nenhuma entrada encontrada</td></tr>
              ) : entries.map((e: any) => (
                <tr key={e.id} className="border-b border-zantra-700/50 hover:bg-zantra-700/30">
                  <td className="px-4 py-3 text-zantra-300">{new Date(e.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-white">{e.product.name}</td>
                  <td className="px-4 py-3 text-white">{e.quantity} {e.unit}</td>
                  <td className="px-4 py-3 text-zantra-300">{e.location.name}</td>
                  <td className="px-4 py-3 text-zantra-300">{e.supplier || '-'}</td>
                  <td className="px-4 py-3 text-zantra-300">{e.invoiceNumber || '-'}</td>
                  <td className="px-4 py-3 text-zantra-300">{e.receivedBy.name}</td>
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
              <h2 className="text-lg font-semibold text-white">Nova Entrada</h2>
              <button onClick={() => setShowModal(false)} className="text-zantra-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div><label className="block text-sm text-zantra-400 mb-1">Câmara Fria Destino *</label><select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full"><option value="">Selecione...</option>{locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Produto *</label><select value={form.productId} onChange={(e) => { const p = products.find((p: any) => p.id === e.target.value); setForm({ ...form, productId: e.target.value, unit: p?.unit || 'un' }); }} className="w-full"><option value="">Selecione...</option>{products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-zantra-400 mb-1">Quantidade *</label><input type="number" min="0" step="0.01" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full" /></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Unidade</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full" /></div>
              </div>
              <div><label className="block text-sm text-zantra-400 mb-1">Fornecedor</label><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full" /></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Número da NF</label><input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} className="w-full" /></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Recebido por</label><select value={form.receivedById} onChange={(e) => setForm({ ...form, receivedById: e.target.value })} className="w-full"><option value="">Selecione...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
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
