import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Package, Warehouse, AlertTriangle, ArrowDownToLine, ArrowLeftRight } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
  if (!data) return <div className="text-zantra-400">Erro ao carregar dados</div>;

  const cards = [
    { label: 'Produtos Ativos', value: data.totalActiveProducts, icon: Package, color: 'bg-zantra-600' },
    { label: 'Entradas Hoje', value: data.todayMovements.entries, icon: ArrowDownToLine, color: 'bg-green-600' },
    { label: 'Transferências Hoje', value: data.todayMovements.transfers, icon: ArrowLeftRight, color: 'bg-yellow-600' },
    { label: 'Alertas de Estoque', value: data.lowStockItems.length, icon: AlertTriangle, color: 'bg-red-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-zantra-400 text-sm">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stock by location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
          <h2 className="text-lg font-semibold text-white mb-4">Estoque por Câmara Fria</h2>
          {Object.entries(data.coldRoomStock).length === 0 ? (
            <p className="text-zantra-400 text-sm">Nenhum estoque registrado</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.coldRoomStock).map(([name, qty]) => (
                <div key={name} className="flex justify-between items-center py-2 border-b border-zantra-700">
                  <span className="text-zantra-300">{name}</span>
                  <span className="text-white font-medium">{qty as number} itens</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
          <h2 className="text-lg font-semibold text-white mb-4">Estoque por Bar</h2>
          {Object.entries(data.barStock).length === 0 ? (
            <p className="text-zantra-400 text-sm">Nenhum estoque registrado</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.barStock).map(([name, qty]) => (
                <div key={name} className="flex justify-between items-center py-2 border-b border-zantra-700">
                  <span className="text-zantra-300">{name}</span>
                  <span className="text-white font-medium">{qty as number} itens</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
          <h2 className="text-lg font-semibold text-white mb-4">Últimas Entradas</h2>
          {data.recentEntries.length === 0 ? (
            <p className="text-zantra-400 text-sm">Nenhuma entrada registrada</p>
          ) : (
            <div className="space-y-2">
              {data.recentEntries.map((entry: any) => (
                <div key={entry.id} className="flex justify-between items-center py-2 border-b border-zantra-700 text-sm">
                  <div>
                    <p className="text-white">{entry.product.name}</p>
                    <p className="text-zantra-400">{entry.location.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{entry.quantity} {entry.unit}</p>
                    <p className="text-zantra-400">{new Date(entry.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
          <h2 className="text-lg font-semibold text-white mb-4">Últimas Transferências</h2>
          {data.recentTransfers.length === 0 ? (
            <p className="text-zantra-400 text-sm">Nenhuma transferência registrada</p>
          ) : (
            <div className="space-y-2">
              {data.recentTransfers.map((transfer: any) => (
                <div key={transfer.id} className="flex justify-between items-center py-2 border-b border-zantra-700 text-sm">
                  <div>
                    <p className="text-white">{transfer.product.name}</p>
                    <p className="text-zantra-400">{transfer.origin.name} → {transfer.destination.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{transfer.quantity}</p>
                    <p className="text-zantra-400">{new Date(transfer.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock alerts */}
      {data.lowStockItems.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} /> Produtos com Estoque Baixo
          </h2>
          <div className="space-y-2">
            {data.lowStockItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-red-500/20 text-sm">
                <div>
                  <p className="text-white">{item.product.name}</p>
                  <p className="text-zantra-400">{item.location.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-medium">{item.quantity} {item.product.unit}</p>
                  <p className="text-zantra-400">Mín: {item.product.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zantra-500"></div>
    </div>
  );
}
