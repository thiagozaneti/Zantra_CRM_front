import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado na interface:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-surface-200 rounded-2xl shadow-sm p-8 text-center">
        <span className="mx-auto w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={28}/></span>
        <h1 className="text-xl font-bold text-surface-900 mt-5">Não foi possível exibir esta tela</h1>
        <p className="text-sm text-surface-500 mt-2">Seus dados não foram alterados. Atualize a página ou retorne ao início.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
          <button className="btn-primary flex items-center justify-center gap-2" onClick={() => window.location.reload()}><RefreshCw size={16}/> Tentar novamente</button>
          <button className="btn-secondary flex items-center justify-center gap-2" onClick={() => { window.location.href = '/'; }}><Home size={16}/> Ir ao dashboard</button>
        </div>
        {import.meta.env.DEV && <pre className="mt-6 p-3 rounded-lg bg-surface-100 text-left text-xs text-red-700 overflow-auto">{this.state.error.message}</pre>}
      </div>
    </div>;
  }
}
