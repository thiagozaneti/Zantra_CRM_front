import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { Settings, X, AlertTriangle, Warehouse } from 'lucide-react';

export default function Stock() {
  const { showToast } = useToast();
  const [stocks, setStocks] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fLocationId, setFLocationId] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fProductId, setFProductId] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: '', locationId: '', newQty: 0, reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadStock(); loadRefs(); }, [fLocationId, fCategory, fProductId]);

  const loadStock = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fLocationId) params.set('locationId', fLocationId);
      if (fCategory) params.set('category', fCategory);
      if (fProductId) params.set('productId', fProductId);
      const result = await api.getStock(params.toString());
      setStocks(result);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadRefs = async () => {
    try {
      const [locs, prods] = await Promise.all([
        api.getLocations(),
        api.getProducts('active=true&limit=100'),
      ]);
      setLocations(locs);
      setProducts(prods.data);
    } catch (err) { console.error(err); }
  };

  const handleAdjust = async () => {
    if (!adjustForm.productId || !adjustForm.locationId || !adjustForm.reason) {
      setError('Preencha todos os campos'); return;
    }
    setSaving(true); setError('');
    try {
      await api.adjustStock(adjustForm);
      showToast('success', 'Estoque ajustado com sucesso!');
      setShowAdjustModal(false); loadStock();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const openAdjust = (stock?: any) => {
    if (stock) {
      setAdjustForm({ productId: stock.product.id, locationId: stock.location.id, newQty: stock.quantity, reason: '' });
    } else {
      setAdjustForm({ productId: '', locationId: '', newQty: 0, reason: '' });
    }
    setShowAdjustModal(true); setError('');
  };

  // Group stocks by product for matrix view
  const matrix = stocks.reduce((acc: any, s: any) => {
    const key = s.product.id;
    if (!acc[key]) acc[key] = { product: s.product, locations: {} };
    acc[key].locations[s.location.id] = { quantity: s.quantity, location: s.location };
    return acc;
  }, {});

  const activeLocations = locations.filter((l: any) => l.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Estoque</h1>
          <p className="text-surface-500 mt-1">Visualização em matriz por produto e local</p>
        </div>
        <button onClick={() => openAdjust()} className="btn-primary flex items-center gap-2">
          <Settings size={18} /> Ajustar Estoque
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1.5">Local</label>
              <select value={fLocationId} onChange={(e) => setFLocationId(e.target.value)} className="w-full">
                <option value="">Todos</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1.5">Categoria</label>
              <input value={fCategory} onChange={(e) => setFCategory(e.target.value)} placeholder="Filtrar por categoria" className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1.5">Produto</label>
              <select value={fProductId} onChange={(e) => setFProductId(e.target.value)} className="w-full">
                <option value="">Todos</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile stock list */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-surface-400">Carregando...</div>
        ) : Object.keys(matrix).length === 0 ? (
          <div className="text-center py-12 text-surface-400">Nenhum estoque encontrado</div>
        ) : Object.values(matrix).map((row: any) => (
          <div key={row.product.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-surface-900">{row.product.name}</p>
                <p className="text-xs text-surface-500">{row.product.category || 'Sem categoria'}</p>
              </div>
              <button
                onClick={() => openAdjust(Object.values(row.locations)[0] || { product: row.product, location: activeLocations[0], quantity: 0 })}
                className="text-xs text-brand-600 font-medium"
              >
                Ajustar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {activeLocations.map((l: any) => {
                const cell = row.locations[l.id];
                const qty = cell?.quantity || 0;
                const isLow = row.product.minStock > 0 && qty <= row.product.minStock;
                return (
                  <button
                    key={l.id}
                    onClick={() => openAdjust(cell || { product: row.product, location: l, quantity: 0 })}
                    className={`p-2 rounded-lg text-left ${
                      isLow ? 'bg-red-50 border border-red-200' :
                      qty > 0 ? 'bg-surface-50 border border-surface-200' :
                      'bg-surface-50 border border-surface-100'
                    }`}
                  >
                    <p className="text-xs text-surface-500 truncate">{l.name}</p>
                    <p className={`font-semibold ${isLow ? 'text-red-600' : 'text-surface-900'}`}>
                      {qty} {row.product.unit}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop stock matrix */}
      <div className="hidden card overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Produto</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Categoria</th>
                {activeLocations.map((l: any) => (
                  <th key={l.id} className="text-center px-4 py-3 text-surface-600 font-medium text-xs uppercase min-w-[120px]">
                    <div className="flex items-center justify-center gap-1">
                      {l.type === 'COLD_ROOM' ? <Warehouse size={14} /> : null}
                      {l.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(matrix).map((row: any) => (
                <tr key={row.product.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-surface-900">{row.product.name}</div>
                    <div className="text-xs text-surface-500">{row.product.unit}</div>
                  </td>
                  <td className="px-4 py-3 text-surface-600">{row.product.category || '-'}</td>
                  {activeLocations.map((l: any) => {
                    const cell = row.locations[l.id];
                    const qty = cell?.quantity || 0;
                    const isLow = row.product.minStock > 0 && qty <= row.product.minStock;
                    return (
                      <td key={l.id} className="text-center px-4 py-3">
                        <button
                          onClick={() => openAdjust(cell || { product: row.product, location: l, quantity: 0 })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            isLow ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                            qty > 0 ? 'bg-surface-100 text-surface-900 hover:bg-surface-200' :
                            'bg-surface-50 text-surface-400 hover:bg-surface-100'
                          }`}
                        >
                          {qty}
                          {isLow && <AlertTriangle size={12} className="inline ml-1" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 fade-in">
          <div className="bg-white w-full lg:max-w-md lg:rounded-2xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden shadow-xl scale-in rounded-t-2xl lg:rounded-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">Ajustar Estoque</h2>
              <button onClick={() => setShowAdjustModal(false)} className="text-surface-400 hover:text-surface-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-4 lg:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Produto *</label>
                <select value={adjustForm.productId} onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })} className="w-full">
                  <option value="">Selecione...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Local *</label>
                <select value={adjustForm.locationId} onChange={(e) => setAdjustForm({ ...adjustForm, locationId: e.target.value })} className="w-full">
                  <option value="">Selecione...</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Nova Quantidade *</label>
                <input type="number" min="0" step="0.01" value={adjustForm.newQty || ''} onChange={(e) => setAdjustForm({ ...adjustForm, newQty: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Justificativa * (obrigatória)</label>
                <textarea value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} className="w-full" rows={3} placeholder="Descreva o motivo do ajuste..." />
              </div>
            </div>
            <div className="flex gap-3 px-4 lg:px-6 py-4 border-t border-surface-200 bg-surface-50 sticky bottom-0">
              <button onClick={() => setShowAdjustModal(false)} className="btn-secondary flex-1 lg:flex-none">Cancelar</button>
              <button onClick={handleAdjust} disabled={saving} className="btn-primary flex-1 lg:flex-none disabled:opacity-50">{saving ? 'Salvando...' : 'Confirmar Ajuste'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
