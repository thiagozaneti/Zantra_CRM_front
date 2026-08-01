import { useEffect, useState } from 'react';
import { Plus, RotateCcw, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { hasActionPermission } from '../components/Layout';
import { quantityStep } from '../lib/quantity';
import { useConfirm } from '../components/ConfirmDialog';

const consumptionTypes = [
  { value: 'NORMAL', label: 'Uso normal' },
  { value: 'PRODUCTION', label: 'Produção' },
  { value: 'LOSS', label: 'Perda' },
  { value: 'DAMAGE', label: 'Avaria' },
  { value: 'COURTESY', label: 'Cortesia' },
  { value: 'OTHER', label: 'Outros' },
];

const typeLabel = (value: string) => consumptionTypes.find((item) => item.value === value)?.label || value;

export default function Consumption() {
  const { showToast } = useToast();
  const { prompt } = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ locationId: '', productId: '', quantity: 0, type: 'NORMAL', reason: '' });
  const [error, setError] = useState('');
  const canCreate = hasActionPermission('consumption:create');
  const canReverse = hasActionPermission('consumption:reverse');

  const load = async () => {
    try { setRows(await api.getConsumption()); } catch (err: any) { showToast('error', err.message); }
  };

  useEffect(() => {
    load();
    api.getReferenceLocations().then((result) => setLocations(Array.isArray(result) ? result : (result?.data || []))).catch(() => undefined);
  }, []);

  const loadAvailableProducts = async (locationId: string) => {
    setProducts([]);
    if (!locationId) return;
    try { setLoadingProducts(true); setProducts(await api.getConsumptionProducts(locationId)); }
    catch (err: any) { setError(err.message); }
    finally { setLoadingProducts(false); }
  };

  const selectedProduct = products.find((product) => product.id === form.productId);
  const reasonRequired = ['LOSS', 'DAMAGE', 'OTHER'].includes(form.type);

  const save = async () => {
    if (!form.locationId || !form.productId || form.quantity <= 0) return setError('Local, produto e quantidade são obrigatórios');
    if (reasonRequired && !form.reason.trim()) return setError('Informe o motivo para esta classificação');
    if (selectedProduct && form.quantity > selectedProduct.availableQuantity) return setError(`Quantidade maior que o saldo disponível (${selectedProduct.availableQuantity} ${selectedProduct.unit})`);
    try {
      await api.createConsumption(form);
      setShowModal(false);
      setForm({ locationId: '', productId: '', quantity: 0, type: 'NORMAL', reason: '' });
      showToast('success', 'Consumo interno registrado e estoque atualizado');
      load();
    } catch (err: any) { setError(err.message); }
  };

  const reverse = async (id: string) => {
    const reason = await prompt({ title: 'Estornar consumo', message: 'O saldo deste produto será devolvido ao local de origem.', label: 'Justificativa do estorno', placeholder: 'Explique por que este consumo está sendo estornado', confirmText: 'Estornar consumo', type: 'danger' });
    if (!reason) return;
    try { await api.reverseConsumption(id, reason); showToast('success', 'Consumo estornado e saldo devolvido'); load(); }
    catch (err: any) { showToast('error', err.message); }
  };

  const openNew = () => {
    setError('');
    setProducts([]);
    setForm({ locationId: '', productId: '', quantity: 0, type: 'NORMAL', reason: '' });
    setShowModal(true);
  };

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-surface-900">Consumo Interno</h1><p className="text-surface-500 mt-1">Baixas operacionais de produtos em qualquer local</p></div>
      {canCreate && <button className="btn-primary flex items-center gap-2" onClick={openNew}><Plus size={18}/> Registrar consumo</button>}
    </div>
    <div className="space-y-3 md:hidden">{rows.map((row) => <div key={row.id} className="rounded-lg border bg-white p-4"><div className="flex justify-between gap-3"><div><p className="font-medium">{row.product.name}</p><p className="text-xs text-surface-400">{row.location.name} · {typeLabel(row.type || 'NORMAL')}</p></div><p className="font-semibold">{row.quantity} {row.product.unit}</p></div><div className="mt-3 flex items-center justify-between text-xs"><span className={row.reversedAt ? 'text-red-600' : 'text-emerald-600'}>{row.reversedAt ? 'Estornado' : 'Efetivado'}</span><span className="text-surface-400">{new Date(row.createdAt).toLocaleString('pt-BR')}</span>{canReverse && !row.reversedAt && <button onClick={() => reverse(row.id)} className="text-red-600"><RotateCcw size={16}/></button>}</div></div>)}</div>
    <div className="card hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="border-b bg-surface-50">
      {['Data','Local','Tipo','Produto','Quantidade','Responsável','Motivo','Situação',''].map((title) => <th key={title} className="text-left px-4 py-3 text-xs uppercase text-surface-600">{title}</th>)}
    </tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-surface-100">
      <td className="px-4 py-3">{new Date(row.createdAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3">{row.location.name}</td>
      <td className="px-4 py-3"><span className="rounded-full bg-surface-100 px-2 py-1 text-xs font-medium">{typeLabel(row.type || 'NORMAL')}</span></td>
      <td className="px-4 py-3 font-medium">{row.product.name}</td><td className="px-4 py-3">{row.quantity} {row.product.unit}</td>
      <td className="px-4 py-3">{row.registeredBy.name}</td><td className="px-4 py-3">{row.reason || '-'}</td>
      <td className="px-4 py-3">{row.reversedAt ? <span className="text-red-600">Estornado</span> : <span className="text-emerald-600">Efetivado</span>}</td>
      <td className="px-4 py-3">{canReverse && !row.reversedAt && <button title="Estornar" onClick={() => reverse(row.id)} className="text-red-600"><RotateCcw size={16}/></button>}</td>
    </tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-surface-400">Nenhum consumo interno registrado</p>}</div>
    {showModal && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
      <div className="flex justify-between px-6 py-4 border-b"><h2 className="font-semibold">Registrar consumo interno</h2><button onClick={() => setShowModal(false)}><X size={20}/></button></div>
      <div className="p-6 space-y-4">{error && <div className="text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
        <div><label className="block text-sm mb-1">Local de consumo *</label><select className="w-full" value={form.locationId} onChange={(e) => { const locationId = e.target.value; setForm({...form, locationId, productId: '', quantity: 0}); setError(''); loadAvailableProducts(locationId); }}><option value="">Selecione...</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
        <div><label className="block text-sm mb-1">Classificação *</label><select className="w-full" value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>{consumptionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
        <div><label className="block text-sm mb-1">Produto disponível no local *</label><select className="w-full" value={form.productId} disabled={!form.locationId || loadingProducts} onChange={(e) => setForm({...form, productId:e.target.value, quantity: 0})}><option value="">{loadingProducts ? 'Carregando estoque...' : form.locationId ? 'Selecione...' : 'Selecione o local primeiro'}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} — saldo: {product.availableQuantity} {product.unit}</option>)}</select>{form.locationId && !loadingProducts && products.length === 0 && <p className="text-xs text-amber-600 mt-1">Este local não possui produtos com saldo disponível.</p>}</div>
        {selectedProduct && <div className="rounded-lg bg-brand-50 border border-brand-200 p-3"><p className="text-xs text-brand-600">Saldo disponível no local</p><p className="text-xl font-bold text-brand-700">{selectedProduct.availableQuantity} {selectedProduct.unit}</p>{form.quantity > 0 && <p className="text-xs text-brand-600 mt-1">Saldo após o consumo: {(selectedProduct.availableQuantity - form.quantity).toLocaleString('pt-BR')} {selectedProduct.unit}</p>}</div>}
        <div><label className="block text-sm mb-1">Quantidade *</label><input className="w-full" type="number" min={quantityStep(selectedProduct?.unit)} max={selectedProduct?.availableQuantity} step={quantityStep(selectedProduct?.unit)} disabled={!selectedProduct} value={form.quantity || ''} onChange={(e) => setForm({...form,quantity:Number(e.target.value)})}/>{selectedProduct && <p className="text-xs text-surface-500 mt-1">{quantityStep(selectedProduct.unit) === 1 ? 'Somente quantidades inteiras.' : 'Até 3 casas decimais.'} Máximo: {selectedProduct.availableQuantity} {selectedProduct.unit}</p>}</div>
        <div><label className="block text-sm mb-1">Motivo/observação {reasonRequired ? '*' : ''}</label><textarea className="w-full" rows={3} value={form.reason} onChange={(e) => setForm({...form,reason:e.target.value})}/></div>
      </div><div className="p-4 border-t flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn-primary disabled:opacity-50" disabled={!selectedProduct || form.quantity <= 0 || form.quantity > selectedProduct.availableQuantity || (reasonRequired && !form.reason.trim())} onClick={save}>Registrar</button></div>
    </div></div>}
  </div>;
}
