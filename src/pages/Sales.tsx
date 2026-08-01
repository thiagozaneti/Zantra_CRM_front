import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { hasActionPermission } from '../components/Layout';
import { quantityStep } from '../lib/quantity';
import { useConfirm } from '../components/ConfirmDialog';

type Product = { id: string; name: string; unit: string; sku?: string; barcode?: string; salePrice: number | null; availableQuantity: number };
type CartItem = Product & { quantity: number; unitPrice: number };

const paymentMethods = [
  ['PIX', 'PIX'], ['CASH', 'Dinheiro'], ['DEBIT_CARD', 'Cartão de débito'],
  ['CREDIT_CARD', 'Cartão de crédito'], ['OTHER', 'Outro'],
];

const money = (value: number | string) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Sales() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { prompt } = useConfirm();
  const canCreate = hasActionPermission('sales:create');
  const canReverse = hasActionPermission('sales:reverse');
  const canOverridePrice = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [bars, setBars] = useState<any[]>([]);
  const [locationId, setLocationId] = useState(user?.locations?.length === 1 ? user.locations[0].id : user?.assignedLocationId || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [summary, setSummary] = useState({ completedSales: 0, totalAmount: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSales = async () => {
    try {
      const params = new URLSearchParams();
      if (locationId) params.set('locationId', locationId);
      params.set('limit', '20');
      const result = await api.getSales(params.toString());
      setSales(result.data); setSummary(result.summary);
    } catch (err: any) { setError(err.message); }
  };

  useEffect(() => {
    api.getReferenceLocations().then((data) => {
      data = data.filter((location: any) => location.allowsSale && (user?.role !== 'SALES_FRONT' || (user.locations?.map((item) => item.id) || (user.assignedLocationId ? [user.assignedLocationId] : [])).includes(location.id)));
      setBars(data);
      if (!locationId && data.length === 1) setLocationId(data[0].id);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setCart([]); setProducts([]);
    if (locationId) api.getSaleProducts(locationId).then(setProducts).catch((err: any) => setError(err.message));
    loadSales();
  }, [locationId]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.sku, product.barcode].some((value) => value?.toLowerCase().includes(term)));
  }, [products, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);
  const totalUnitsAvailable = products.reduce((sum, product) => sum + product.availableQuantity, 0);
  const quantityInCart = (productId: string) => cart.find((item) => item.id === productId)?.quantity || 0;

  const addProduct = (product: Product) => {
    if (product.salePrice === null) return setError(`Cadastre o preço de venda de ${product.name}`);
    setError('');
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.availableQuantity, item.quantity + 1) } : item);
      return [...current, { ...product, quantity: 1, unitPrice: Number(product.salePrice) }];
    });
    setSearch('');
  };

  const setQuantity = (id: string, quantity: number) => setCart((current) => current
    .map((item) => item.id === id ? { ...item, quantity: Math.max(0, Math.min(item.availableQuantity, quantity)) } : item)
    .filter((item) => item.quantity > 0));

  const finishSale = async () => {
    if (!locationId || !cart.length) return setError('Selecione o bar e adicione ao menos um produto');
    if (discount > subtotal) return setError('O desconto não pode superar o subtotal');
    setSaving(true); setError('');
    try {
      const sale = await api.createSale({
        locationId, paymentMethod, discount, customerName: customerName || null, notes: notes || null,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity, ...(canOverridePrice ? { unitPrice: item.unitPrice } : {}) })),
      });
      showToast('success', `Venda #${sale.number} concluída — ${money(sale.totalAmount)}`);
      setCart([]); setDiscount(0); setCustomerName(''); setNotes('');
      const refreshed = await api.getSaleProducts(locationId); setProducts(refreshed); loadSales();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const reverseSale = async (sale: any) => {
    const reason = await prompt({ title: `Estornar venda #${sale.number}`, message: `Esta ação devolverá os itens ao estoque e cancelará o valor de ${money(sale.totalAmount)}.`, label: 'Justificativa do estorno', placeholder: 'Informe o motivo do estorno', confirmText: 'Estornar venda', type: 'danger' });
    if (!reason) return;
    try { await api.reverseSale(sale.id, reason); showToast('success', `Venda #${sale.number} estornada`); loadSales(); if (locationId) setProducts(await api.getSaleProducts(locationId)); }
    catch (err: any) { showToast('error', err.message); }
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-surface-900">Frente de Vendas</h1><p className="text-surface-500 mt-1">Baixa de produtos vendidos no estoque do bar</p></div>
    {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

    {canCreate && <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
      <section className="card p-4 lg:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1.5">Local de venda *</label><select className="w-full" value={locationId} disabled={user?.role === 'SALES_FRONT' && bars.length === 1} onChange={(e) => setLocationId(e.target.value)}><option value="">Selecione...</option>{bars.map((bar) => <option key={bar.id} value={bar.id}>{bar.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1.5">Buscar produto / código</label><div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"/><input className="w-full pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, SKU ou código de barras" disabled={!locationId}/></div></div>
        </div>
        {locationId && <div className="flex flex-wrap gap-3 text-sm"><span className="bg-brand-50 text-brand-700 border border-brand-200 px-3 py-2 rounded-lg"><strong>{products.length}</strong> produtos com saldo</span><span className="bg-surface-50 text-surface-700 border border-surface-200 px-3 py-2 rounded-lg"><strong>{totalUnitsAvailable.toLocaleString('pt-BR')}</strong> unidades disponíveis no bar</span></div>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[430px] overflow-auto">
          {filteredProducts.map((product) => <button key={product.id} onClick={() => addProduct(product)} className="text-left border border-surface-200 rounded-xl p-3 hover:border-brand-400 hover:bg-brand-50 transition-colors disabled:opacity-50" disabled={product.salePrice === null || quantityInCart(product.id) >= product.availableQuantity}>
            <p className="font-medium text-surface-900">{product.name}</p><p className="text-sm font-semibold text-emerald-700 mt-1">Disponível: {(product.availableQuantity - quantityInCart(product.id)).toLocaleString('pt-BR')} {product.unit}</p>{quantityInCart(product.id) > 0 && <p className="text-xs text-brand-600">No carrinho: {quantityInCart(product.id)} {product.unit}</p>}
            <p className={`mt-2 font-semibold ${product.salePrice === null ? 'text-red-500 text-xs' : 'text-brand-600'}`}>{product.salePrice === null ? 'Preço não cadastrado' : money(product.salePrice)}</p>
          </button>)}
          {locationId && !filteredProducts.length && <p className="col-span-full text-center text-surface-400 py-10">Nenhum produto disponível neste bar</p>}
        </div>
      </section>

      <aside className="card overflow-hidden h-fit xl:sticky xl:top-20">
        <div className="card-header flex items-center gap-2"><ShoppingCart size={19}/><h2 className="font-semibold">Carrinho ({cart.length})</h2></div>
        <div className="divide-y max-h-[360px] overflow-auto">{cart.map((item) => <div key={item.id} className="p-4">
          <div className="flex justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-surface-500">{money(item.unitPrice)} / {item.unit}</p><p className="text-xs text-emerald-600">Saldo no bar: {item.availableQuantity} • após venda: {(item.availableQuantity - item.quantity).toLocaleString('pt-BR')}</p></div><button onClick={() => setCart((current) => current.filter((row) => row.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button></div>
            <div className="flex items-center justify-between mt-3"><div className="flex items-center gap-2"><button className="p-1 border rounded" onClick={() => setQuantity(item.id, item.quantity - quantityStep(item.unit))}><Minus size={14}/></button><input className="w-16 text-center py-1" type="number" min={quantityStep(item.unit)} max={item.availableQuantity} step={quantityStep(item.unit)} value={item.quantity} onChange={(e) => setQuantity(item.id, Number(e.target.value))}/><button className="p-1 border rounded" onClick={() => setQuantity(item.id, item.quantity + quantityStep(item.unit))}><Plus size={14}/></button></div>
            {canOverridePrice ? <input title="Preço unitário" className="w-24 text-right py-1" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => setCart((current) => current.map((row) => row.id === item.id ? {...row, unitPrice: Number(e.target.value)} : row))}/> : <span className="font-semibold">{money(item.quantity * item.unitPrice)}</span>}</div>
        </div>)}</div>
        {!cart.length && <p className="p-8 text-center text-surface-400">Carrinho vazio</p>}
        <div className="p-4 space-y-3 bg-surface-50 border-t">
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs mb-1">Pagamento</label><select className="w-full" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>{paymentMethods.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="block text-xs mb-1">Desconto</label><input className="w-full" type="number" min="0" max={subtotal} step="0.01" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))}/></div></div>
          <input className="w-full" placeholder="Cliente (opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)}/><textarea className="w-full" rows={2} placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)}/>
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-brand-600">{money(total)}</span></div>
          <button className="btn-primary w-full disabled:opacity-50" disabled={saving || !cart.length} onClick={finishSale}>{saving ? 'Processando...' : 'Concluir venda'}</button>
        </div>
      </aside>
    </div>}

    <section className="card overflow-hidden"><div className="card-header flex justify-between"><h2 className="font-semibold">Vendas recentes</h2><div className="text-sm text-surface-500">{summary.completedSales} vendas • {money(summary.totalAmount)}</div></div>
      <div className="divide-y md:hidden">{sales.map((sale) => <div key={sale.id} className="p-4"><div className="flex justify-between"><div><p className="font-semibold">Venda #{sale.number}</p><p className="text-xs text-surface-400">{sale.location.name} · {sale.registeredBy.name}</p></div><p className="font-semibold">{money(sale.totalAmount)}</p></div><div className="mt-3 flex items-center justify-between text-xs"><span className={sale.status === 'COMPLETED' ? 'text-emerald-600' : 'text-red-600'}>{sale.status === 'COMPLETED' ? 'Concluída' : 'Estornada'}</span><span className="text-surface-400">{new Date(sale.createdAt).toLocaleString('pt-BR')}</span>{canReverse && sale.status === 'COMPLETED' && <button onClick={() => reverseSale(sale)} className="text-red-600"><RotateCcw size={16}/></button>}</div></div>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="bg-surface-50 border-b">{['Número','Data','Bar','Operador','Itens','Pagamento','Total','Situação',''].map((heading) => <th key={heading} className="text-left px-4 py-3 text-xs uppercase text-surface-600">{heading}</th>)}</tr></thead>
      <tbody>{sales.map((sale) => <tr key={sale.id} className="border-b border-surface-100"><td className="px-4 py-3 font-semibold">#{sale.number}</td><td className="px-4 py-3">{new Date(sale.createdAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3">{sale.location.name}</td><td className="px-4 py-3">{sale.registeredBy.name}</td><td className="px-4 py-3">{sale.items.length}</td><td className="px-4 py-3">{paymentMethods.find(([value]) => value === sale.paymentMethod)?.[1] || sale.paymentMethod}</td><td className="px-4 py-3 font-semibold">{money(sale.totalAmount)}</td><td className="px-4 py-3">{sale.status === 'COMPLETED' ? <span className="text-emerald-600">Concluída</span> : <span className="text-red-600">Estornada</span>}</td><td className="px-4 py-3">{canReverse && sale.status === 'COMPLETED' && <button title="Estornar" className="text-red-600" onClick={() => reverseSale(sale)}><RotateCcw size={16}/></button>}</td></tr>)}</tbody></table></div>
      {!sales.length && <p className="p-8 text-center text-surface-400">Nenhuma venda registrada</p>}
    </section>
  </div>;
}
