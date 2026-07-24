import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Settings, X, AlertTriangle } from 'lucide-react';

export default function Stock() {
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
      setShowAdjustModal(false); loadStock();
    } catch (err: any) { setError(err.message); }
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Estoque</h1>
        <button onClick={() => openAdjust()} className="flex items-center gap-2 bg-zantra-600 hover:bg-zantra-500 text-white px-4 py-2 rounded-lg">
          <Settings size={18} /> Ajustar Estoque
        </button>
      </div>

      {/* Filters */}
      <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="block text-xs text-zantra-400 mb-1">Local</label><select value={fLocationId} onChange={(e) => setFLocationId(e.target.value)} className="w-full text-sm"><option value="">Todos</option>{locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Categoria</label><input value={fCategory} onChange={(e) => setFCategory(e.target.value)} placeholder="Filtrar por categoria" className="w-full text-sm" /></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Produto</label><select value={fProductId} onChange={(e) => setFProductId(e.target.value)} className="w-full text-sm"><option value="">Todos</option>{products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
      </div>

      {/* Stock Matrix */}
      <div className="bg-zantra-800 rounded-xl border border-zantra-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zantra-700">
                <th className="text-left px-4 py-3 text-zantra-400 font-medium sticky left-0 bg-zantra-800">Produto</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Categoria</th>
                {activeLocations.map((l: any) => (
                  <th key={l.id} className="text-center px-4 py-3 text-zantra-400 font-medium min-w-[120px]">
                    {l.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2 + activeLocations.length} className="text-center py-8 text-zantra-400">Carregando...</td></tr>
              ) : Object.keys(matrix).length === 0 ? (
                <tr><td colSpan={2 + activeLocations.length} className="text-center py-8 text-zantra-400">Nenhum estoque encontrado</td></tr>
              ) : Object.values(matrix).map((row: any) => (
                <tr key={row.product.id} className="border-b border-zantra-700/50 hover:bg-zantra-700/30">
                  <td className="px-4 py-3 text-white font-medium sticky left-0 bg-zantra-800">
                    <div>{row.product.name}</div>
                    <div className="text-xs text-zantra-400">{row.product.unit}</div>
                  </td>
                  <td className="px-4 py-3 text-zantra-300">{row.product.category || '-'}</td>
                  {activeLocations.map((l: any) => {
                    const cell = row.locations[l.id];
                    const qty = cell?.quantity || 0;
                    const isLow = row.product.minStock > 0 && qty <= row.product.minStock;
                    return (
                      <td key={l.id} className="text-center px-4 py-3">
                        <button
                          onClick={() => openAdjust(cell || { product: row.product, location: l, quantity: 0 })}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            isLow ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
                            qty > 0 ? 'bg-zantra-700 text-white hover:bg-zantra-600' :
                            'bg-zantra-800 text-zantra-500 hover:bg-zantra-700'
                          }`}
                        >
                          {qty} {isLow && <AlertTriangle size={12} className="inline" />}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zantra-800 rounded-xl border border-zantra-700 w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-zantra-700">
              <h2 className="text-lg font-semibold text-white">Ajustar Estoque</h2>
              <button onClick={() => setShowAdjustModal(false)} className="text-zantra-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div><label className="block text-sm text-zantra-400 mb-1">Produto *</label><select value={adjustForm.productId} onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })} className="w-full"><option value="">Selecione...</option>{products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Local *</label><select value={adjustForm.locationId} onChange={(e) => setAdjustForm({ ...adjustForm, locationId: e.target.value })} className="w-full"><option value="">Selecione...</option>{locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Nova Quantidade *</label><input type="number" min="0" step="0.01" value={adjustForm.newQty || ''} onChange={(e) => setAdjustForm({ ...adjustForm, newQty: Number(e.target.value) })} className="w-full" /></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Justificativa * (obrigatória)</label><textarea value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} className="w-full" rows={3} placeholder="Descreva o motivo do ajuste..." /></div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-zantra-700">
              <button onClick={() => setShowAdjustModal(false)} className="px-4 py-2 rounded-lg text-zantra-400 hover:text-white">Cancelar</button>
              <button onClick={handleAdjust} disabled={saving} className="px-4 py-2 rounded-lg bg-zantra-600 hover:bg-zantra-500 text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Confirmar Ajuste'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
