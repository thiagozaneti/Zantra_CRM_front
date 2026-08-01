import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { hasPermission } from './components/Layout';
import { Shield } from 'lucide-react';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Locations from './pages/Locations';
import Entries from './pages/Entries';
import Transfers from './pages/Transfers';
import Stock from './pages/Stock';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Audit from './pages/Audit';
import Consumption from './pages/Consumption';
import Sales from './pages/Sales';
import ErrorBoundary from './components/ErrorBoundary';
import Supplies from './pages/Supplies';
import Security from './pages/Security';
import Pending from './pages/Pending';
import Closings from './pages/Closings';
import Inventories from './pages/Inventories';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function ProtectedRoute({ module, children }: { module: string; children: React.ReactNode }) {
  if (!hasPermission(module)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Shield size={48} className="text-red-500" />
        <h2 className="text-xl font-semibold text-surface-900">Acesso Negado</h2>
        <p className="text-surface-500">Você não tem permissão para acessar este módulo.</p>
        <button onClick={() => window.history.back()} className="btn-primary">
          Voltar
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProtectedRoute module="products"><Products /></ProtectedRoute>} />
        <Route path="locations" element={<ProtectedRoute module="locations"><Locations /></ProtectedRoute>} />
        <Route path="entries" element={<ProtectedRoute module="entries"><Entries /></ProtectedRoute>} />
        <Route path="transfers" element={<ProtectedRoute module="transfers"><Transfers /></ProtectedRoute>} />
        <Route path="supplies" element={<ProtectedRoute module="supplies"><Supplies /></ProtectedRoute>} />
        <Route path="stock" element={<ProtectedRoute module="stock"><Stock /></ProtectedRoute>} />
        <Route path="consumption" element={<ProtectedRoute module="consumption"><Consumption /></ProtectedRoute>} />
        <Route path="sales" element={<ProtectedRoute module="sales"><Sales /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute module="users"><Users /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute module="audit"><Audit /></ProtectedRoute>} />
        <Route path="security" element={<ProtectedRoute module="security"><Security /></ProtectedRoute>} />
        <Route path="pending" element={<ProtectedRoute module="pending"><Pending /></ProtectedRoute>} />
        <Route path="closings" element={<ProtectedRoute module="closing"><Closings /></ProtectedRoute>} />
        <Route path="inventories" element={<ProtectedRoute module="inventory"><Inventories /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    const preventNumberWheel = (event: WheelEvent) => {
      const target = event.target as HTMLInputElement;
      if (target?.type === 'number' && document.activeElement === target) {
        event.preventDefault();
        target.blur();
      }
    };
    document.addEventListener('wheel', preventNumberWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', preventNumberWheel, { capture: true });
  }, []);
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ErrorBoundary>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
