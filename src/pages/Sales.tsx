import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, History, Link2, Minus, Plus, Printer, RotateCcw, Search, ShoppingCart, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { hasActionPermission } from '../components/Layout';
import { quantityStep } from '../lib/quantity';
import { useConfirm } from '../components/ConfirmDialog';
import RFIDCommandPanel, { IdentifiedCommand } from '../components/RFIDCommandPanel';
import { createUuid } from '../lib/uuid';

type Product = { id: string; name: string; unit: string; sku?: string; barcode?: string; salePrice: number | null; availableQuantity: number };
type CartItem = Product & { quantity: number; unitPrice: number };

const paymentMethods = [
  ['PIX', 'PIX'], ['DINHEIRO', 'Dinheiro'], ['CARTAO_DEBITO', 'Cartão de débito'],
  ['CARTAO_CREDITO', 'Cartão de crédito'], ['COMANDA', 'Comanda RFID'], ['OUTRO', 'Outro'],
];

const money = (value: number | string) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Sales() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { prompt } = useConfirm();
  const canCreate = hasActionPermission('sales:create');
  const canReverse = hasActionPermission('sales:reverse');
  const canOverridePrice = user?.role === 'ADMINISTRADOR' || user?.role === 'GERENTE';
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
  const [selectedCommand, setSelectedCommand] = useState<IdentifiedCommand | null>(null);
  const [operationStatus, setOperationStatus] = useState('');
  const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);
  const [workstation, setWorkstation] = useState<any>({ bound: false, terminal: null });
  const [bindingCode, setBindingCode] = useState('');
  const [binding, setBinding] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);

  const selectCommand = (command: IdentifiedCommand | null) => {
    setSelectedCommand(command);
    setPaymentMethod(command ? 'COMANDA' : 'PIX');
    setOperationStatus(command ? 'Comanda identificada e pronta para consumo' : '');
  };

  const loadSales = async () => {
    try {
      const params = new URLSearchParams();
      if (locationId) params.set('locationId', locationId);
      params.set('limit', '20');
      const result = await api.getSales(params.toString());
      setSales(result.data); setSummary(result.summary);
    } catch (err: any) { setError(err.message); }
  };

  const loadWorkstation = async () => {
    try {
      let status = await api.getWorkstationStatus();
      const lastRenewal = Number(localStorage.getItem('zantra_workstation_renewed_at') || 0);
      if (status.bound && Date.now() - lastRenewal > 24 * 60 * 60_000) {
        status = await api.renewWorkstation();
        localStorage.setItem('zantra_workstation_renewed_at', String(Date.now()));
      }
      setWorkstation(status);
    } catch { setWorkstation({ bound: false, terminal: null }); }
  };

  const bindWorkstation = async () => {
    setBinding(true);
    try { const result = await api.bindWorkstation(bindingCode); setWorkstation(result); setBindingCode(''); showToast('success', 'Este navegador foi vinculado ao Zantra Agent.'); }
    catch (err: any) { showToast('error', err.message); }
    finally { setBinding(false); }
  };

  const watchPrintJob = async (jobId: string) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        const job = await api.getPrintJob(jobId);
        if (job.status === 'IMPRESSO') { setOperationStatus('Venda concluída e comprovante impresso'); void loadSales(); return showToast('success', 'Comprovante impresso.'); }
        if (job.status === 'FALHOU') { setOperationStatus('Venda concluída; a impressão requer atenção'); void loadSales(); return showToast('warning', job.errorMessage || 'A impressão não foi concluída.'); }
      } catch { return; }
    }
    setOperationStatus('Venda concluída; impressão permanece na fila');
  };

  useEffect(() => {
    api.getReferenceLocations().then((data) => {
      data = data.filter((location: any) => location.allowsSale && (user?.role !== 'FRENTE_VENDAS' || (user.locations?.map((item) => item.id) || (user.assignedLocationId ? [user.assignedLocationId] : [])).includes(location.id)));
      setBars(data);
      if (!locationId && data.length === 1) setLocationId(data[0].id);
    }).catch(() => undefined);
  }, []);

  useEffect(() => { void loadWorkstation(); const timer = setInterval(() => void loadWorkstation(), 30_000); return () => clearInterval(timer); }, []);

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
  const printerReady = Boolean(workstation.bound && workstation.terminal?.online && workstation.terminal?.printerAvailable && workstation.terminal?.activePrinterName && (!locationId || workstation.terminal.locationId === locationId));

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
    if (selectedCommand && total > Number(selectedCommand.valorTotal)) return setError(`Saldo insuficiente na comanda. Disponível: ${money(selectedCommand.valorTotal)}`);
    setSaving(true); setError(''); setOperationStatus('Registrando venda');
    try {
      const sale = await api.createSale({
        locationId, paymentMethod, discount, customerName: customerName || null, notes: notes || null,
        comandaId: selectedCommand?.comandaId || null, requestId: createUuid(), printReceipt: true,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity, ...(canOverridePrice ? { unitPrice: item.unitPrice } : {}) })),
      });
      showToast('success', `Venda #${sale.number} concluída — ${money(sale.totalAmount)}`);
      setCart([]); setDiscount(0); setCustomerName(''); setNotes('');
      const refreshed = await api.getSaleProducts(locationId); setProducts(refreshed); loadSales();
      if (sale.printWarning) { setOperationStatus(sale.printWarning.message); showToast('warning', sale.printWarning.message); }
      else if (sale.printJob) {
        setOperationStatus(workstation.terminal?.online ? 'Venda concluída e impressão enviada' : 'Venda concluída; impressão aguardando o terminal');
        void watchPrintJob(sale.printJob.id);
      } else setOperationStatus('Venda concluída sem impressão');
      setSelectedCommand(null); setPaymentMethod('PIX');
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const reprintSale = async (sale: any) => {
    setPrintingSaleId(sale.id); setOperationStatus('Enviando reimpressão');
    try { const result = await api.printSale(sale.id); showToast('success', `Reimpressão da venda #${sale.number} enfileirada`); setOperationStatus('Reimpressão enfileirada'); void watchPrintJob(result.job.id); }
    catch (error: any) { showToast('error', error.message); setOperationStatus('Falha de impressão'); }
    finally { setPrintingSaleId(null); }
  };

  const reverseSale = async (sale: any) => {
    const reason = await prompt({ title: `Estornar venda #${sale.number}`, message: `Esta ação devolverá os itens ao estoque e cancelará o valor de ${money(sale.totalAmount)}.`, label: 'Justificativa do estorno', placeholder: 'Informe o motivo do estorno', confirmText: 'Estornar venda', type: 'danger' });
    if (!reason) return;
    try { await api.reverseSale(sale.id, reason); showToast('success', `Venda #${sale.number} estornada`); loadSales(); if (locationId) setProducts(await api.getSaleProducts(locationId)); }
    catch (err: any) { showToast('error', err.message); }
  };

  return <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto xl:overflow-hidden">
    <div className="flex shrink-0 items-center justify-between gap-3"><div><h1 className="text-xl font-bold text-surface-900">Frente de Vendas</h1><p className="text-xs text-surface-500">Venda, baixa no estoque e emissão automática de comprovante</p></div><button className="btn-secondary flex shrink-0 items-center gap-2" onClick={() => setSalesOpen(true)}><History size={16}/>Vendas <span className="rounded-full bg-surface-100 px-1.5 text-xs">{summary.completedSales}</span></button></div>
    {error && <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
    {operationStatus && <div className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">{operationStatus}</div>}

    <section className={`shrink-0 rounded-xl border px-3 py-2.5 ${printerReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2.5">{printerReady ? <Wifi size={18} className="text-emerald-600"/> : workstation.bound ? <WifiOff size={18} className="text-amber-600"/> : <Link2 size={18} className="text-amber-600"/>}<div><p className="text-sm font-semibold text-surface-900">{printerReady ? 'Impressora conectada' : workstation.bound ? 'Impressora indisponível' : 'Impressora não vinculada'}</p><p className="text-[11px] text-surface-600">{workstation.bound ? `${workstation.terminal.name} · ${workstation.terminal.activePrinterName || 'sem impressora configurada'} · ${workstation.terminal.online ? 'Agent online' : 'Agent offline'}` : 'Informe o código exibido pelo Agent. O comprovante é solicitado em toda venda.'}</p></div></div>
        {!workstation.bound && <div className="flex w-full gap-2 sm:w-auto"><input className="min-w-0 flex-1 sm:w-48" value={bindingCode} onChange={(event) => setBindingCode(event.target.value.toUpperCase())} placeholder="000-000" maxLength={30}/><button className="btn-primary" disabled={binding || bindingCode.trim().length < 6} onClick={() => void bindWorkstation()}>Vincular</button></div>}
      </div>
      {workstation.bound && locationId && workstation.terminal.locationId !== locationId && <p className="mt-1 text-xs font-medium text-red-700">O terminal pertence a outro local; a venda será concluída e o sistema registrará o aviso de impressão.</p>}
    </section>

    {canCreate && <RFIDCommandPanel enabled={canCreate} busy={saving} selected={selectedCommand} onSelect={selectCommand}/>}

    {canCreate && <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="card flex min-h-0 flex-col gap-3 p-4">
        <div className="grid shrink-0 gap-3 sm:grid-cols-2">
          <div><label className="block text-sm font-medium mb-1.5">Local de venda *</label><select className="w-full" value={locationId} disabled={user?.role === 'FRENTE_VENDAS' && bars.length === 1} onChange={(e) => setLocationId(e.target.value)}><option value="">Selecione...</option>{bars.map((bar) => <option key={bar.id} value={bar.id}>{bar.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1.5">Buscar produto / código</label><div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"/><input className="w-full pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, SKU ou código de barras" disabled={!locationId}/></div></div>
        </div>
        {locationId && <div className="flex shrink-0 flex-wrap gap-2 text-xs"><span className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-brand-700"><strong>{products.length}</strong> produtos</span><span className="rounded-lg border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-surface-700"><strong>{totalUnitsAvailable.toLocaleString('pt-BR')}</strong> unidades disponíveis</span></div>}
        <div className="grid min-h-[180px] flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-3">
          {filteredProducts.map((product) => <button key={product.id} onClick={() => addProduct(product)} className="text-left border border-surface-200 rounded-xl p-3 hover:border-brand-400 hover:bg-brand-50 transition-colors disabled:opacity-50" disabled={product.salePrice === null || quantityInCart(product.id) >= product.availableQuantity}>
            <p className="font-medium text-surface-900">{product.name}</p><p className="text-sm font-semibold text-emerald-700 mt-1">Disponível: {(product.availableQuantity - quantityInCart(product.id)).toLocaleString('pt-BR')} {product.unit}</p>{quantityInCart(product.id) > 0 && <p className="text-xs text-brand-600">No carrinho: {quantityInCart(product.id)} {product.unit}</p>}
            <p className={`mt-2 font-semibold ${product.salePrice === null ? 'text-red-500 text-xs' : 'text-brand-600'}`}>{product.salePrice === null ? 'Preço não cadastrado' : money(product.salePrice)}</p>
          </button>)}
          {locationId && !filteredProducts.length && <p className="col-span-full text-center text-surface-400 py-10">Nenhum produto disponível neste bar</p>}
        </div>
      </section>

      <aside className="card flex min-h-0 flex-col overflow-hidden">
        <div className="card-header flex items-center gap-2"><ShoppingCart size={19}/><h2 className="font-semibold">Carrinho ({cart.length})</h2></div>
        <div className="min-h-[80px] flex-1 divide-y overflow-y-auto">{cart.map((item) => <div key={item.id} className="p-3">
          <div className="flex justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-surface-500">{money(item.unitPrice)} / {item.unit}</p><p className="text-xs text-emerald-600">Saldo no bar: {item.availableQuantity} • após venda: {(item.availableQuantity - item.quantity).toLocaleString('pt-BR')}</p></div><button onClick={() => setCart((current) => current.filter((row) => row.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button></div>
            <div className="flex items-center justify-between mt-3"><div className="flex items-center gap-2"><button className="p-1 border rounded" onClick={() => setQuantity(item.id, item.quantity - quantityStep(item.unit))}><Minus size={14}/></button><input className="w-16 text-center py-1" type="number" min={quantityStep(item.unit)} max={item.availableQuantity} step={quantityStep(item.unit)} value={item.quantity} onChange={(e) => setQuantity(item.id, Number(e.target.value))}/><button className="p-1 border rounded" onClick={() => setQuantity(item.id, item.quantity + quantityStep(item.unit))}><Plus size={14}/></button></div>
            {canOverridePrice ? <input title="Preço unitário" className="w-24 text-right py-1" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => setCart((current) => current.map((row) => row.id === item.id ? {...row, unitPrice: Number(e.target.value)} : row))}/> : <span className="font-semibold">{money(item.quantity * item.unitPrice)}</span>}</div>
        </div>)}</div>
        {!cart.length && <p className="flex flex-1 items-center justify-center p-4 text-center text-surface-400">Carrinho vazio</p>}
        <div className="shrink-0 space-y-2 border-t bg-surface-50 p-3">
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs mb-1">Pagamento</label><select className="w-full" value={paymentMethod} disabled={!!selectedCommand} onChange={(e) => setPaymentMethod(e.target.value)}>{paymentMethods.filter(([value]) => value !== 'COMANDA' || selectedCommand).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="block text-xs mb-1">Desconto</label><input className="w-full" type="number" min="0" max={subtotal} step="0.01" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))}/></div></div>
          <div className="grid grid-cols-2 gap-2"><input className="w-full" placeholder="Cliente (opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)}/><input className="w-full" placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)}/></div>
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-brand-600">{money(total)}</span></div>
          <button className="btn-primary w-full disabled:opacity-50" disabled={saving || !cart.length} onClick={finishSale}>{saving ? 'Processando...' : 'Concluir venda'}</button>
        </div>
      </aside>
    </div>}

    {salesOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-surface-950/50 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSalesOpen(false)}><section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="card-header flex shrink-0 items-center justify-between gap-3"><div><h2 className="font-semibold">Vendas recentes</h2><p className="text-xs text-surface-500">{summary.completedSales} vendas • {money(summary.totalAmount)}</p></div><button className="rounded-lg p-2 text-surface-500 hover:bg-surface-100" title="Fechar" onClick={() => setSalesOpen(false)}><X size={19}/></button></div><div className="min-h-0 overflow-y-auto">
      <div className="divide-y md:hidden">{sales.map((sale) => <div key={sale.id} className="p-4"><div className="flex justify-between"><div><p className="font-semibold">Venda #{sale.number}</p><p className="text-xs text-surface-400">{sale.location.name} · {sale.registeredBy.name}{sale.command && ' · RFID'}</p><PrintStatus status={sale.printJobs?.[0]?.status}/></div><p className="font-semibold">{money(sale.totalAmount)}</p></div><div className="mt-3 flex items-center justify-between text-xs"><span className={sale.status === 'CONCLUIDA' ? 'text-emerald-600' : 'text-red-600'}>{sale.status === 'CONCLUIDA' ? 'Concluída' : 'Estornada'}</span><span className="text-surface-400">{new Date(sale.createdAt).toLocaleString('pt-BR')}</span><span className="flex gap-3"><button disabled={printingSaleId === sale.id || !workstation.bound} title="Reimprimir" onClick={() => void reprintSale(sale)} className="text-brand-600 disabled:opacity-40"><Printer size={16}/></button>{canReverse && sale.status === 'CONCLUIDA' && <button onClick={() => reverseSale(sale)} className="text-red-600"><RotateCcw size={16}/></button>}</span></div></div>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="bg-surface-50 border-b">{['Número','Data','Bar','Operador','Itens','Pagamento','Total','Situação',''].map((heading) => <th key={heading} className="text-left px-4 py-3 text-xs uppercase text-surface-600">{heading}</th>)}</tr></thead>
      <tbody>{sales.map((sale) => <tr key={sale.id} className="border-b border-surface-100"><td className="px-4 py-3 font-semibold">#{sale.number}{sale.command && <span className="ml-1 text-xs text-brand-600">RFID</span>}<PrintStatus status={sale.printJobs?.[0]?.status}/></td><td className="px-4 py-3">{new Date(sale.createdAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3">{sale.location.name}</td><td className="px-4 py-3">{sale.registeredBy.name}</td><td className="px-4 py-3">{sale.items.length}</td><td className="px-4 py-3">{paymentMethods.find(([value]) => value === sale.paymentMethod)?.[1] || sale.paymentMethod}</td><td className="px-4 py-3 font-semibold">{money(sale.totalAmount)}</td><td className="px-4 py-3">{sale.status === 'CONCLUIDA' ? <span className="text-emerald-600">Concluída</span> : <span className="text-red-600">Estornada</span>}</td><td className="px-4 py-3"><span className="flex gap-3"><button disabled={printingSaleId === sale.id || !workstation.bound} title="Reimprimir" className="text-brand-600 disabled:opacity-40" onClick={() => void reprintSale(sale)}><Printer size={16}/></button>{canReverse && sale.status === 'CONCLUIDA' && <button title="Estornar" className="text-red-600" onClick={() => reverseSale(sale)}><RotateCcw size={16}/></button>}</span></td></tr>)}</tbody></table></div>
      {!sales.length && <p className="p-8 text-center text-surface-400">Nenhuma venda registrada</p>}
    </div></section></div>}
  </div>;
}

function PrintStatus({ status }: { status?: string }) {
  if (!status) return null;
  const label: Record<string, string> = { PENDENTE: 'Impressão pendente', PROCESSANDO: 'Imprimindo', IMPRESSO: 'Impresso', FALHOU: 'Falha na impressão', CANCELADO: 'Impressão cancelada' };
  const tone = status === 'IMPRESSO' ? 'text-emerald-600' : status === 'FALHOU' ? 'text-red-600' : 'text-amber-600';
  return <span className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${tone}`}>{status === 'IMPRESSO' && <CheckCircle2 size={11}/>} {label[status] || status}</span>;
}
