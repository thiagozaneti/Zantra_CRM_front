import { Suspense, useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, Bell, Search, X, Package, Warehouse, ClipboardCheck, MapPin, ArrowDownToLine, ArrowLeftRight, Truck, Utensils, ShoppingCart, CreditCard, TentTree, ClipboardList, CalendarCheck, FileBarChart, History, Users, Printer, Shield, type LucideIcon } from 'lucide-react';
import icon from '../images/icon.png';
import rioDasPedrasLogo from '../images/LOGO-ACQUA-PARK-TOPO-SITE-300X300-1.png';
import { api } from '../lib/api';
import { activeNavigation, visibleNavigation } from '../lib/navigation';
import { useToast } from './Toast';

const modulePermissions: Record<string, string> = {
  dashboard: 'dashboard:view', products: 'products:view', locations: 'locations:view', entries: 'entries:view',
  transfers: 'transfers:view', stock: 'stock:view', consumption: 'consumption:view', reports: 'reports:view',
  users: 'users:manage', audit: 'audit:view', sales: 'sales:view',
  supplies: 'supplies:view',
  security: 'security:view',
  pending: 'pending:view',
  closing: 'closing:view',
  inventory: 'inventory:view',
  commands: 'commands:view',
  'card-refunds': 'card-refunds:view',
  printer: 'printer:view',
  kiosks: 'kiosks:view',
};

export function hasPermission(module: string): boolean {
  const userStr = localStorage.getItem('zantra_user');
  if (!userStr) return false;
  try {
    const user = JSON.parse(userStr);
    return (user.permissions || []).includes(modulePermissions[module]);
  } catch {
    return false;
  }
}

export function hasActionPermission(action: string): boolean {
  const userStr = localStorage.getItem('zantra_user');
  if (!userStr) return false;
  try { return (JSON.parse(userStr).permissions || []).includes(action); } catch { return false; }
}

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gestor',
  RESPONSAVEL_CAMARA_FRIA: 'Resp. Câmara Fria',
  RESPONSAVEL_BAR: 'Resp. Bar',
  CADASTRO_PRODUTO: 'Cadastro de Produtos',
  SOMENTE_LEITURA: 'Consulta',
  FRENTE_VENDAS: 'Frente de Vendas',
};

const pageIcons: Record<string, LucideIcon> = {
  '/stock': Warehouse, '/products': Package, '/inventories': ClipboardCheck, '/locations': MapPin,
  '/entries': ArrowDownToLine, '/transfers': ArrowLeftRight, '/supplies': Truck, '/consumption': Utensils,
  '/sales': ShoppingCart, '/commands': CreditCard, '/kiosks': TentTree, '/pending': ClipboardList,
  '/closings': CalendarCheck, '/reports': FileBarChart, '/audit': History, '/users': Users,
  '/printer': Printer, '/security': Shield,
};

function NavigationIcon({ path }: { path: string }) {
  const Icon = pageIcons[path] || ClipboardList;
  return <Icon size={17} aria-hidden="true" className="shrink-0"/>;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('zantra_sidebar_collapsed') === 'true');
  const [notifications, setNotifications] = useState<any>({ data: [], unread: 0 });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => { const load = () => api.getNotifications().then(setNotifications).catch(() => undefined); load(); const timer = setInterval(load, 60000); return () => clearInterval(timer); }, []);

  const toggleDesktopSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem('zantra_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userPerms = user?.permissions || [];
  const groups = visibleNavigation(userPerms);
  const activeGroup = activeNavigation(location.pathname);
  const activePages = groups.find((group) => group.id === activeGroup?.id)?.pages || [];
  const searchTerm = search.trim().toLocaleLowerCase('pt-BR');
  const searchResults = groups.flatMap((group) => group.pages).filter((page) => searchTerm && `${page.label} ${page.description}`.toLocaleLowerCase('pt-BR').includes(searchTerm));
  useEffect(() => { if (user?.mustChangePassword && window.location.pathname !== '/security') navigate('/security'); }, [user?.mustChangePassword]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [sidebarOpen]);

  return (
    <div className="h-screen overflow-hidden flex bg-surface-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 h-screen w-64 bg-white border-r border-surface-200 flex flex-col overflow-hidden
          transform transition-[transform,width] duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto lg:shrink-0
          ${sidebarCollapsed ? 'lg:hidden' : 'lg:w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Marcas */}
        <div className={`h-16 flex items-center gap-3 px-5 border-b border-surface-200 shrink-0 ${sidebarCollapsed ? 'lg:justify-center lg:gap-1 lg:px-1' : ''}`}>
          <img src={icon} alt="Zantra" className={`h-10 w-10 shrink-0 object-contain ${sidebarCollapsed ? 'lg:h-8 lg:w-8' : ''}`} />
          <span aria-hidden="true" className={`h-8 w-px shrink-0 bg-surface-200 ${sidebarCollapsed ? 'lg:hidden' : ''}`} />
          <img src={rioDasPedrasLogo} alt="Rio das Pedras Acqua Park" className={`h-12 w-12 shrink-0 object-contain ${sidebarCollapsed ? 'lg:h-8 lg:w-8' : ''}`} />
        </div>

        {/* Navigation */}
        <nav aria-label="Áreas do sistema" className={`flex-1 overflow-y-auto py-4 px-3 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
          <div className="space-y-1">
            {groups.map((item) => (
              <Link
                key={item.id}
                to={item.id === 'home' ? '/' : item.pages[0].path}
                onClick={() => setSidebarOpen(false)}
                title={item.label}
                aria-label={item.label}
                aria-current={activeGroup?.id === item.id ? 'page' : undefined}
                className={
                  `flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${sidebarCollapsed ? 'lg:justify-center' : ''} ${
                    activeGroup?.id === item.id
                      ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  }`
                }
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}><item.icon size={21} aria-hidden="true" /></span>
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* User section */}
        <div className={`p-4 ${sidebarCollapsed ? 'lg:p-2' : ''} border-t border-surface-200 bg-surface-50 shrink-0`}>
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:flex-col lg:gap-1' : ''}`}>
            <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-sm font-semibold shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <div className="text-sm font-medium text-surface-900 truncate">{user?.name}</div>
              <div className="text-xs text-surface-500 truncate">{roleLabels[user?.role || ''] || user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-surface-500 hover:text-red-600 hover:bg-red-50 rounded-lg p-2 shrink-0"
              title="Sair" aria-label="Sair da conta"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen min-h-0 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-surface-200 flex items-center px-4 sticky top-0 z-30 shrink-0">
          <button
            className="lg:hidden mr-2 inline-flex items-center gap-2 rounded border-2 border-surface-800 bg-surface-800 px-3 py-2 text-sm font-bold text-white hover:bg-surface-700"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu" aria-expanded={sidebarOpen}
          >
            <Menu size={22} /><span>Menu</span>
          </button>
          <button
            className="hidden lg:inline-flex items-center gap-2 rounded border-2 border-surface-800 bg-surface-800 px-3 py-2 text-sm font-bold text-white hover:bg-surface-700"
            onClick={toggleDesktopSidebar}
            title={sidebarCollapsed ? 'Abrir menu' : 'Fechar menu'}
            aria-label={sidebarCollapsed ? 'Abrir menu lateral' : 'Fechar menu lateral'}
            aria-expanded={!sidebarCollapsed}
          >
            <Menu size={22} /> {sidebarCollapsed ? 'Abrir menu' : 'Fechar menu'}
          </button>
          <div className="relative ml-2 min-w-0 max-w-sm flex-1"><label htmlFor="find-page" className="sr-only">Encontrar uma tela</label><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-500"/><input id="find-page" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setSearch(''); }} placeholder="Encontrar uma tela" className="w-full py-2 pl-9 pr-9"/>{search && <button type="button" aria-label="Limpar busca de telas" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5"><X size={16}/></button>}{searchTerm && <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-surface-200 bg-white p-2 shadow-lg">{searchResults.map((page) => <NavLink key={page.path} to={page.path} onClick={() => setSearch('')} className="block rounded-lg px-3 py-2 hover:bg-brand-50"><span className="block text-sm font-semibold">{page.label}</span><span className="block text-xs text-surface-600">{page.description}</span></NavLink>)}{!searchResults.length && <p className="p-3 text-sm text-surface-600">Nenhuma tela encontrada entre seus acessos.</p>}</div>}</div>
          <div className="flex-1" />
          <div className="relative mr-2"><button onClick={() => setNotificationsOpen((value) => !value)} className="relative rounded-lg p-2 text-surface-600 hover:bg-surface-100" aria-label={`Notificações${notifications.unread ? `, ${notifications.unread} não lidas` : ''}`} aria-expanded={notificationsOpen}><Bell size={19}/>{notifications.unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"/>}</button>{notificationsOpen && <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-white shadow-xl"><div className="flex items-center justify-between border-b px-4 py-3"><p className="text-sm font-semibold">Notificações</p><button className="text-sm text-brand-700" onClick={async () => { try { await api.readAllNotifications(); setNotifications((current: any) => ({ ...current, unread: 0, data: current.data.map((item: any) => ({ ...item, readAt: new Date() })) })); } catch { showToast('error', 'Não foi possível atualizar as notificações. Tente novamente.'); } }}>Marcar como lidas</button></div><div className="max-h-80 divide-y overflow-auto">{notifications.data.map((item: any) => <button key={item.id} className={`block w-full p-4 text-left hover:bg-surface-50 ${!item.readAt ? 'bg-brand-50/50' : ''}`} onClick={async () => { try { await api.readNotification(item.id); setNotificationsOpen(false); if (item.link) navigate(item.link); } catch { showToast('error', 'Não foi possível abrir a notificação. Tente novamente.'); } }}><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-sm text-surface-600">{item.message}</p><p className="mt-1 text-xs text-surface-600">{new Date(item.createdAt).toLocaleString('pt-BR')}</p></button>)}{!notifications.data.length && <p className="p-6 text-center text-sm text-surface-600">Nenhuma notificação</p>}</div></div>}</div>
          <span className="hidden max-w-40 truncate text-sm text-surface-600 sm:block">{user?.name}</span>
        </header>

        {activeGroup && activeGroup.id !== 'home' && <div className="shrink-0 border-b border-surface-200 bg-white px-4"><div className="flex min-h-11 items-center gap-4"><span className="hidden shrink-0 text-sm font-semibold text-surface-600 lg:block">{activeGroup.label}</span>{activePages.length > 1 && <nav aria-label={`Páginas de ${activeGroup.label}`} className="flex min-w-0 gap-1 overflow-x-auto">{activePages.map((page) => <NavLink key={page.path} to={page.path} className={({ isActive }) => `inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold ${isActive ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : 'border-surface-300 bg-white text-surface-700 hover:border-brand-400 hover:bg-brand-50'}`}><NavigationIcon path={page.path}/>{page.label}</NavLink>)}</nav>}{activePages.length === 1 && <span className="inline-flex items-center gap-2 py-3 text-sm font-medium text-surface-700"><NavigationIcon path={activePages[0].path}/>{activePages[0].label}</span>}</div></div>}

        {/* Page content */}
        <main className={location.pathname === '/sales' ? 'flex-1 min-h-0 overflow-hidden p-2' : 'flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden overscroll-contain'}>
          <Suspense fallback={<div role="status" className="p-8 text-center text-surface-700">Carregando tela...</div>}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}
