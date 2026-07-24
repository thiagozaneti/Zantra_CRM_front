import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, MapPin, ArrowDownToLine, ArrowLeftRight,
  Warehouse, FileText, Users, Shield, LogOut, Menu, X, ChevronDown
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/locations', icon: MapPin, label: 'Locais' },
  { to: '/entries', icon: ArrowDownToLine, label: 'Entradas' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transferências' },
  { to: '/stock', icon: Warehouse, label: 'Estoque' },
  { to: '/reports', icon: FileText, label: 'Relatórios' },
  { to: '/users', icon: Users, label: 'Usuários', adminOnly: true },
  { to: '/audit', icon: Shield, label: 'Auditoria', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'ADMIN') return false;
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-zantra-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-zantra-700">
          <h1 className="text-xl font-bold text-white">ZANTRA</h1>
          <button className="lg:hidden text-zantra-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zantra-600 text-white'
                    : 'text-zantra-300 hover:bg-zantra-700 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-zantra-700">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm text-zantra-400 hover:bg-zantra-700 hover:text-white transition-colors">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-zantra-800 border-b border-zantra-700 flex items-center justify-between px-4">
          <button className="lg:hidden text-zantra-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex-1" />
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-sm text-zantra-300 hover:text-white"
            >
              <span>{user?.name}</span>
              <ChevronDown size={16} />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-zantra-800 border border-zantra-700 rounded-lg shadow-lg z-50">
                <div className="px-4 py-2 border-b border-zantra-700">
                  <p className="text-xs text-zantra-400">Perfil</p>
                  <p className="text-sm text-white">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-zantra-300 hover:bg-zantra-700 hover:text-white"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
