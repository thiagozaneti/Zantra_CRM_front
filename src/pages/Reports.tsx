import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const reportTypes = [
  { id: 'entries', label: 'Entradas' },
  { id: 'transfers', label: 'Transferências' },
  { id: 'stock', label: 'Estoque Atual' },
  { id: 'product-history', label: 'Histórico de Produto' },
  { id: 'employee-movements', label: 'Movimentações por Funcionário' },
  { id: 'adjustments', label: 'Divergências e Ajustes' },
  { id: 'consumption', label: 'Consumo por Bar' },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('entries');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

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

  const getHeaders = (): string[] => {
    switch (selectedReport) {
      case 'entries': return ['Data', 'Produto', 'Qtd', 'Unidade', 'Câmara', 'Fornecedor', 'NF', 'Responsável'];
      case 'transfers':
      case 'consumption': return ['Data', 'Produto', 'Qtd', 'Origem', 'Destino', 'Retirado por', 'Recebido por'];
      case 'stock': return ['Produto', 'SKU', 'Categoria', 'Local', 'Tipo', 'Qtd', 'Mín', 'Unidade'];
      case 'product-history':
      case 'employee-movements':
      case 'adjustments': return ['Data', 'Usuário', 'Operação', 'Produto', 'Qtd Anterior', 'Movimentado', 'Resultado', 'Notas'];
      default: return [];
    }
  };

  const getRows = (): any[][] => {
    return data.map((item: any) => {
      switch (selectedReport) {
        case 'entries':
          return [
            new Date(item.createdAt).toLocaleDateString('pt-BR'),
            item.product?.name || '',
            item.quantity,
            item.unit,
            item.location?.name || '',
            item.supplier || '',
            item.invoiceNumber || '',
            item.receivedBy?.name || '',
          ];
        case 'transfers':
        case 'consumption':
          return [
            new Date(item.createdAt).toLocaleDateString('pt-BR'),
            item.product?.name || '',
            item.quantity,
            item.origin?.name || '',
            item.destination?.name || '',
            item.withdrawnBy?.name || '',
            item.receivedBy?.name || '',
          ];
        case 'stock':
          return [
            item.product?.name || '',
            item.product?.sku || '',
            item.product?.category || '',
            item.location?.name || '',
            item.location?.type === 'COLD_ROOM' ? 'Câmara Fria' : 'Bar',
            item.quantity,
            item.product?.minStock || 0,
            item.product?.unit || '',
          ];
        default:
          return [
            new Date(item.createdAt).toLocaleDateString('pt-BR'),
            item.user?.name || '',
            item.operationType || '',
            item.product?.name || '',
            item.quantityBefore || 0,
            item.quantityMoved || 0,
            item.quantityAfter || 0,
            item.notes || '',
          ];
      }
    });
  };

  const exportPDF = () => {
    if (data.length === 0) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    const headers = getHeaders();
    const rows = getRows();

    doc.setFontSize(16);
    doc.text(`Relatório - ${reportTypes.find(r => r.id === selectedReport)?.label}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`${selectedReport}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportExcel = () => {
    if (data.length === 0) return;

    const headers = getHeaders();
    const rows = getRows();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportTypes.find(r => r.id === selectedReport)?.label || 'Dados');
    XLSX.writeFile(wb, `${selectedReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderTable = () => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-surface-300 mb-4" />
          <p className="text-surface-500">Nenhum dado encontrado. Clique em "Carregar" para buscar.</p>
        </div>
      );
    }

    const headers = getHeaders();
    const rows = getRows();

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50">
              {headers.map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-surface-100 hover:bg-surface-50">
                {row.map((cell: any, j: number) => (
                  <td key={j} className="px-4 py-3 text-surface-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-surface-900">Relatórios</h1>
        <p className="text-surface-500 mt-1 text-sm">Gere relatórios e exporte dados</p>
      </div>

      {/* Report type selector */}
      <div className="flex flex-wrap gap-2">
        {reportTypes.map((r) => (
          <button
            key={r.id}
            onClick={() => { setSelectedReport(r.id); setData([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedReport === r.id
                ? 'bg-brand-600 text-white'
                : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1.5">Data Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1.5">Data Fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
            </div>
            {(selectedReport === 'entries' || selectedReport === 'product-history' || selectedReport === 'stock' || selectedReport === 'consumption') && (
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Produto</label>
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full">
                  <option value="">Todos</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {(selectedReport === 'entries' || selectedReport === 'stock' || selectedReport === 'adjustments' || selectedReport === 'consumption') && (
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Local</label>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full">
                  <option value="">Todos</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            {(selectedReport === 'employee-movements' || selectedReport === 'adjustments') && (
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Funcionário</label>
                <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full">
                  <option value="">Todos</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={loadReport} disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <FileText size={16} />
              {loading ? 'Carregando...' : 'Carregar Relatório'}
            </button>
            {data.length > 0 && (
              <>
                <button onClick={exportPDF} className="btn-secondary flex items-center gap-2">
                  <Download size={16} />
                  Exportar PDF
                </button>
                <button onClick={exportExcel} className="btn-secondary flex items-center gap-2">
                  <FileSpreadsheet size={16} />
                  Exportar Excel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-surface-200 border-t-brand-600"></div>
          </div>
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
}
