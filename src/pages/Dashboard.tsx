import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Package, Warehouse, AlertTriangle, ArrowDownToLine, ArrowLeftRight, TrendingUp } from 'lucide-react';
import BarChart from '../components/BarChart';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const result = await api.getDashboard();
      setData(result);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!data) return <div className="text-surface-500">Erro ao carregar dados</div>;

  const statCards = [
    { label: 'Produtos Ativos', value: data.totalActiveProducts, icon: Package, color: 'bg-brand-500' },
    { label: 'Entradas Hoje', value: data.todayMovements.entries, icon: ArrowDownToLine, color: 'bg-emerald-500' },
    { label: 'Transferências Hoje', value: data.todayMovements.transfers, icon: ArrowLeftRight, color: 'bg-amber-500' },
    { label: 'Alertas Estoque', value: data.lowStockItems.length, icon: AlertTriangle, color: 'bg-red-500' },
  ];

  // Prepare chart data
  const coldRoomChartData = Object.entries(data.coldRoomStock).map(([name, qty]) => ({
    label: name.replace('Câmara ', '').substring(0, 8),
    value: qty as number,
    color: 'bg-brand-500',
  }));

  const barChartData = Object.entries(data.barStock).map(([name, qty]) => ({
    label: name.replace('Bar ', '').substring(0, 8),
    value: qty as number,
    color: 'bg-amber-500',
  }));

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Page header */}
      <div className="fade-in">
        <h1 className="text-xl lg:text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-surface-500 mt-1 text-sm">Visão geral do sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((card, index) => (
          <div key={card.label} className={`card p-3 lg:p-5 slide-up stagger-${index + 1}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-surface-500">{card.label}</p>
                <p className="text-2xl lg:text-3xl font-bold text-surface-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-2 lg:p-2.5 rounded-lg`}>
                <card.icon size={18} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {coldRoomChartData.length > 0 && (
          <div className="card fade-in">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-surface-900 text-sm lg:text-base">Estoque por Câmara Fria</h2>
              <TrendingUp size={16} className="text-surface-400" />
            </div>
            <div className="card-body">
              <BarChart data={coldRoomChartData} />
            </div>
          </div>
        )}

        {barChartData.length > 0 && (
          <div className="card fade-in">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-surface-900 text-sm lg:text-base">Estoque por Bar</h2>
              <TrendingUp size={16} className="text-surface-400" />
            </div>
            <div className="card-body">
              <BarChart data={barChartData} />
            </div>
          </div>
        )}
      </div>

      {/* Stock by location - list view for mobile */}
      {coldRoomChartData.length === 0 && barChartData.length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card fade-in">
            <div className="card-header">
              <h2 className="font-semibold text-surface-900 text-sm lg:text-base">Estoque por Câmara Fria</h2>
            </div>
            <div className="card-body">
              <p className="text-surface-400 text-sm py-4 text-center">Nenhum estoque registrado</p>
            </div>
          </div>
          <div className="card fade-in">
            <div className="card-header">
              <h2 className="font-semibold text-surface-900 text-sm lg:text-base">Estoque por Bar</h2>
            </div>
            <div className="card-body">
              <p className="text-surface-400 text-sm py-4 text-center">Nenhum estoque registrado</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card slide-up">
          <div className="card-header">
            <h2 className="font-semibold text-surface-900 text-sm lg:text-base">Últimas Entradas</h2>
          </div>
          <div className="card-body">
            {data.recentEntries.length === 0 ? (
              <p className="text-surface-400 text-sm py-4 text-center">Nenhuma entrada registrada</p>
            ) : (
              <div className="space-y-3">
                {data.recentEntries.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <TrendingUp size={16} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-900 truncate">{entry.product.name}</p>
                        <p className="text-xs text-surface-500">{entry.location.name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-surface-900">{entry.quantity} {entry.unit}</p>
                      <p className="text-xs text-surface-400">{new Date(entry.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card slide-up">
          <div className="card-header">
            <h2 className="font-semibold text-surface-900 text-sm lg:text-base">Últimas Transferências</h2>
          </div>
          <div className="card-body">
            {data.recentTransfers.length === 0 ? (
              <p className="text-surface-400 text-sm py-4 text-center">Nenhuma transferência registrada</p>
            ) : (
              <div className="space-y-3">
                {data.recentTransfers.map((transfer: any) => (
                  <div key={transfer.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <ArrowLeftRight size={16} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-900 truncate">{transfer.product.name}</p>
                        <p className="text-xs text-surface-500">{transfer.origin.name} → {transfer.destination.name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-surface-900">{transfer.quantity}</p>
                      <p className="text-xs text-surface-400">{new Date(transfer.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      {data.lowStockItems.length > 0 && (
        <div className="card border-red-200 bg-red-50 slide-up">
          <div className="px-4 py-3 border-b border-red-200 bg-red-100 rounded-t-xl">
            <h2 className="font-semibold text-red-800 flex items-center gap-2 text-sm">
              <AlertTriangle size={16} />
              Produtos com Estoque Baixo
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {data.lowStockItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-red-200 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-red-900">{item.product.name}</p>
                    <p className="text-xs text-red-600">{item.location.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">{item.quantity} {item.product.unit}</p>
                    <p className="text-xs text-red-500">Mín: {item.product.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-surface-200 border-t-brand-600"></div>
    </div>
  );
}
