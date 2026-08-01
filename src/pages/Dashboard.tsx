import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowDownToLine, ArrowLeftRight, Ban, Box, CircleDollarSign,
  Download, Package, RefreshCw, ShoppingCart, Utensils, Warehouse,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BarChart from '../components/BarChart';
import { hasActionPermission } from '../components/Layout';

const money = (value: number | string) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const canBackup = hasActionPermission('backup:export');

  const loadData = async () => {
    try { setLoading(true); setData(await api.getDashboard()); }
    catch (error) { console.error('Dashboard error:', error); }
    finally { setLoading(false); }
  };

  const exportBackup = async () => {
    try {
      setBackingUp(true);
      const blob = await api.exportBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `zantra-backup-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
      URL.revokeObjectURL(url);
    } finally { setBackingUp(false); }
  };

  useEffect(() => { loadData(); }, []);
  if (loading && !data) return <Loading/>;
  if (!data) return <div className="border border-surface-200 bg-white p-8 text-center text-surface-500">Não foi possível carregar o dashboard.</div>;

  const metrics = [
    { label: 'Produtos ativos', value: data.totalActiveProducts, detail: `${data.totalProducts} cadastrados`, icon: Package, color: 'text-blue-600', bar: 'bg-blue-500' },
    { label: 'Entradas hoje', value: data.todayMovements.entries, detail: 'recebimentos', icon: ArrowDownToLine, color: 'text-emerald-600', bar: 'bg-emerald-500' },
    { label: 'Transferências', value: data.todayMovements.transfers, detail: `${data.pendingTransfers || 0} pendentes`, icon: ArrowLeftRight, color: 'text-violet-600', bar: 'bg-violet-500' },
    { label: 'Vendas hoje', value: data.todaySales || 0, detail: 'vendas concluídas', icon: ShoppingCart, color: 'text-pink-600', bar: 'bg-pink-500' },
    { label: 'Faturamento', value: money(data.todayRevenue), detail: 'resultado de hoje', icon: CircleDollarSign, color: 'text-emerald-700', bar: 'bg-emerald-600' },
    { label: 'Estoque baixo', value: data.lowStockItems.length, detail: 'itens em atenção', icon: AlertTriangle, color: 'text-red-600', bar: 'bg-red-500' },
    { label: 'Consumo hoje', value: data.management?.consumptionToday?._count || 0, detail: `${data.management?.consumptionToday?._sum?.quantity || 0} em quantidade`, icon: Utensils, color: 'text-orange-600', bar: 'bg-orange-500' },
    { label: 'Perdas/avarias', value: data.management?.lossesToday?._count || 0, detail: `${data.management?.lossesToday?._sum?.quantity || 0} em quantidade`, icon: Ban, color: 'text-red-700', bar: 'bg-red-700' },
    { label: 'Valor em estoque', value: money(data.management?.inventoryValue || 0), detail: 'pelo custo médio', icon: CircleDollarSign, color: 'text-cyan-700', bar: 'bg-cyan-600' },
  ];

  const coldRooms = Object.entries(data.coldRoomStock || {}).map(([name, value]) => ({ label: name.replace('Câmara ', '').substring(0, 12), value: value as number, color: 'bg-blue-500' }));
  const bars = Object.entries(data.barStock || {}).map(([name, value]) => ({ label: name.replace('Bar ', '').substring(0, 12), value: value as number, color: 'bg-amber-500' }));
  const skuByLocation = Object.entries(data.management?.stockByLocation || {}).map(([name, value]) => ({ label: name.substring(0, 12), value: value as number, color: 'bg-violet-500' }));

  return <div className="mx-auto max-w-[1440px] space-y-6 pb-4">
    <header className="flex flex-col gap-4 border-b border-surface-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Olá, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-surface-500">Visão geral da operação e dos indicadores de hoje.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canBackup && <button onClick={exportBackup} disabled={backingUp} className="btn-secondary flex items-center gap-2 disabled:opacity-50"><Download size={15}/>{backingUp ? 'Gerando...' : 'Backup CSV'}</button>}
        <button onClick={loadData} disabled={loading} className="btn-secondary flex items-center gap-2 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Atualizar</button>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-9">
      {metrics.map((metric) => <div key={metric.label} className="relative min-w-0 overflow-hidden rounded-lg border border-surface-200 bg-white px-4 py-3.5">
        <span className={`absolute inset-x-0 top-0 h-0.5 ${metric.bar}`}/>
        <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-medium text-surface-500">{metric.label}</p><metric.icon size={15} className={`shrink-0 ${metric.color}`}/></div>
        <p className="mt-2 truncate text-xl font-semibold tabular-nums text-surface-900">{metric.value}</p>
        <p className="mt-1 truncate text-[11px] text-surface-400">{metric.detail}</p>
      </div>)}
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
      <Panel title="Faturamento diário" subtitle="Últimos 7 dias">
        <BarChart data={(data.management?.salesByDay || []).map((day: any) => ({ label: day.label, value: day.total, color: 'bg-brand-500' }))}/>
      </Panel>
      <Panel title="Produtos mais vendidos" subtitle="Últimos 7 dias">
        <div className="divide-y divide-surface-100">
          {(data.management?.topProducts || []).map((product: any, index: number) => <div key={product.name} className="flex items-center gap-3 py-2.5 first:pt-0">
            <span className="w-5 text-xs tabular-nums text-surface-400">{String(index + 1).padStart(2, '0')}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-surface-700">{product.name}</span>
            <span className="text-sm font-semibold tabular-nums text-surface-900">{product.quantity.toLocaleString('pt-BR')} {product.unit}</span>
          </div>)}
          {!(data.management?.topProducts || []).length && <Empty text="Nenhuma venda no período"/>}
        </div>
      </Panel>
    </section>

    <Panel title="Estoque por local" subtitle="Distribuição atual">
      <div className="grid gap-6 md:grid-cols-3">
        <StockGroup title="Câmaras frias" icon={Warehouse} data={coldRooms}/>
        <StockGroup title="Bares" icon={Box} data={bars}/>
        <StockGroup title="SKUs por local" icon={Package} data={skuByLocation}/>
      </div>
    </Panel>

    <section>
      <div className="mb-3"><h2 className="text-base font-semibold text-surface-900">Atividade recente</h2><p className="text-xs text-surface-500">Últimas movimentações registradas no sistema</p></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityPanel title="Últimas entradas" icon={ArrowDownToLine} empty="Nenhuma entrada registrada">
          {data.recentEntries.map((entry: any) => <ActivityRow key={entry.id} title={entry.product.name} subtitle={entry.location.name} value={`${entry.quantity} ${entry.unit}`} date={dateTime(entry.createdAt)}/>) }
        </ActivityPanel>
        <ActivityPanel title="Últimas transferências" icon={ArrowLeftRight} empty="Nenhuma transferência registrada">
          {data.recentTransfers.map((transfer: any) => <ActivityRow key={transfer.id} title={transfer.product.name} subtitle={`${transfer.origin.name} → ${transfer.destination.name}`} value={transfer.quantity} date={dateTime(transfer.createdAt)}/>) }
        </ActivityPanel>
        <ActivityPanel title="Últimas vendas" icon={ShoppingCart} empty="Nenhuma venda registrada">
          {(data.recentSales || []).map((sale: any) => <ActivityRow key={sale.id} title={`Venda #${sale.number}`} subtitle={`${sale.location.name} · ${sale._count.items} item(ns)`} value={money(sale.totalAmount)} date={dateTime(sale.createdAt)} danger={sale.status === 'REVERSED'}/>) }
        </ActivityPanel>
        <ActivityPanel title="Estoque baixo" icon={AlertTriangle} empty="Nenhum produto em alerta">
          {data.lowStockItems.slice(0, 5).map((item: any) => <ActivityRow key={item.id} title={item.product.name} subtitle={item.location.name} value={`${item.quantity} ${item.product.unit}`} date={`Mín. ${item.effectiveMinStock ?? item.product.minStock}`} danger/>) }
        </ActivityPanel>
      </div>
    </section>
  </div>;
}

function Panel({ title, subtitle, children }: any) {
  return <div className="rounded-lg border border-surface-200 bg-white p-4 lg:p-5"><div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="text-sm font-semibold text-surface-900">{title}</h2><span className="text-[11px] text-surface-400">{subtitle}</span></div>{children}</div>;
}

function StockGroup({ title, icon: Icon, data }: any) {
  return <div className="min-w-0 border-t border-surface-100 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0 first:border-l-0 first:pl-0"><div className="mb-3 flex items-center gap-2 text-xs font-medium text-surface-600"><Icon size={14}/>{title}</div>{data.length ? <BarChart data={data}/> : <Empty text="Sem estoque registrado"/>}</div>;
}

function ActivityPanel({ title, icon: Icon, empty, children }: any) {
  const items = Array.isArray(children) ? children : children ? [children] : [];
  return <div className="overflow-hidden rounded-lg border border-surface-200 bg-white"><div className="flex items-center gap-2 border-b border-surface-100 px-4 py-3"><Icon size={15} className="text-surface-500"/><h3 className="text-sm font-semibold text-surface-800">{title}</h3></div><div className="px-4">{items.length ? items : <Empty text={empty}/>}</div></div>;
}

function ActivityRow({ title, subtitle, value, date, danger = false }: any) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-surface-100 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-surface-800">{title}</p><p className="mt-0.5 truncate text-xs text-surface-400">{subtitle}</p></div><div className="text-right"><p className={`text-xs font-semibold tabular-nums ${danger ? 'text-red-600' : 'text-surface-700'}`}>{value}</p><p className="mt-0.5 text-[10px] text-surface-400">{date}</p></div></div>;
}

function Empty({ text }: { text: string }) { return <p className="flex h-24 items-center justify-center text-center text-xs text-surface-400">{text}</p>; }
function Loading() { return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-200 border-t-brand-600"/></div>; }
