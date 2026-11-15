import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import rioDasPedrasLogo from '../images/LOGO-ACQUA-PARK-TOPO-SITE-300X300-1.png';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-6">
    <section className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="w-full">
        <div className="mb-5 flex justify-center"><img src={rioDasPedrasLogo} alt="Rio das Pedras Acqua Park" className="h-24 w-24 object-contain"/></div>

        <div className="mb-6 2xl:mb-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-surface-900">Acesse sua conta</h2>
        </div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 2xl:space-y-5">
          <div>
            <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-surface-700">E-mail ou usuário</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" size={18}/>
              <input id="identifier" type="text" autoComplete="username" autoCapitalize="none" autoFocus value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="w-full rounded-xl border-surface-200 py-3 pl-11 pr-4" placeholder="Digite seu e-mail ou usuário" required/>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-surface-700">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" size={18}/>
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border-surface-200 py-3 pl-11 pr-12" placeholder="Digite sua senha" required/>
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700" aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm 2xl:text-base disabled:cursor-not-allowed disabled:opacity-60">
            {loading && <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"/>}
            {loading ? 'Entrando...' : 'Entrar no Zantra'}
          </button>
        </form>

        <div className="mt-6 2xl:mt-8 border-t border-surface-200 pt-4 2xl:pt-6 text-center">
          <p className="text-xs leading-relaxed text-surface-400">O acesso é restrito a usuários autorizados.<br/>© {new Date().getFullYear()} Zantra. Todos os direitos reservados.</p>
        </div>
      </div>
    </section>
  </main>;
}
