import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeftRight, ClipboardCheck, ClipboardList, PackagePlus, ShoppingCart, Warehouse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Dashboard from './Dashboard';

const actions = [
  { path: '/sales', permission: 'sales:view', label: 'Frente de vendas', description: 'Consultar e registrar vendas conforme seu acesso', icon: ShoppingCart },
  { path: '/entries', permission: 'entries:view', label: 'Entradas', description: 'Consultar recebimentos de produtos', icon: ArrowDownToLine },
  { path: '/supplies', permission: 'supplies:view', label: 'Abastecimento', description: 'Solicitar ou atender pedidos', icon: PackagePlus },
  { path: '/transfers', permission: 'transfers:view', label: 'Transferências', description: 'Enviar produtos entre locais', icon: ArrowLeftRight },
  { path: '/inventories', permission: 'inventory:view', label: 'Inventários', description: 'Contar ou revisar estoque', icon: ClipboardCheck },
  { path: '/stock', permission: 'stock:view', label: 'Estoque', description: 'Consultar quantidades por local', icon: Warehouse },
];

export default function Home() {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const canViewPending = permissions.includes('pending:view');
  const available = actions.filter((item) => permissions.includes(item.permission));
  const [pending, setPending] = useState<number | null>(null);
  const [pendingError, setPendingError] = useState(false);
  useEffect(() => {
    let current = true;
    if (canViewPending) {
      api.getPending().then((data) => { if (current) setPending(data.counts.total); }).catch(() => { if (current) setPendingError(true); });
    }
    return () => { current = false; };
  }, [user?.id, canViewPending]);

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <section aria-labelledby="home-heading">
      <h1 id="home-heading" className="text-2xl font-semibold text-surface-900">Olá, {user?.name?.split(' ')[0] || 'bem-vindo'}</h1>
      <p className="mt-1 text-base text-surface-600">O que você deseja fazer hoje?</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{available.map((item) => <Link key={item.path} to={item.path} className="flex min-h-20 items-center gap-3 rounded-xl border border-surface-200 bg-white p-4 text-left hover:border-brand-400 hover:bg-brand-50"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><item.icon size={22} aria-hidden="true"/></span><span><strong className="block text-base text-surface-900">{item.label}</strong><span className="text-sm text-surface-600">{item.description}</span></span></Link>)}</div>
      {!available.length && <p className="mt-4 rounded-lg border bg-white p-4 text-surface-600">Use o menu para acessar as telas disponíveis para você.</p>}
    </section>
    {canViewPending && <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4" aria-labelledby="pending-heading"><div className="flex items-center gap-3"><ClipboardList className="text-brand-700" aria-hidden="true"/><div><h2 id="pending-heading" className="font-semibold">Precisa de atenção</h2><p className="text-sm text-surface-600">{pendingError ? 'Não foi possível carregar as pendências.' : pending === null ? 'Consultando pendências...' : `${pending} pendência(s) para consultar`}</p></div></div><Link to="/pending" className="btn-secondary">Abrir pendências</Link></section>}
    {permissions.includes('dashboard:view') && <section aria-label="Indicadores e atividades recentes"><Dashboard embedded/></section>}
  </div>;
}
