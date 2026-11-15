import CommandManagement from '../components/CommandManagement';
import { useSearchParams } from 'react-router-dom';
import { hasActionPermission } from '../components/Layout';
import CardRefunds from './CardRefunds';

export default function Commands() {
  const [params, setParams] = useSearchParams();
  const canViewCommands = hasActionPermission('commands:view');
  const canViewRefunds = hasActionPermission('card-refunds:view');
  const showRefund = canViewRefunds && (params.get('tab') === 'refund' || !canViewCommands);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-surface-900">Comandas</h1><p className="mt-1 text-surface-500">Cadastro, recarga, compras e devolução de saldo dos cartões RFID</p></div>
    {canViewCommands && canViewRefunds && <nav aria-label="Operações de comandas" className="flex flex-wrap gap-2">
      <button className={showRefund ? 'btn-secondary' : 'btn-primary'} aria-current={!showRefund ? 'page' : undefined} onClick={() => setParams({})}>Cartões</button>
      <button className={showRefund ? 'btn-primary' : 'btn-secondary'} aria-current={showRefund ? 'page' : undefined} onClick={() => setParams({ tab: 'refund' })}>Estorno de saldo</button>
    </nav>}
    {showRefund ? <CardRefunds/> : canViewCommands && <CommandManagement/>}
  </div>;
}
