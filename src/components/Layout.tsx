import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, MapPin, ArrowDownToLine, ArrowLeftRight,
  Warehouse, FileText, Users, Shield, LogOut, Menu, GlassWater, ShoppingCart,
  PanelLeftClose, PanelLeftOpen, PackagePlus, KeyRound, Bell, ClipboardList, CalendarCheck, ClipboardCheck
} from 'lucide-react';
import icon from '../images/icon.png';
import { api } from '../lib/api';

const modulePermissions: Record<string, string> = {
  dashboard: 'dashboard:view', products: 'products:view', locations: 'locations:view', entries: 'entries:view',
  transfers: 'transfers:view', stock: 'stock:view', consumption: 'consumption:view', reports: 'reports:view',
  users: 'users:manage', audit: 'audit:view', sales: 'sales:view',
  supplies: 'supplies:view',
  security: 'security:view',
  pending: 'pending:view',
  closing: 'closing:view',
  inventory: 'inventory:view',
};

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard', group: 'Visão geral' },
  { to: '/products', icon: Package, label: 'Produtos', module: 'products', group: 'Cadastros' },
  { to: '/locations', icon: MapPin, label: 'Locais', module: 'locations', group: 'Cadastros' },
  { to: '/entries', icon: ArrowDownToLine, label: 'Entradas', module: 'entries', group: 'Movimentações' },
  { to: '/supplies', icon: PackagePlus, label: 'Abastecimento', module: 'supplies', group: 'Movimentações' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transferências', module: 'transfers', group: 'Movimentações' },
  { to: '/stock', icon: Warehouse, label: 'Estoque', module: 'stock', group: 'Movimentações' },
  { to: '/inventories', icon: ClipboardCheck, label: 'Inventários', module: 'inventory', group: 'Controle' },
  { to: '/consumption', icon: GlassWater, label: 'Consumo Interno', module: 'consumption', group: 'Movimentações' },
  { to: '/sales', icon: ShoppingCart, label: 'Frente de Vendas', module: 'sales', group: 'Movimentações' },
  { to: '/pending', icon: ClipboardList, label: 'Pendências', module: 'pending', group: 'Controle' },
  { to: '/closings', icon: CalendarCheck, label: 'Fechamentos', module: 'closing', group: 'Controle' },
  { to: '/reports', icon: FileText, label: 'Relatórios', module: 'reports', group: 'Controle' },
  { to: '/users', icon: Users, label: 'Usuários', module: 'users', group: 'Administração' },
  { to: '/audit', icon: Shield, label: 'Auditoria', module: 'audit', group: 'Administração' },
  { to: '/security', icon: KeyRound, label: 'Segurança', module: 'security', group: 'Administração' },
];

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
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  COLD_ROOM_RESPONSIBLE: 'Resp. Câmara Fria',
  BAR_RESPONSIBLE: 'Resp. Bar',
  PRODUCT_REGISTER: 'Cadastro de Produtos',
  READ_ONLY: 'Consulta',
  SALES_FRONT: 'Frente de Vendas',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('zantra_sidebar_collapsed') === 'true');
  const [notifications, setNotifications] = useState<any>({ data: [], unread: 0 });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
  const filteredNav = navItems.filter((item) => userPerms.includes(modulePermissions[item.module]));
  useEffect(() => { if (user?.mustChangePassword && window.location.pathname !== '/security') navigate('/security'); }, [user?.mustChangePassword]);

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
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center px-5 border-b border-surface-200 shrink-0 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}>
          <img src={icon} alt="Zantra" className="h-10" />
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 px-3 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
          <div className="space-y-1">
            {filteredNav.map((item, index) => (
              <div key={item.to}>
              {(index === 0 || filteredNav[index - 1].group !== item.group) && <p className={`px-3 pb-1 pt-4 first:pt-0 text-[10px] font-semibold uppercase tracking-wider text-surface-400 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.group}</p>}
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${sidebarCollapsed ? 'lg:justify-center' : ''} ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  }`
                }
              >
                <item.icon size={18} className="shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
              </NavLink>
              </div>
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
              title="Sair"
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
            className="lg:hidden text-surface-600 hover:text-surface-900 p-2 -ml-2 mr-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <button
            className="hidden lg:inline-flex text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-lg p-2 -ml-2"
            onClick={toggleDesktopSidebar}
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={21} /> : <PanelLeftClose size={21} />}
          </button>
          <div className="flex-1" />
          <div className="relative mr-2"><button onClick={() => setNotificationsOpen((value) => !value)} className="relative rounded-lg p-2 text-surface-500 hover:bg-surface-100" aria-label="Notificações"><Bell size={19}/>{notifications.unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"/>}</button>{notificationsOpen && <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-white shadow-xl"><div className="flex items-center justify-between border-b px-4 py-3"><p className="text-sm font-semibold">Notificações</p><button className="text-xs text-brand-600" onClick={async () => { await api.readAllNotifications(); setNotifications((current: any) => ({ ...current, unread: 0, data: current.data.map((item: any) => ({ ...item, readAt: new Date() })) })); }}>Marcar como lidas</button></div><div className="max-h-80 divide-y overflow-auto">{notifications.data.map((item: any) => <button key={item.id} className={`block w-full p-4 text-left hover:bg-surface-50 ${!item.readAt ? 'bg-brand-50/50' : ''}`} onClick={async () => { await api.readNotification(item.id); setNotificationsOpen(false); if (item.link) navigate(item.link); }}><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-surface-500">{item.message}</p><p className="mt-1 text-[10px] text-surface-400">{new Date(item.createdAt).toLocaleString('pt-BR')}</p></button>)}{!notifications.data.length && <p className="p-6 text-center text-sm text-surface-400">Nenhuma notificação</p>}</div></div>}</div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-surface-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Sistema ativo
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
