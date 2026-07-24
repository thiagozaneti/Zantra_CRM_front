import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Search } from 'lucide-react';

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters
  const [fUserId, setFUserId] = useState('');
  const [fOperationType, setFOperationType] = useState('');
  const [fStartDate, setFStartDate] = useState('');
  const [fEndDate, setFEndDate] = useState('');

  useEffect(() => { loadLogs(); loadUsers(); }, [pagination.page, fUserId, fOperationType, fStartDate, fEndDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fUserId) params.set('userId', fUserId);
      if (fOperationType) params.set('operationType', fOperationType);
      if (fStartDate) params.set('startDate', fStartDate);
      if (fEndDate) params.set('endDate', fEndDate);
      params.set('page', pagination.page.toString());
      const result = await api.getAuditLogs(params.toString());
      setLogs(result.data);
      setPagination(result.pagination);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try { const result = await api.getUsers(); setUsers(result); } catch {}
  };

  const getOpColor = (op: string) => {
    switch (op) {
      case 'ENTRY': return 'bg-green-500/20 text-green-400';
      case 'TRANSFER': return 'bg-blue-500/20 text-blue-400';
      case 'ADJUSTMENT': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-zantra-700 text-zantra-300';
    }
  };

  const getOpLabel = (op: string) => {
    switch (op) {
      case 'ENTRY': return 'Entrada';
      case 'TRANSFER': return 'Transferência';
      case 'ADJUSTMENT': return 'Ajuste';
      default: return op;
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Auditoria</h1>

      {/* Filters */}
      <div className="bg-zantra-800 rounded-xl p-4 border border-zantra-700">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div><label className="block text-xs text-zantra-400 mb-1">Usuário</label><select value={fUserId} onChange={(e) => { setFUserId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm"><option value="">Todos</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Tipo de Operação</label><select value={fOperationType} onChange={(e) => { setFOperationType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm"><option value="">Todas</option><option value="ENTRY">Entrada</option><option value="TRANSFER">Transferência</option><option value="ADJUSTMENT">Ajuste</option></select></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Data Início</label><input type="date" value={fStartDate} onChange={(e) => { setFStartDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm" /></div>
          <div><label className="block text-xs text-zantra-400 mb-1">Data Fim</label><input type="date" value={fEndDate} onChange={(e) => { setFEndDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full text-sm" /></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zantra-800 rounded-xl border border-zantra-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zantra-700">
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Data/Hora</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Usuário</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Operação</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Produto</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Qtd Anterior</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Movimentado</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Resultado</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-zantra-400">Carregando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-zantra-400">Nenhum registro encontrado</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="border-b border-zantra-700/50 hover:bg-zantra-700/30">
                  <td className="px-4 py-3 text-zantra-300">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-white">{log.user?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOpColor(log.operationType)}`}>
                      {getOpLabel(log.operationType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zantra-300">{log.product?.name || '-'}</td>
                  <td className="px-4 py-3 text-zantra-300">{log.quantityBefore || 0}</td>
                  <td className="px-4 py-3 text-white">{log.quantityMoved}</td>
                  <td className="px-4 py-3 text-white">{log.quantityAfter}</td>
                  <td className="px-4 py-3 text-zantra-400 text-xs max-w-[200px] truncate">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))} className={`px-3 py-1 rounded-lg text-sm ${p === pagination.page ? 'bg-zantra-600 text-white' : 'bg-zantra-800 text-zantra-400 hover:bg-zantra-700'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
