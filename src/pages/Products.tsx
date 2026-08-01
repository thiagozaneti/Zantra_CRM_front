import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Plus, Search, Edit2, Trash2, X, Package } from 'lucide-react';
import { hasActionPermission } from '../components/Layout';
import { quantityStep } from '../lib/quantity';
import { Pagination } from '../components/DataControls';

interface Product {
  id: string; name: string; category: string; unit: string; sku: string;
  barcode: string; brand: string; supplier: string; salePrice: number | null; supplyFlow: 'COLD_ROOM_REQUIRED' | 'DIRECT_TO_BAR_ALLOWED'; minStock: number;
  active: boolean; notes: string; createdAt: string;
}

export default function Products() {
  const canManage = hasActionPermission('products:manage');
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: '', unit: 'un', sku: '', barcode: '', brand: '', supplier: '', salePrice: null as number | null, supplyFlow: 'COLD_ROOM_REQUIRED', minStock: 0, notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProducts(); loadCategories(); }, [search, category, pagination.page]);
  useEffect(() => { api.getUnits().then(setUnits).catch(() => undefined); }, []);

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

  const openNew = () => { setEditingProduct(null); setForm({ name: '', category: '', unit: 'un', sku: '', barcode: '', brand: '', supplier: '', salePrice: null, supplyFlow: 'COLD_ROOM_REQUIRED', minStock: 0, notes: '' }); setShowModal(true); setError(''); };
  const openEdit = (p: Product) => { setEditingProduct(p); setForm({ name: p.name, category: p.category || '', unit: p.unit, sku: p.sku || '', barcode: p.barcode || '', brand: p.brand || '', supplier: p.supplier || '', salePrice: p.salePrice === null ? null : Number(p.salePrice), supplyFlow: p.supplyFlow || 'COLD_ROOM_REQUIRED', minStock: p.minStock, notes: p.notes || '' }); setShowModal(true); setError(''); };

  const handleSave = async () => {
    if (!form.name || !form.unit) { setError('Nome e unidade são obrigatórios'); return; }
    setSaving(true); setError('');
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, form);
        showToast('success', 'Produto atualizado com sucesso!');
      } else {
        await api.createProduct(form);
        showToast('success', 'Produto criado com sucesso!');
      }
      setShowModal(false); loadProducts(); loadCategories();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({
      title: 'Inativar Produto',
      message: 'Tem certeza que deseja inativar este produto? Ele não aparecerá mais nos selects de movimentação.',
      confirmText: 'Inativar',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.deactivateProduct(id);
      showToast('success', 'Produto inativado com sucesso!');
      loadProducts();
    }
    catch (err: any) { showToast('error', err.message); }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-surface-900">Produtos</h1>
          <p className="text-surface-500 mt-1 text-sm">{pagination.total} produtos cadastrados</p>
        </div>
        {canManage && <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo Produto
        </button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
          <input placeholder="Buscar produto..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full pl-10" />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full sm:w-48">
          <option value="">Todas categorias</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Mobile card view */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-surface-400">Carregando...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-surface-400">Nenhum produto encontrado</div>
        ) : products.map((p, index) => (
          <div key={p.id} className="mobile-card fade-in" style={{ animationDelay: `${index * 0.03}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Package size={18} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="font-medium text-surface-900">{p.name}</h3>
                <p className="text-xs text-surface-500">{p.category || 'Sem categoria'}</p>
                  <p className="text-xs text-brand-600">{p.supplyFlow === 'DIRECT_TO_BAR_ALLOWED' ? 'Entrada direta permitida' : 'Câmara obrigatória'}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>
                {p.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-4 text-surface-600">
                <span>{p.unit}</span>
                {p.sku && <span className="font-mono text-xs">SKU: {p.sku}</span>}
                {p.brand && <span>{p.brand}</span>}
              </div>
              <div className="flex gap-2">
                {canManage && <button onClick={() => openEdit(p)} className="p-2 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                  <Edit2 size={16} />
                </button>}
                {canManage && p.active && (
                  <button onClick={() => handleDeactivate(p.id)} className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden card overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Produto</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Categoria</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Unidade</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">SKU</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Marca</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Est. Mín</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Preço</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Abastecimento</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-surface-400">Carregando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-surface-400">Nenhum produto encontrado</td></tr>
              ) : products.map((p, index) => (
                <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50 fade-in" style={{ animationDelay: `${index * 0.03}s` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                        <Package size={16} className="text-brand-600" />
                      </div>
                      <span className="font-medium text-surface-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-600">{p.category || '-'}</td>
                  <td className="px-4 py-3 text-surface-600">{p.unit}</td>
                  <td className="px-4 py-3 text-surface-600 font-mono text-xs">{p.sku || '-'}</td>
                  <td className="px-4 py-3 text-surface-600">{p.brand || '-'}</td>
                  <td className="px-4 py-3 text-surface-600">{p.minStock}</td>
                  <td className="px-4 py-3 font-medium">{p.salePrice === null ? '-' : Number(p.salePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-3 text-xs"><span className={p.supplyFlow === 'DIRECT_TO_BAR_ALLOWED' ? 'text-emerald-700' : 'text-blue-700'}>{p.supplyFlow === 'DIRECT_TO_BAR_ALLOWED' ? 'Direto ao bar permitido' : 'Câmara obrigatória'}</span></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {canManage && <button onClick={() => openEdit(p)} className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>}
                      {canManage && p.active && (
                        <button onClick={() => handleDeactivate(p.id)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination {...pagination} onChange={(page) => setPagination((current) => ({ ...current, page }))}/>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 fade-in">
          <div className="bg-white w-full lg:max-w-lg lg:rounded-2xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden shadow-xl scale-in rounded-t-2xl lg:rounded-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-600 p-1 hover:rotate-90 transition-transform duration-200"><X size={20} /></button>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto max-h-[80vh] lg:max-h-[60vh] space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Nome *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Categoria</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Unidade *</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value, minStock: 0 })} className="w-full">
                    {units.map((unit) => <option key={unit.code} value={unit.symbol}>{unit.label} ({unit.symbol}) — {unit.fractional ? 'fracionável' : 'inteira'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">SKU</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Código de Barras</label>
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Marca</label>
                  <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Fornecedor</label>
                  <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Estoque Mínimo</label>
                  <input type="number" min="0" step={quantityStep(form.unit)} value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} className="w-full" />
                </div>
                <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Preço de Venda</label><input type="number" min="0" step="0.01" value={form.salePrice ?? ''} onChange={(e) => setForm({ ...form, salePrice: e.target.value === '' ? null : Number(e.target.value) })} className="w-full" placeholder="R$ 0,00" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-surface-700 mb-1.5">Fluxo de abastecimento *</label><select value={form.supplyFlow} onChange={(e) => setForm({ ...form, supplyFlow: e.target.value })} className="w-full"><option value="COLD_ROOM_REQUIRED">Obrigatório passar pela câmara fria</option><option value="DIRECT_TO_BAR_ALLOWED">Entrada direta no bar permitida</option></select><p className="text-xs text-surface-500 mt-1">Produtos com entrada direta também podem ser recebidos em uma câmara, quando necessário.</p></div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Observações</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full" rows={2} />
                </div>
              </div>
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
