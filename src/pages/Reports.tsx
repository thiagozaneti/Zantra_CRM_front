import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { FileText, Download } from 'lucide-react';

const reportTypes = [
  { id: 'entries', label: 'Entradas', icon: '📥' },
  { id: 'transfers', label: 'Transferências', icon: '🔄' },
  { id: 'stock', label: 'Estoque Atual', icon: '📦' },
  { id: 'product-history', label: 'Histórico de Produto', icon: '📋' },
  { id: 'employee-movements', label: 'Movimentações por Funcionário', icon: '👤' },
  { id: 'adjustments', label: 'Divergências e Ajustes', icon: '⚙️' },
  { id: 'consumption', label: 'Consumo por Bar', icon: '🍺' },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('entries');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => { loadRefs(); }, []);

  const loadRefs = async () => {
    try {
      const [prods, locs, usrs] = await Promise.all([
        api.getProducts('active=true&limit=100'),
        api.getLocations(),
        api.getUsers(),
      ]);
      setProducts(prods.data);
      setLocations(locs);
      setUsers(usrs);
    } catch (err) { console.error(err); }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (productId) params.set('productId', productId);
      if (locationId) params.set('locationId', locationId);
      if (userId) params.set('userId', userId);
      if (selectedReport === 'employee-movements') params.set('userId', userId);

      const result = await api.getReport(selectedReport, params.toString());
      setData(Array.isArray(result) ? result : []);
    } catch (err: any) { console.error(err); setData([]); }
    finally { setLoading(false); }
  };

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (productId) params.set('productId', productId);
      if (locationId) params.set('locationId', locationId);
      if (userId) params.set('userId', userId);
      params.set('format', 'csv');

      const blob = await api.getReport(selectedReport, params.toString());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { alert(err.message); }
  };

  const renderTable = () => {
    if (data.length === 0) return <div className="text-center py-8 text-zantra-400">Nenhum dado encontrado. Clique em "Carregar" para buscar.</div>;

    switch (selectedReport) {
      case 'entries':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zantra-700">
              <th className="text-left px-4 py-3 text-zantra-400">Data</th>
              <th className="text-left px-4 py-3 text-zantra-400">Produto</th>
              <th className="text-left px-4 py-3 text-zantra-400">Qtd</th>
              <th className="text-left px-4 py-3 text-zantra-400">Câmara</th>
              <th className="text-left px-4 py-3 text-zantra-400">Fornecedor</th>
              <th className="text-left px-4 py-3 text-zantra-400">NF</th>
              <th className="text-left px-4 py-3 text-zantra-400">Responsável</th>
            </tr></thead>
            <tbody>{data.map((e: any) => (
              <tr key={e.id} className="border-b border-zantra-700/50">
                <td className="px-4 py-2 text-zantra-300">{new Date(e.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-2 text-white">{e.product?.name}</td>
                <td className="px-4 py-2 text-white">{e.quantity} {e.unit}</td>
                <td className="px-4 py-2 text-zantra-300">{e.location?.name}</td>
                <td className="px-4 py-2 text-zantra-300">{e.supplier || '-'}</td>
                <td className="px-4 py-2 text-zantra-300">{e.invoiceNumber || '-'}</td>
                <td className="px-4 py-2 text-zantra-300">{e.receivedBy?.name}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'transfers':
      case 'consumption':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zantra-700">
              <th className="text-left px-4 py-3 text-zantra-400">Data</th>
              <th className="text-left px-4 py-3 text-zantra-400">Produto</th>
              <th className="text-left px-4 py-3 text-zantra-400">Qtd</th>
              <th className="text-left px-4 py-3 text-zantra-400">Origem</th>
              <th className="text-left px-4 py-3 text-zantra-400">Destino</th>
              <th className="text-left px-4 py-3 text-zantra-400">Retirado por</th>
              <th className="text-left px-4 py-3 text-zantra-400">Recebido por</th>
            </tr></thead>
            <tbody>{data.map((t: any) => (
              <tr key={t.id} className="border-b border-zantra-700/50">
                <td className="px-4 py-2 text-zantra-300">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-2 text-white">{t.product?.name}</td>
                <td className="px-4 py-2 text-white">{t.quantity}</td>
                <td className="px-4 py-2 text-zantra-300">{t.origin?.name}</td>
                <td className="px-4 py-2 text-zantra-300">{t.destination?.name}</td>
                <td className="px-4 py-2 text-zantra-300">{t.withdrawnBy?.name}</td>
                <td className="px-4 py-2 text-zantra-300">{t.receivedBy?.name}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case 'stock':
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zantra-700">
              <th className="text-left px-4 py-3 text-zantra-400">Produto</th>
              <th className="text-left px-4 py-3 text-zantra-400">SKU</th>
              <th className="text-left px-4 py-3 text-zantra-400">Categoria</th>
              <th className="text-left px-4 py-3 text-zantra-400">Local</th>
              <th className="text-left px-4 py-3 text-zantra-400">Qtd</th>
              <th className="text-left px-4 py-3 text-zantra-400">Mín</th>
            </tr></thead>
            <tbody>{data.map((s: any) => (
              <tr key={s.id} className="border-b border-zantra-700/50">
                <td className="px-4 py-2 text-white">{s.product?.name}</td>
                <td className="px-4 py-2 text-zantra-300">{s.product?.sku || '-'}</td>
                <td className="px-4 py-2 text-zantra-300">{s.product?.category || '-'}</td>
                <td className="px-4 py-2 text-zantra-300">{s.location?.name}</td>
                <td className="px-4 py-2 text-white">{s.quantity}</td>
                <td className="px-4 py-2 text-zantra-300">{s.product?.minStock}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      default:
        return (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zantra-700">
              <th className="text-left px-4 py-3 text-zantra-400">Data</th>
              <th className="text-left px-4 py-3 text-zantra-400">Usuário</th>
              <th className="text-left px-4 py-3 text-zantra-400">Operação</th>
              <th className="text-left px-4 py-3 text-zantra-400">Produto</th>
              <th className="text-left px-4 py-3 text-zantra-400">Qtd Anterior</th>
              <th className="text-left px-4 py-3 text-zantra-400">Movimentado</th>
              <th className="text-left px-4 py-3 text-zantra-400">Resultado</th>
              <th className="text-left px-4 py-3 text-zantra-400">Notas</th>
            </tr></thead>
            <tbody>{data.map((l: any) => (
              <tr key={l.id} className="border-b border-zantra-700/50">
                <td className="px-4 py-2 text-zantra-300">{new Date(l.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-2 text-white">{l.user?.name}</td>
                <td className="px-4 py-2 text-zantra-300">{l.operationType}</td>
                <td className="px-4 py-2 text-white">{l.product?.name || '-'}</td>
                <td className="px-4 py-2 text-zantra-300">{l.quantityBefore || 0}</td>
                <td className="px-4 py-2 text-white">{l.quantityMoved}</td>
                <td className="px-4 py-2 text-white">{l.quantityAfter}</td>
                <td className="px-4 py-2 text-zantra-300">{l.notes || '-'}</td>
              </tr>
            ))}</tbody>
          </table>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Relatórios</h1>

      {/* Report type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {reportTypes.map((r) => (
          <button key={r.id} onClick={() => { setSelectedReport(r.id); setData([]); }}
            className={`p-3 rounded-xl border text-sm text-center transition-colors ${
              selectedReport === r.id ? 'bg-zantra-600 border-zantra-500 text-white' : 'bg-zantra-800 border-zantra-700 text-zantra-400 hover:bg-zantra-700'
            }`}>
            <div className="text-lg mb-1">{r.icon}</div>
            <div>{r.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div><label className="block text-xs text-zantra-400 mb-1">Data Início</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-sm" /></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Data Fim</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full text-sm" /></div>
          {(selectedReport === 'entries' || selectedReport === 'product-history' || selectedReport === 'stock' || selectedReport === 'consumption') && (
            <div><label className="block text-xs text-zantra-400 mb-1">Produto</label><select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full text-sm"><option value="">Todos</option>{products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          )}
          {(selectedReport === 'entries' || selectedReport === 'stock' || selectedReport === 'adjustments' || selectedReport === 'consumption') && (
            <div><label className="block text-xs text-zantra-400 mb-1">Local</label><select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full text-sm"><option value="">Todos</option>{locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          )}
          {(selectedReport === 'employee-movements' || selectedReport === 'adjustments') && (
            <div><label className="block text-xs text-zantra-400 mb-1">Funcionário</label><select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full text-sm"><option value="">Todos</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={loadReport} disabled={loading} className="flex items-center gap-2 bg-zantra-600 hover:bg-zantra-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            <FileText size={16} /> {loading ? 'Carregando...' : 'Carregar'}
          </button>
          {data.length > 0 && (
            <button onClick={exportCSV} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm">
              <Download size={16} /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-zantra-800 rounded-xl border border-zantra-700 overflow-hidden">
        <div className="overflow-x-auto">
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
