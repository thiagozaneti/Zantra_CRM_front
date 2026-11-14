import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileDown, History, Link2, Minus, Plus, Printer, RotateCcw, Search, ShoppingCart, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { hasActionPermission } from '../components/Layout';
import { isDiscreteUnit, quantityStep } from '../lib/quantity';
import { useConfirm } from '../components/ConfirmDialog';
import RFIDCommandPanel, { IdentifiedCommand } from '../components/RFIDCommandPanel';
import { createUuid } from '../lib/uuid';
import { downloadSaleReceipt } from '../lib/saleReceipt';

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
  const { prompt, confirm } = useConfirm();
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
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState('1');
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLSelectElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const waitingForCard = useRef(false);
  const savingRef = useRef(false);
  const pendingFocus = useRef<'search' | 'payment' | 'finish' | null>(null);

  const selectCommand = (command: IdentifiedCommand | null) => {
    setSelectedCommand(command);
    setPaymentMethod(command ? 'COMANDA' : 'PIX');
    setOperationStatus(command ? 'Comanda identificada e pronta para consumo' : '');
  };

  useEffect(() => {
    if (!selectedCommand || !waitingForCard.current) return;
    waitingForCard.current = false;
    if (cart.length && !pendingProduct && !salesOpen) finishRef.current?.focus();
  }, [selectedCommand, cart.length, pendingProduct, salesOpen]);

  useEffect(() => {
    if (pendingProduct) { quantityRef.current?.focus(); quantityRef.current?.select(); }
  }, [pendingProduct]);

  useEffect(() => {
    if (pendingProduct || !pendingFocus.current) return;
    if (pendingFocus.current === 'search') searchRef.current?.focus();
    if (pendingFocus.current === 'payment') paymentRef.current?.focus();
    if (pendingFocus.current === 'finish') finishRef.current?.focus();
    pendingFocus.current = null;
  }, [cart, pendingProduct]);

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
    setCart([]); setProducts([]); setPendingProduct(null); setSearchIndex(null);
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

  const beginProduct = (product: Product) => {
    if (product.salePrice === null) { setError(`Cadastre o preço de venda de ${product.name}`); return; }
    const remaining = Number((product.availableQuantity - quantityInCart(product.id)).toFixed(3));
    if (remaining <= 0) { setError(`Não há mais estoque disponível de ${product.name} neste local`); return; }
    setError(''); setSearchIndex(null);
    setPendingProduct(product);
    setPendingQuantity(String(Math.min(1, remaining)));
  };

  const chooseSearchedProduct = () => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) { setError('Informe o código ou nome do produto.'); return; }
    const exact = filteredProducts.filter((product) => [product.sku, product.barcode, product.name].some((value) => value?.toLocaleLowerCase('pt-BR') === term));
    let product: Product | undefined;
    if (searchIndex !== null) product = filteredProducts[searchIndex];
    else if (exact.length === 1) product = exact[0];
    else if (!exact.length && filteredProducts.length === 1) product = filteredProducts[0];
    if (!product) {
      setError(filteredProducts.length ? 'Há mais de um resultado. Escolha com as setas e pressione Enter.' : 'Nenhum produto encontrado neste local.');
      return;
    }
    beginProduct(product);
  };

  const confirmPendingProduct = (returnToSearch = false) => {
    if (!pendingProduct) return;
    const quantity = Number(pendingQuantity.replace(',', '.'));
    const remaining = Number((pendingProduct.availableQuantity - quantityInCart(pendingProduct.id)).toFixed(3));
    if (!Number.isFinite(quantity) || quantity <= 0 || (isDiscreteUnit(pendingProduct.unit) && !Number.isInteger(quantity)) || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-7) {
      setError(isDiscreteUnit(pendingProduct.unit) ? 'Informe uma quantidade inteira maior que zero.' : 'Informe uma quantidade maior que zero com até três casas decimais.');
      return;
    }
    if (quantity > remaining) { setError(`Estoque insuficiente. Disponível: ${remaining.toLocaleString('pt-BR')} ${pendingProduct.unit}.`); return; }
    const product = pendingProduct;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: Number((item.quantity + quantity).toFixed(3)) } : item);
      return [...current, { ...product, quantity, unitPrice: Number(product.salePrice) }];
    });
    if (returnToSearch) pendingFocus.current = 'search';
    else if (selectedCommand) pendingFocus.current = 'finish';
    else pendingFocus.current = 'payment';
    setPendingProduct(null); setSearch(''); setSearchIndex(null); setError('');
  };

  const addProduct = (product: Product) => {
    if (product.salePrice === null) return setError(`Cadastre o preço de venda de ${product.name}`);
    const available = Number((product.availableQuantity - quantityInCart(product.id)).toFixed(3));
    if (available <= 0) return setError(`Não há mais estoque disponível de ${product.name} neste local`);
    setError('');
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: Number(Math.min(item.availableQuantity, item.quantity + 1).toFixed(3)) } : item);
      return [...current, { ...product, quantity: Math.min(1, product.availableQuantity), unitPrice: Number(product.salePrice) }];
    });
    setSearch('');
  };

  const setQuantity = (id: string, quantity: number) => setCart((current) => current
    .map((item) => item.id === id ? { ...item, quantity: Math.max(0, Math.min(item.availableQuantity, quantity)) } : item)
    .filter((item) => item.quantity > 0));

  const finishSale = async () => {
    if (savingRef.current) return;
    if (pendingProduct) { setError('Confirme ou cancele o produto em edição antes de concluir a venda.'); quantityRef.current?.focus(); return; }
    if (!locationId || !cart.length) return setError('Selecione o bar e adicione ao menos um produto');
    if (discount > subtotal) return setError('O desconto não pode superar o subtotal');
    if (paymentMethod === 'COMANDA' && !selectedCommand) { setError('Identifique a comanda antes de concluir a venda.'); cardInputRef.current?.focus(); return; }
    if (selectedCommand && total > Number(selectedCommand.valorTotal)) return setError(`Saldo insuficiente na comanda. Disponível: ${money(selectedCommand.valorTotal)}`);
    savingRef.current = true;
    setSaving(true); setError(''); setOperationStatus('Registrando venda');
    try {
      const sale = await api.createSale({
        locationId, paymentMethod, discount, customerName: customerName || null, notes: notes || null,
        comandaId: selectedCommand?.comandaId || null, requestId: createUuid(), printReceipt: true,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity, ...(canOverridePrice ? { unitPrice: item.unitPrice } : {}) })),
      });
      showToast('success', `Venda #${sale.number} concluída — ${money(sale.totalAmount)}`);
      setCart([]); setDiscount(0); setCustomerName(''); setNotes('');
      setSelectedCommand(null); setPaymentMethod('PIX'); waitingForCard.current = false;
      if (sale.printWarning) { setOperationStatus(sale.printWarning.message); showToast('warning', sale.printWarning.message); }
      else if (sale.printJob) {
        setOperationStatus(workstation.terminal?.online ? 'Venda concluída e impressão enviada' : 'Venda concluída; impressão aguardando o terminal');
        void watchPrintJob(sale.printJob.id);
      } else setOperationStatus('Venda concluída sem impressão');
      try { setProducts(await api.getSaleProducts(locationId)); } catch { setProducts([]); showToast('warning', 'Venda concluída, mas não foi possível atualizar o estoque. Selecione o local novamente.'); }
      void loadSales();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { savingRef.current = false; setSaving(false); }
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

  const changeLocation = async (nextLocation: string) => {
    if (nextLocation === locationId || saving) return;
    if (cart.length || pendingProduct) {
      const accepted = await confirm({ title: 'Trocar local de venda?', message: 'Os itens da venda atual serão removidos porque o estoque depende do local escolhido.', confirmText: 'Trocar local', type: 'warning' });
      if (!accepted) return;
    }
    setLocationId(nextLocation);
  };

  return <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto" onKeyDown={(event) => {
    if (salesOpen || saving || event.ctrlKey || event.altKey || event.metaKey || !canCreate) return;
    if (event.key === 'Escape' && pendingProduct) { event.preventDefault(); pendingFocus.current = 'search'; setPendingProduct(null); setError(''); return; }
    if (!['F2', 'F4', 'F6'].includes(event.key)) return;
    event.preventDefault();
    if (pendingProduct) { setError('Confirme a quantidade ou pressione Esc para cancelar o item.'); quantityRef.current?.focus(); return; }
    if (event.key === 'F2') searchRef.current?.focus();
    if (event.key === 'F4') {
      if (selectedCommand) finishRef.current?.focus();
      else paymentRef.current?.focus();
    }
    if (event.key === 'F6') {
      if (selectedCommand) { finishRef.current?.focus(); return; }
      waitingForCard.current = true; setPaymentMethod('COMANDA'); cardInputRef.current?.focus();
    }
  }}>
    <div className="flex shrink-0 items-center justify-between gap-3"><div><h1 className="text-xl font-bold text-surface-900">Frente de Vendas</h1><p className={`text-xs ${operationStatus ? 'font-medium text-brand-600' : 'text-surface-500'}`}>{operationStatus || 'Venda, baixa no estoque e emissão automática de comprovante'}</p></div><button className="btn-secondary flex shrink-0 items-center gap-2" onClick={() => setSalesOpen(true)}><History size={16}/>Vendas <span className="rounded-full bg-surface-100 px-1.5 text-xs">{summary.completedSales}</span></button></div>
    {error && <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

    <section className={`shrink-0 rounded-xl border px-3 py-2.5 ${printerReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2.5">{printerReady ? <Wifi size={18} className="text-emerald-600"/> : workstation.bound ? <WifiOff size={18} className="text-amber-600"/> : <Link2 size={18} className="text-amber-600"/>}<div><p className="text-sm font-semibold text-surface-900">{printerReady ? 'Impressora conectada' : workstation.bound ? 'Impressora indisponível' : 'Impressora não vinculada'}</p><p className="text-[11px] text-surface-600">{workstation.bound ? `${workstation.terminal.name} · ${workstation.terminal.activePrinterName || 'sem impressora configurada'} · ${workstation.terminal.online ? 'Agent online' : 'Agent offline'}` : 'Informe o código exibido pelo Agent. O comprovante é solicitado em toda venda.'}</p></div></div>
        {!workstation.bound && <div className="flex w-full gap-2 sm:w-auto"><input className="min-w-0 flex-1 sm:w-48" value={bindingCode} onChange={(event) => setBindingCode(event.target.value.toUpperCase())} placeholder="000-000" maxLength={30}/><button className="btn-primary" disabled={binding || bindingCode.trim().length < 6} onClick={() => void bindWorkstation()}>Vincular</button></div>}
      </div>
      {workstation.bound && locationId && workstation.terminal.locationId !== locationId && <p className="mt-1 text-xs font-medium text-red-700">O terminal pertence a outro local; a venda será concluída e o sistema registrará o aviso de impressão.</p>}
    </section>

    {canCreate && <div className="grid shrink-0 gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
      <RFIDCommandPanel enabled={canCreate} busy={saving} selected={selectedCommand} onSelect={selectCommand} cardInputRef={cardInputRef}/>
      <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-4 py-3 md:flex-col md:items-end md:justify-center">
        <span className="text-sm text-surface-500">Saldo disponível</span>
        <strong className={`text-2xl font-bold tabular-nums ${selectedCommand ? 'text-orange-600' : 'text-surface-400'}`}>{selectedCommand ? money(selectedCommand.valorTotal) : '—'}</strong>
      </div>
    </div>}

    {canCreate && <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:min-h-[410px] xl:grid-cols-[minmax(0,1fr)_290px]">
      <section className="card flex min-h-[380px] flex-col overflow-hidden xl:min-h-0">
        <div className="grid shrink-0 gap-2 border-b border-surface-200 bg-surface-50 p-3 sm:grid-cols-[minmax(170px,0.8fr)_minmax(0,1.5fr)]">
          <div><label htmlFor="sale-location" className="mb-1 block text-xs font-semibold text-surface-600">Local de venda *</label><select id="sale-location" className="w-full" value={locationId} disabled={saving || (user?.role === 'FRENTE_VENDAS' && bars.length === 1)} onChange={(e) => void changeLocation(e.target.value)}><option value="">Selecione...</option>{bars.map((bar) => <option key={bar.id} value={bar.id}>{bar.name}</option>)}</select></div>
          <div><label htmlFor="sale-search" className="mb-1 block text-xs font-semibold text-surface-600">Código ou descrição do produto</label><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"/><input id="sale-search" ref={searchRef} className="w-full pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setSearchIndex(null); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); chooseSearchedProduct(); } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (filteredProducts.length) setSearchIndex((current) => { if (current === null) return event.key === 'ArrowDown' ? 0 : filteredProducts.length - 1; return event.key === 'ArrowDown' ? Math.min(filteredProducts.length - 1, current + 1) : Math.max(0, current - 1); }); } }} placeholder="Nome, SKU ou código de barras" disabled={!locationId || !!pendingProduct}/></div></div>
        </div>
        <p className="shrink-0 px-3 pt-1.5 text-[11px] text-surface-500">F2 buscar · Setas selecionar · Enter confirmar · Shift+Enter adicionar e buscar outro · F4 pagamento · F6 comanda · Esc cancelar item</p>
        {pendingProduct && <div className="flex shrink-0 flex-wrap items-end gap-2 border-b border-brand-200 bg-brand-50 px-3 py-2"><div className="min-w-0 flex-1"><p className="text-xs text-surface-500">Produto selecionado</p><p className="truncate text-sm font-semibold">{pendingProduct.name}</p><p className="text-xs text-surface-500">Disponível: {Number((pendingProduct.availableQuantity - quantityInCart(pendingProduct.id)).toFixed(3)).toLocaleString('pt-BR')} {pendingProduct.unit}</p></div><div><label htmlFor="sale-pending-quantity" className="mb-1 block text-xs font-semibold">Quantidade ({pendingProduct.unit})</label><input id="sale-pending-quantity" ref={quantityRef} type="text" inputMode="decimal" className="w-28" value={pendingQuantity} onChange={(event) => setPendingQuantity(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (!event.repeat) confirmPendingProduct(event.shiftKey); } }}/></div><button type="button" className="btn-primary" onClick={() => confirmPendingProduct()}>Adicionar</button><button type="button" className="btn-secondary" onClick={() => { pendingFocus.current = 'search'; setPendingProduct(null); setError(''); }}>Cancelar</button></div>}
        {locationId && <div className="shrink-0 border-b border-surface-200 px-3 py-2"><p className="mb-1.5 text-xs text-surface-500">Produtos disponíveis: {products.length} · Estoque: {totalUnitsAvailable.toLocaleString('pt-BR')} · Selecione para adicionar</p><div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">{filteredProducts.map((product, index) => <button key={product.id} onClick={() => addProduct(product)} className={`rounded-md border px-2 py-1 text-left text-xs hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 ${index === searchIndex ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-400' : 'border-surface-200 bg-white'}`} disabled={!!pendingProduct || product.salePrice === null || quantityInCart(product.id) >= product.availableQuantity}><span className="font-medium">{product.name}</span> · {product.salePrice === null ? 'Preço não cadastrado' : money(product.salePrice)} <span className="text-surface-500">· {Number(product.availableQuantity - quantityInCart(product.id)).toLocaleString('pt-BR')} {product.unit}</span></button>)}{!filteredProducts.length && <p className="py-2 text-xs text-surface-500">Nenhum produto encontrado neste local.</p>}</div></div>}
        <div className="flex shrink-0 items-center gap-2 border-b border-surface-200 px-3 py-2"><ShoppingCart size={16}/><h2 className="text-sm font-semibold">Itens da venda ({cart.length})</h2></div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[650px] text-left text-sm"><thead className="sticky top-0 z-10 bg-surface-100 text-xs uppercase text-surface-600"><tr><th className="px-3 py-2">Código</th><th className="px-3 py-2">Descrição</th><th className="px-3 py-2">Quantidade</th><th className="px-3 py-2 text-right">Unitário</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2"><span className="sr-only">Remover</span></th></tr></thead>
            <tbody>{cart.map((item) => <tr key={item.id} className="border-b border-surface-100"><td className="px-3 py-2 text-xs text-surface-500">{item.sku || item.barcode || '—'}</td><td className="px-3 py-2"><p className="font-medium">{item.name}</p><p className="text-xs text-surface-500">Estoque: {Number(item.availableQuantity).toLocaleString('pt-BR')} {item.unit} · após venda: {Number(item.availableQuantity - item.quantity).toLocaleString('pt-BR')} {item.unit}</p></td><td className="px-3 py-2"><div className="flex items-center gap-1"><button type="button" aria-label={`Diminuir quantidade de ${item.name}`} className="rounded border p-1" onClick={() => setQuantity(item.id, item.quantity - quantityStep(item.unit))}><Minus size={13}/></button><input aria-label={`Quantidade de ${item.name}`} className="w-16 py-1 text-center" type="number" min={quantityStep(item.unit)} max={item.availableQuantity} step={quantityStep(item.unit)} value={item.quantity} onChange={(e) => setQuantity(item.id, Number(e.target.value))}/><button type="button" aria-label={`Aumentar quantidade de ${item.name}`} className="rounded border p-1" onClick={() => setQuantity(item.id, item.quantity + quantityStep(item.unit))}><Plus size={13}/></button></div></td><td className="px-3 py-2 text-right">{canOverridePrice ? <input aria-label={`Preço unitário de ${item.name}`} className="w-24 py-1 text-right" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => setCart((current) => current.map((row) => row.id === item.id ? {...row, unitPrice: Number(e.target.value)} : row))}/> : money(item.unitPrice)}</td><td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{money(item.quantity * item.unitPrice)}</td><td className="px-3 py-2"><button type="button" aria-label={`Remover ${item.name}`} onClick={() => setCart((current) => current.filter((row) => row.id !== item.id))} className="text-red-500"><Trash2 size={16}/></button></td></tr>)}</tbody>
          </table>
          {!cart.length && <p className="p-8 text-center text-sm text-surface-400">Nenhum item na venda. Selecione um produto acima.</p>}
        </div>
      </section>

      <aside className="card flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-surface-200 px-4 py-2.5"><h2 className="font-semibold">Pagamento</h2></div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div><label htmlFor="sale-payment" className="mb-1 block text-xs font-medium">Forma de pagamento</label><select id="sale-payment" ref={paymentRef} className="w-full" value={paymentMethod} disabled={!!selectedCommand} onChange={(event) => { const method = event.target.value; setPaymentMethod(method); waitingForCard.current = method === 'COMANDA'; if (method === 'COMANDA') cardInputRef.current?.focus(); }} onKeyDown={(event) => { if (event.key !== 'Enter') return; event.preventDefault(); if (paymentMethod === 'COMANDA' && !selectedCommand) { waitingForCard.current = true; cardInputRef.current?.focus(); } else finishRef.current?.focus(); }}>{paymentMethods.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label htmlFor="sale-discount" className="mb-1 block text-xs font-medium">Desconto</label><input id="sale-discount" className="w-full" type="number" min="0" max={subtotal} step="0.01" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))}/></div>
          <input aria-label="Cliente (opcional)" className="w-full" placeholder="Cliente (opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)}/>
          <input aria-label="Observações" className="w-full" placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)}/>
          <div className="mt-auto border-t border-surface-200 pt-3"><div className="flex justify-between text-sm text-surface-500"><span>Subtotal dos produtos</span><span>{money(subtotal)}</span></div><div className="mt-1 flex justify-between text-sm text-surface-500"><span>Desconto</span><span>{money(discount)}</span></div><p className="mt-4 text-sm text-surface-600">Total da venda</p><p className="text-3xl font-bold tabular-nums text-surface-900">{money(total)}</p><button ref={finishRef} className="btn-primary mt-3 w-full disabled:opacity-50" disabled={saving || !cart.length || !!pendingProduct || (paymentMethod === 'COMANDA' && !selectedCommand)} onClick={finishSale}>{saving ? 'Processando...' : 'Concluir venda'}</button></div>
        </div>
      </aside>
    </div>}

    {salesOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-surface-950/50 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSalesOpen(false)}><section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="card-header flex shrink-0 items-center justify-between gap-3"><div><h2 className="font-semibold">Vendas recentes</h2><p className="text-xs text-surface-500">{summary.completedSales} vendas • {money(summary.totalAmount)}</p></div><button className="rounded-lg p-2 text-surface-500 hover:bg-surface-100" title="Fechar" onClick={() => setSalesOpen(false)}><X size={19}/></button></div><div className="min-h-0 overflow-y-auto">
      <div className="divide-y md:hidden">{sales.map((sale) => <div key={sale.id} className="p-4"><div className="flex justify-between"><div><p className="font-semibold">Venda #{sale.number}</p><p className="text-xs text-surface-400">{sale.location.name} · {sale.registeredBy.name}{sale.command && ' · RFID'}</p><PrintStatus status={sale.printJobs?.[0]?.status}/></div><p className="font-semibold">{money(sale.totalAmount)}</p></div><div className="mt-3 flex items-center justify-between text-xs"><span className={sale.status === 'CONCLUIDA' ? 'text-emerald-600' : 'text-red-600'}>{sale.status === 'CONCLUIDA' ? 'Concluída' : 'Estornada'}</span><span className="text-surface-400">{new Date(sale.createdAt).toLocaleString('pt-BR')}</span><SaleActions sale={sale} canReverse={canReverse} printing={printingSaleId === sale.id} bound={workstation.bound} onReprint={reprintSale} onReverse={reverseSale}/></div></div>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="bg-surface-50 border-b">{['Número','Data','Bar','Operador','Itens','Pagamento','Total','Situação',''].map((heading) => <th key={heading} className="text-left px-4 py-3 text-xs uppercase text-surface-600">{heading}</th>)}</tr></thead>
      <tbody>{sales.map((sale) => <tr key={sale.id} className="border-b border-surface-100"><td className="px-4 py-3 font-semibold">#{sale.number}{sale.command && <span className="ml-1 text-xs text-brand-600">RFID</span>}<PrintStatus status={sale.printJobs?.[0]?.status}/></td><td className="px-4 py-3">{new Date(sale.createdAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3">{sale.location.name}</td><td className="px-4 py-3">{sale.registeredBy.name}</td><td className="px-4 py-3">{sale.items.length}</td><td className="px-4 py-3">{paymentMethods.find(([value]) => value === sale.paymentMethod)?.[1] || sale.paymentMethod}</td><td className="px-4 py-3 font-semibold">{money(sale.totalAmount)}</td><td className="px-4 py-3">{sale.status === 'CONCLUIDA' ? <span className="text-emerald-600">Concluída</span> : <span className="text-red-600">Estornada</span>}</td><td className="px-4 py-3"><SaleActions sale={sale} canReverse={canReverse} printing={printingSaleId === sale.id} bound={workstation.bound} onReprint={reprintSale} onReverse={reverseSale}/></td></tr>)}</tbody></table></div>
      {!sales.length && <p className="p-8 text-center text-surface-400">Nenhuma venda registrada</p>}
    </div></section></div>}
  </div>;
}

function SaleActions({ sale, canReverse, printing, bound, onReprint, onReverse }: { sale: any; canReverse: boolean; printing: boolean; bound: boolean; onReprint: (sale: any) => Promise<void>; onReverse: (sale: any) => Promise<void> }) {
  return <span className="flex gap-3">
    <button type="button" title="Baixar comprovante em PDF" aria-label={`Baixar PDF da venda ${sale.number}`} className="text-brand-600" onClick={() => downloadSaleReceipt(sale)}><FileDown size={16}/></button>
    <button type="button" disabled={printing || !bound} title="Reimprimir" aria-label={`Reimprimir venda ${sale.number}`} className="text-brand-600 disabled:opacity-40" onClick={() => void onReprint(sale)}><Printer size={16}/></button>
    {canReverse && sale.status === 'CONCLUIDA' && <button type="button" title="Estornar" aria-label={`Estornar venda ${sale.number}`} className="text-red-600" onClick={() => void onReverse(sale)}><RotateCcw size={16}/></button>}
  </span>;
}

function PrintStatus({ status }: { status?: string }) {
  if (!status) return null;
  const label: Record<string, string> = { PENDENTE: 'Impressão pendente', PROCESSANDO: 'Imprimindo', IMPRESSO: 'Impresso', FALHOU: 'Falha na impressão', CANCELADO: 'Impressão cancelada' };
  const tone = status === 'IMPRESSO' ? 'text-emerald-600' : status === 'FALHOU' ? 'text-red-600' : 'text-amber-600';
  return <span className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${tone}`}>{status === 'IMPRESSO' && <CheckCircle2 size={11}/>} {label[status] || status}</span>;
}
