import { Boxes, ArrowLeftRight, ShoppingCart, TentTree, ClipboardList, Settings, Home, type LucideIcon } from 'lucide-react';

export type NavigationPage = { path: string; label: string; permission: string; description: string };
export type NavigationGroup = { id: string; label: string; icon: LucideIcon; color: string; pages: NavigationPage[] };

export const navigation: NavigationGroup[] = [
  { id: 'home', label: 'Início', icon: Home, color: 'bg-blue-100 text-blue-800', pages: [] },
  { id: 'stock', label: 'Produtos e estoque', icon: Boxes, color: 'bg-sky-100 text-sky-800', pages: [
    { path: '/stock', label: 'Estoque', permission: 'stock:view', description: 'Consultar quantidades por local' },
    { path: '/products', label: 'Produtos', permission: 'products:view', description: 'Consultar e cadastrar produtos' },
    { path: '/inventories', label: 'Inventários', permission: 'inventory:view', description: 'Contar e conferir produtos' },
    { path: '/locations', label: 'Locais', permission: 'locations:view', description: 'Consultar locais de trabalho' },
  ] },
  { id: 'movements', label: 'Movimentações', icon: ArrowLeftRight, color: 'bg-violet-100 text-violet-800', pages: [
    { path: '/entries', label: 'Entradas', permission: 'entries:view', description: 'Receber produtos' },
    { path: '/transfers', label: 'Transferências', permission: 'transfers:view', description: 'Mover produtos entre locais' },
    { path: '/supplies', label: 'Abastecimento', permission: 'supplies:view', description: 'Solicitar e atender pedidos' },
    { path: '/consumption', label: 'Consumo interno', permission: 'consumption:view', description: 'Registrar uso, perdas e produção' },
  ] },
  { id: 'sales', label: 'Vendas e cartões', icon: ShoppingCart, color: 'bg-amber-100 text-amber-800', pages: [
    { path: '/sales', label: 'Frente de vendas', permission: 'sales:view', description: 'Registrar uma venda' },
    { path: '/commands', label: 'Comandas', permission: 'commands:view', description: 'Cadastrar e recarregar cartões' },
  ] },
  { id: 'club', label: 'Clube', icon: TentTree, color: 'bg-emerald-100 text-emerald-800', pages: [
    { path: '/kiosks', label: 'Quiosques e reservas', permission: 'kiosks:view', description: 'Administrar quiosques e reservas' },
  ] },
  { id: 'tracking', label: 'Acompanhamento', icon: ClipboardList, color: 'bg-indigo-100 text-indigo-800', pages: [
    { path: '/pending', label: 'Pendências', permission: 'pending:view', description: 'Consultar o que precisa de atenção' },
    { path: '/closings', label: 'Fechamentos', permission: 'closing:view', description: 'Conferir períodos de operação' },
    { path: '/reports', label: 'Relatórios', permission: 'reports:view', description: 'Consultar e exportar relatórios' },
    { path: '/audit', label: 'Auditoria', permission: 'audit:view', description: 'Consultar o histórico de operações' },
  ] },
  { id: 'admin', label: 'Administração', icon: Settings, color: 'bg-slate-200 text-slate-800', pages: [
    { path: '/users', label: 'Usuários', permission: 'users:manage', description: 'Gerenciar acessos e permissões' },
    { path: '/printer', label: 'Impressora', permission: 'printer:view', description: 'Configurar impressoras e estações' },
    { path: '/security', label: 'Segurança', permission: 'security:view', description: 'Gerenciar senha e sessões' },
  ] },
];

export function visibleNavigation(permissions: string[]): NavigationGroup[] {
  return navigation.map((group) => ({ ...group, pages: group.pages.filter((page) => permissions.includes(page.permission) || (page.path === '/commands' && permissions.includes('card-refunds:view'))) }))
    .filter((group) => group.id === 'home' || group.pages.length > 0);
}

export function activeNavigation(pathname: string): NavigationGroup | undefined {
  if (pathname === '/') return navigation[0];
  return navigation.find((group) => group.pages.some((page) => pathname === page.path || pathname.startsWith(`${page.path}/`)));
}
