import CommandManagement from '../components/CommandManagement';
import { Link } from 'react-router-dom';
import { hasActionPermission } from '../components/Layout';

export default function Commands() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-surface-900">Comandas</h1><p className="mt-1 text-surface-500">Cadastro, recarga, ajuste de saldo e histórico dos cartões RFID</p></div>{hasActionPermission('card-refunds:view') && <nav aria-label="Operações de comandas" className="flex flex-wrap gap-2"><span aria-current="page" className="rounded-lg bg-brand-100 px-4 py-2 font-semibold text-brand-800">Comandas</span><Link to="/card-refunds" className="btn-secondary">Estorno de saldo</Link></nav>}<CommandManagement/></div>;
}
