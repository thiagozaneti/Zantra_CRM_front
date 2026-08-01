import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { Plus, X, Filter, MapPin } from 'lucide-react';
import { hasActionPermission } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { quantityStep } from '../lib/quantity';
import { Pagination } from '../components/DataControls';

export default function Entries() {
  const canCreate = hasActionPermission('entries:create');
  const { user } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [allocating, setAllocating] = useState<any | null>(null);
  const [allocation, setAllocation] = useState({ destinationId: '', quantity: 0, notes: '' });
  const [form, setForm] = useState({ locationId: '', productId: '', quantity: 0, unit: 'un', unitCost: null as number | null, supplier: '', invoiceNumber: '', receivedById: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [fStartDate, setFStartDate] = useState('');
  const [fEndDate, setFEndDate] = useState('');
  const [fProductId, setFProductId] = useState('');
  const [fLocationId, setFLocationId] = useState('');

  useEffect(() => { loadEntries(); loadUnassigned(); loadRefs(); }, [pagination.page, fStartDate, fEndDate, fProductId, fLocationId]);

  const loadUnassigned = async () => { try { setUnassigned(await api.getUnassignedStock()); } catch (err) { console.error(err); } };

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
        api.getReferenceLocations(),
        api.getReferenceProducts(),
        api.getReferenceUsers(),
      ]);
      setLocations(Array.isArray(locs) ? locs : (locs?.data || []));
      setProducts(Array.isArray(prods) ? prods : (prods?.data || []));
      setUsers(Array.isArray(usrs) ? usrs : (usrs?.data || []));
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!form.productId || form.quantity <= 0) {
      setError('Preencha todos os campos obrigatórios'); return;
    }
    setSaving(true); setError('');
    try {
      await api.createEntry(form);
      showToast('success', 'Entrada registrada com sucesso!');
      setShowModal(false); loadEntries();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const openNew = () => {
    setForm({ locationId: '', productId: '', quantity: 0, unit: 'un', unitCost: null, supplier: '', invoiceNumber: '', receivedById: '', notes: '' });
    setShowModal(true); setError('');
  };

  const selectableProducts = user?.role === 'BAR_RESPONSIBLE'
    ? products.filter((product: any) => product.supplyFlow === 'DIRECT_TO_BAR_ALLOWED')
    : products;
  const selectedProduct = selectableProducts.find((product: any) => product.id === form.productId);
  const allowedLocations = locations.filter((location: any) => location.acceptsEntry && (
    selectedProduct?.supplyFlow === 'COLD_ROOM_REQUIRED' ? location.type === 'COLD_ROOM' : true
  ) && location.type !== 'UNASSIGNED');

  const allocate = async () => {
    if (!allocating || !allocation.destinationId || allocation.quantity <= 0) return setError('Informe destino e quantidade para destinar o item');
    try {
      await api.allocateUnassignedStock({ productId: allocating.product.id, ...allocation });
      showToast('success', 'Item destinado e estoque atualizado'); setAllocating(null); setError(''); loadUnassigned(); loadEntries();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-surface-900">Entradas</h1>
          <p className="text-surface-500 mt-1 text-sm">{pagination.total} entradas registradas</p>
        </div>
        {canCreate && <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nova Entrada
        </button>}
      </div>

      <section className={`rounded-xl border p-4 ${unassigned.length ? 'border-amber-200 bg-amber-50/60' : 'border-surface-200 bg-white'}`}>
        <div className="flex items-center gap-2"><MapPin size={18} className={unassigned.length ? 'text-amber-600' : 'text-surface-400'}/><div><h2 className="font-semibold text-surface-900">Itens aguardando destino</h2><p className="text-xs text-surface-500">Entradas recebidas fisicamente, mas ainda não vinculadas a um local operacional.</p></div></div>
        {unassigned.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{unassigned.map((stock: any) => <div key={stock.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3"><div><p className="text-sm font-medium text-surface-900">{stock.product.name}</p><p className="text-xs text-amber-700">{stock.quantity} {stock.product.unit} sem destino</p></div>{canCreate && <button className="btn-secondary text-xs" onClick={() => { setAllocating(stock); setAllocation({ destinationId: '', quantity: stock.quantity, notes: '' }); setError(''); }}>Destinar</button>}</div>)}</div> : <p className="mt-3 text-sm text-surface-500">Não há itens pendentes de destinação.</p>}
      </section>

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
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Produto</label>
                <select value={fProductId} onChange={(e) => { setFProductId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full">
                  <option value="">Todos</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Local</label>
                <select value={fLocationId} onChange={(e) => { setFLocationId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full">
                  <option value="">Todas</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
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
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-surface-400">Nenhuma entrada encontrada</div>
        ) : entries.map((e: any) => (
          <div key={e.id} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-surface-900">{e.product.name}</p>
                <p className="text-xs text-surface-500">{e.location.name}</p>
              </div>
              <span className="font-semibold text-brand-600">{e.quantity} {e.unit}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-surface-500">
              <span>{new Date(e.createdAt).toLocaleDateString('pt-BR')}</span>
              <span>{e.supplier || ''}</span>
            </div>
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
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Local de entrada</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Fornecedor</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">NF</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any) => (
                <tr key={e.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3 text-surface-600">{new Date(e.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 font-medium text-surface-900">{e.product.name}</td>
                  <td className="px-4 py-3">{e.quantity} {e.unit}</td>
                  <td className="px-4 py-3 text-surface-600">{e.location.name}</td>
                  <td className="px-4 py-3 text-surface-600">{e.supplier || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.invoiceNumber || '-'}</td>
                  <td className="px-4 py-3 text-surface-600">{e.receivedBy.name}</td>
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
              <h2 className="text-lg font-semibold text-surface-900">Nova Entrada</h2>
              <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto max-h-[80vh] lg:max-h-[60vh] space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Produto *</label>
                <select value={form.productId} onChange={(e) => { const p = products.find((p: any) => p.id === e.target.value); setForm({ ...form, productId: e.target.value, locationId: '', unit: p?.unit || 'un' }); }} className="w-full">
                  <option value="">Selecione...</option>
                  {selectableProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {selectedProduct && <div className={`rounded-lg border p-3 text-sm ${selectedProduct.supplyFlow === 'DIRECT_TO_BAR_ALLOWED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>{selectedProduct.supplyFlow === 'DIRECT_TO_BAR_ALLOWED' ? 'Este produto pode entrar diretamente em um bar ou ser recebido em uma câmara fria.' : 'Este produto deve obrigatoriamente ser recebido em uma câmara fria.'}</div>}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Local de destino (opcional)</label>
                <select value={form.locationId} disabled={!selectedProduct} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full">
                  <option value="">{selectedProduct ? 'Deixar sem destino por enquanto' : 'Selecione o produto primeiro'}</option>
                  {allowedLocations.map((l: any) => <option key={l.id} value={l.id}>{l.type === 'COLD_ROOM' ? 'Câmara — ' : 'Bar — '}{l.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Quantidade *</label>
                  <input type="number" min={quantityStep(selectedProduct?.unit)} step={quantityStep(selectedProduct?.unit)} value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Unidade</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full" />
                </div>
              </div>
              <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Custo unitário</label><input type="number" min="0" step="0.0001" value={form.unitCost ?? ''} onChange={(e) => setForm({ ...form, unitCost: e.target.value === '' ? null : Number(e.target.value) })} className="w-full" placeholder="R$ 0,0000"/></div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Fornecedor</label>
                <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Número da NF</label>
                <input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Recebido por</label>
                <select value={form.receivedById} onChange={(e) => setForm({ ...form, receivedById: e.target.value })} className="w-full">
                  <option value="">Selecione...</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full" rows={2} />
              </div>
            </div>
            <div className="flex gap-3 px-4 lg:px-6 py-4 border-t border-surface-200 bg-surface-50 sticky bottom-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 lg:flex-none">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 lg:flex-none disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {allocating && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center z-50"><div className="bg-white w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl shadow-xl"><div className="flex justify-between items-center px-5 py-4 border-b"><div><h2 className="font-semibold">Destinar {allocating.product.name}</h2><p className="text-xs text-surface-500">Saldo disponível: {allocating.quantity} {allocating.product.unit}</p></div><button onClick={() => setAllocating(null)}><X size={20}/></button></div><div className="p-5 space-y-4">{error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}<div><label className="block text-sm font-medium mb-1.5">Destino *</label><select className="w-full" value={allocation.destinationId} onChange={(e) => setAllocation({ ...allocation, destinationId: e.target.value })}><option value="">Selecione...</option>{locations.filter((location: any) => location.type !== 'UNASSIGNED' && location.allowsTransferDestination && (allocating.product.supplyFlow !== 'COLD_ROOM_REQUIRED' || location.type === 'COLD_ROOM')).map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div><div><label className="block text-sm font-medium mb-1.5">Quantidade *</label><input className="w-full" type="number" min={quantityStep(allocating.product.unit)} max={allocating.quantity} step={quantityStep(allocating.product.unit)} value={allocation.quantity || ''} onChange={(e) => setAllocation({ ...allocation, quantity: Number(e.target.value) })}/><p className="text-xs text-surface-500 mt-1">Você pode destinar apenas parte do saldo.</p></div><div><label className="block text-sm font-medium mb-1.5">Observação</label><textarea className="w-full" rows={2} value={allocation.notes} onChange={(e) => setAllocation({ ...allocation, notes: e.target.value })}/></div></div><div className="flex justify-end gap-2 border-t p-4"><button className="btn-secondary" onClick={() => setAllocating(null)}>Cancelar</button><button className="btn-primary" onClick={allocate}>Confirmar destino</button></div></div></div>}
    </div>
  );
}
