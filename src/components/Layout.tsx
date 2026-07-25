import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, MapPin, ArrowDownToLine, ArrowLeftRight,
  Warehouse, FileText, Users, Shield, LogOut, Menu, X
} from 'lucide-react';
import icon from '../images/icon.png';

const rolePermissions: Record<string, string[]> = {
  ADMIN: ['dashboard', 'products', 'locations', 'entries', 'transfers', 'stock', 'reports', 'users', 'audit'],
  MANAGER: ['dashboard', 'stock', 'reports', 'audit'],
  COLD_ROOM_RESPONSIBLE: ['dashboard', 'entries', 'transfers', 'stock'],
  BAR_RESPONSIBLE: ['dashboard', 'stock'],
  PRODUCT_REGISTER: ['dashboard', 'products'],
  READ_ONLY: ['dashboard', 'stock'],
};

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard' },
  { to: '/products', icon: Package, label: 'Produtos', module: 'products' },
  { to: '/locations', icon: MapPin, label: 'Locais', module: 'locations' },
  { to: '/entries', icon: ArrowDownToLine, label: 'Entradas', module: 'entries' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transferências', module: 'transfers' },
  { to: '/stock', icon: Warehouse, label: 'Estoque', module: 'stock' },
  { to: '/reports', icon: FileText, label: 'Relatórios', module: 'reports' },
  { to: '/users', icon: Users, label: 'Usuários', module: 'users' },
  { to: '/audit', icon: Shield, label: 'Auditoria', module: 'audit' },
];

export function hasPermission(module: string): boolean {
  const userStr = localStorage.getItem('zantra_user');
  if (!userStr) return false;
  try {
    const user = JSON.parse(userStr);
    const perms = rolePermissions[user.role] || [];
    return perms.includes(module);
  } catch {
    return false;
  }
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  COLD_ROOM_RESPONSIBLE: 'Resp. Câmara Fria',
  BAR_RESPONSIBLE: 'Resp. Bar',
  PRODUCT_REGISTER: 'Cadastro de Produtos',
  READ_ONLY: 'Consulta',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userPerms = rolePermissions[user?.role || ''] || [];
  const filteredNav = navItems.filter((item) => userPerms.includes(item.module));

  return (
    <div className="min-h-screen flex bg-surface-50">
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
          fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-surface-800 shrink-0">
          <img src={icon} alt="Zantra" className="h-10" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {filteredNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-surface-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-surface-700 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
              <div className="text-xs text-surface-400 truncate">{roleLabels[user?.role || ''] || user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-surface-400 hover:text-white p-2 shrink-0"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-surface-200 flex items-center px-4 sticky top-0 z-30 shrink-0">
          <button
            className="lg:hidden text-surface-600 hover:text-surface-900 p-2 -ml-2 mr-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 text-sm text-surface-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Sistema ativo
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
