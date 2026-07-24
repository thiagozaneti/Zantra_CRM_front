import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

interface Product {
  id: string; name: string; category: string; unit: string; sku: string;
  barcode: string; brand: string; supplier: string; minStock: number;
  active: boolean; notes: string; createdAt: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: '', unit: 'un', sku: '', barcode: '', brand: '', supplier: '', minStock: 0, notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProducts(); loadCategories(); }, [search, category, pagination.page]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('page', pagination.page.toString());
      const result = await api.getProducts(params.toString());
      setProducts(result.data);
      setPagination(result.pagination);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try { const cats = await api.getCategories(); setCategories(cats); } catch {}
  };

  const openNew = () => { setEditingProduct(null); setForm({ name: '', category: '', unit: 'un', sku: '', barcode: '', brand: '', supplier: '', minStock: 0, notes: '' }); setShowModal(true); setError(''); };
  const openEdit = (p: Product) => { setEditingProduct(p); setForm({ name: p.name, category: p.category || '', unit: p.unit, sku: p.sku || '', barcode: p.barcode || '', brand: p.brand || '', supplier: p.supplier || '', minStock: p.minStock, notes: p.notes || '' }); setShowModal(true); setError(''); };

  const handleSave = async () => {
    if (!form.name || !form.unit) { setError('Nome e unidade são obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      if (editingProduct) { await api.updateProduct(editingProduct.id, form); }
      else { await api.createProduct(form); }
      setShowModal(false); loadProducts(); loadCategories();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Tem certeza que deseja inativar este produto?')) return;
    try { await api.deactivateProduct(id); loadProducts(); }
    catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try { await api.deleteProduct(id); loadProducts(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Produtos</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-zantra-600 hover:bg-zantra-500 text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zantra-500" size={18} />
          <input placeholder="Buscar produto..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full pl-10" />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full sm:w-48">
          <option value="">Todas categorias</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-zantra-800 rounded-xl border border-zantra-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zantra-700">
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Unidade</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">SKU</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Marca</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Est. Mín</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-zantra-400">Carregando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-zantra-400">Nenhum produto encontrado</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="border-b border-zantra-700/50 hover:bg-zantra-700/30">
                  <td className="px-4 py-3 text-white">{p.name}</td>
                  <td className="px-4 py-3 text-zantra-300">{p.category || '-'}</td>
                  <td className="px-4 py-3 text-zantra-300">{p.unit}</td>
                  <td className="px-4 py-3 text-zantra-300">{p.sku || '-'}</td>
                  <td className="px-4 py-3 text-zantra-300">{p.brand || '-'}</td>
                  <td className="px-4 py-3 text-zantra-300">{p.minStock}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-zantra-400 hover:text-white"><Edit2 size={16} /></button>
                      {p.active && <button onClick={() => handleDeactivate(p.id)} className="text-yellow-400 hover:text-yellow-300"><Trash2 size={16} /></button>}
                    </div>
                  </td>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zantra-800 rounded-xl border border-zantra-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-zantra-700">
              <h2 className="text-lg font-semibold text-white">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zantra-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-sm text-zantra-400 mb-1">Nome *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" /></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Categoria</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full" /></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Unidade *</label><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full" /></div>
                <div><label className="block text-sm text-zantra-400 mb-1">SKU</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full" /></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Código de Barras</label><input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full" /></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Marca</label><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full" /></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Fornecedor</label><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full" /></div>
                <div><label className="block text-sm text-zantra-400 mb-1">Estoque Mínimo</label><input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} className="w-full" /></div>
                <div className="col-span-2"><label className="block text-sm text-zantra-400 mb-1">Observações</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full" rows={2} /></div>
              </div>
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
