import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Boxes, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import logo from '../images/logo.png';

const benefits = [
  { icon: Boxes, title: 'Operação centralizada', text: 'Estoque, movimentações, vendas e consumo em um único ambiente.' },
  { icon: Activity, title: 'Decisões em tempo real', text: 'Indicadores claros para acompanhar toda a operação.' },
  { icon: ShieldCheck, title: 'Controle e rastreabilidade', text: 'Permissões personalizadas e histórico completo das ações.' },
];

export default function Login() {
  const [email, setEmail] = useState('');
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
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="min-h-screen bg-surface-50 lg:grid lg:h-screen lg:min-h-0 lg:overflow-hidden lg:grid-cols-[1.08fr_0.92fr]">
    <section className="relative hidden lg:flex overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-surface-900 px-10 xl:px-14 2xl:px-20 py-7 2xl:py-10 text-white">
      <div className="absolute -top-36 -left-28 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"/>
      <div className="absolute -bottom-48 -right-24 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl"/>
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '42px 42px' }}/>

      <div className="relative z-10 flex w-full max-w-2xl flex-col justify-between">
        <img src={logo} alt="Zantra" className="h-14 xl:h-16 2xl:h-20 w-fit object-contain object-left brightness-0 invert"/>

        <div className="my-5 xl:my-7 2xl:my-10">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">Gestão integrada</span>
          <h1 className="mt-4 2xl:mt-6 max-w-xl text-3xl xl:text-4xl 2xl:text-5xl font-bold leading-[1.08] tracking-tight">Sua operação conectada, organizada e sob controle.</h1>
          <p className="mt-3 2xl:mt-5 max-w-xl text-sm xl:text-base 2xl:text-lg leading-relaxed text-brand-100/80">O Zantra reúne processos, pessoas e informações para transformar a rotina da sua empresa em decisões mais rápidas e seguras.</p>

          <div className="mt-5 xl:mt-7 2xl:mt-10 grid gap-3 xl:grid-cols-3">
            {benefits.map((benefit) => <div key={benefit.title} className="rounded-xl 2xl:rounded-2xl border border-white/10 bg-white/[0.07] p-3 2xl:p-4 backdrop-blur-sm">
              <benefit.icon size={18} className="text-brand-200"/>
              <h2 className="mt-2 2xl:mt-3 text-xs 2xl:text-sm font-semibold">{benefit.title}</h2>
              <p className="mt-1 text-[11px] 2xl:text-xs leading-relaxed text-brand-100/65">{benefit.text}</p>
            </div>)}
          </div>
        </div>

        <p className="text-xs text-brand-200/60">Tecnologia para uma gestão mais simples e eficiente.</p>
      </div>
    </section>

    <section className="flex min-h-screen items-center justify-center px-5 py-7 sm:px-10 lg:h-screen lg:min-h-0 lg:px-10 lg:py-5 xl:px-14 2xl:px-20">
      <div className="w-full max-w-[410px]">
        <div className="mb-7 lg:hidden"><img src={logo} alt="Zantra" className="h-16 w-fit object-contain"/></div>

        <div className="mb-6 2xl:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Área segura</p>
          <h2 className="mt-1.5 text-2xl 2xl:text-3xl font-bold tracking-tight text-surface-900">Acesse sua conta</h2>
          <p className="mt-2 text-sm leading-relaxed text-surface-500">Informe suas credenciais para continuar para o ambiente de gestão.</p>
        </div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 2xl:space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-surface-700">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" size={18}/>
              <input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border-surface-200 py-3 pl-11 pr-4" placeholder="seuemail@empresa.com" required/>
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
