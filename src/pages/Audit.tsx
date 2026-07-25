import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Shield, Filter } from 'lucide-react';

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(true);

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

  const getOpStyle = (op: string) => {
    switch (op) {
      case 'ENTRY': return 'bg-emerald-100 text-emerald-700';
      case 'TRANSFER': return 'bg-blue-100 text-blue-700';
      case 'ADJUSTMENT': return 'bg-amber-100 text-amber-700';
      default: return 'bg-surface-100 text-surface-600';
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
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-surface-900">Auditoria</h1>
        <p className="text-surface-500 mt-1 text-sm">Histórico completo de operações do sistema</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
          <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
            <Filter size={16} />
            Filtros
          </div>
          <span className="text-surface-400">{showFilters ? '▲' : '▼'}</span>
        </div>
        {showFilters && (
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Usuário</label>
                <select value={fUserId} onChange={(e) => { setFUserId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full">
                  <option value="">Todos</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Tipo de Operação</label>
                <select value={fOperationType} onChange={(e) => { setFOperationType(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full">
                  <option value="">Todas</option>
                  <option value="ENTRY">Entrada</option>
                  <option value="TRANSFER">Transferência</option>
                  <option value="ADJUSTMENT">Ajuste</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Data Início</label>
                <input type="date" value={fStartDate} onChange={(e) => { setFStartDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1.5">Data Fim</label>
                <input type="date" value={fEndDate} onChange={(e) => { setFEndDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-surface-400">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-surface-400">Nenhum registro encontrado</div>
        ) : logs.map((log: any) => (
          <div key={log.id} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-surface-900">{log.user?.name}</p>
                <p className="text-xs text-surface-500">{new Date(log.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOpStyle(log.operationType)}`}>
                {getOpLabel(log.operationType)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-600">{log.product?.name || '-'}</span>
              <span className="font-semibold text-surface-900">{log.quantityMoved}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden card overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Data/Hora</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Usuário</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Operação</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Produto</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Qtd Anterior</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Movimentado</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Resultado</th>
                <th className="text-left px-4 py-3 text-surface-600 font-medium text-xs uppercase">Notas</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3 text-surface-600">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 font-medium text-surface-900">{log.user?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOpStyle(log.operationType)}`}>
                      {getOpLabel(log.operationType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-600">{log.product?.name || '-'}</td>
                  <td className="px-4 py-3 text-surface-600">{log.quantityBefore || 0}</td>
                  <td className="px-4 py-3 font-semibold text-surface-900">{log.quantityMoved}</td>
                  <td className="px-4 py-3 font-semibold text-surface-900">{log.quantityAfter}</td>
                  <td className="px-4 py-3 text-surface-500 text-xs max-w-[200px] truncate">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))} className={`w-9 h-9 rounded-lg text-sm font-medium ${p === pagination.page ? 'bg-brand-600 text-white' : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
