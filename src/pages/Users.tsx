import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const roles = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gestor' },
  { value: 'COLD_ROOM_RESPONSIBLE', label: 'Resp. Câmara Fria' },
  { value: 'BAR_RESPONSIBLE', label: 'Resp. Bar' },
  { value: 'PRODUCT_REGISTER', label: 'Cadastro de Produtos' },
  { value: 'READ_ONLY', label: 'Consulta' },
];

const roleColors: Record<string, string> = {
  ADMIN: 'bg-brand-100 text-brand-700',
  MANAGER: 'bg-emerald-100 text-emerald-700',
  COLD_ROOM_RESPONSIBLE: 'bg-blue-100 text-blue-700',
  BAR_RESPONSIBLE: 'bg-purple-100 text-purple-700',
  PRODUCT_REGISTER: 'bg-amber-100 text-amber-700',
  READ_ONLY: 'bg-surface-100 text-surface-600',
};

interface User { id: string; name: string; email: string; role: string; active: boolean; createdAt: string; }

export default function Users() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'READ_ONLY' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, [search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = search ? `search=${search}` : '';
      const result = await api.getUsers(params);
      setUsers(result);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openNew = () => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'READ_ONLY' }); setShowModal(true); setError(''); };
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setShowModal(true); setError(''); };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Nome e email são obrigatórios'); return; }
    if (!editing && !form.password) { setError('Senha é obrigatória para novos usuários'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        const data: any = { name: form.name, email: form.email, role: form.role };
        if (form.password) data.password = form.password;
        await api.updateUser(editing.id, data);
        showToast('success', 'Usuário atualizado com sucesso!');
      } else {
        await api.createUser(form);
        showToast('success', 'Usuário criado com sucesso!');
      }
      setShowModal(false); loadUsers();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({
      title: 'Desativar Usuário',
      message: 'Tem certeza que deseja desativar este usuário? Ele não conseguirá mais acessar o sistema.',
      confirmText: 'Desativar',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.deleteUser(id);
      showToast('success', 'Usuário desativado com sucesso!');
      loadUsers();
    }
    catch (err: any) { showToast('error', err.message); }
  };

  const getRoleLabel = (role: string) => roles.find((r) => r.value === role)?.label || role;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Usuários</h1>
          <p className="text-surface-500 mt-1">{users.length} usuários cadastrados</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
        <input placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-surface-400">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="col-span-full text-center py-12 text-surface-400">Nenhum usuário encontrado</div>
        ) : users.map((u, index) => (
          <div key={u.id} className="card p-5 hover:shadow-md transition-all duration-300 slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-200 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                  <span className="text-sm font-semibold text-surface-600">{u.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">{u.name}</h3>
                  <p className="text-sm text-surface-500">{u.email}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(u)} className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                  <Edit2 size={16} />
                </button>
                {u.active && (
                  <button onClick={() => handleDeactivate(u.id)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || 'bg-surface-100 text-surface-600'}`}>
                {getRoleLabel(u.role)}
              </span>
              <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-surface-300'}`}></span>
              <span className="text-xs text-surface-500">{u.active ? 'Ativo' : 'Inativo'}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 fade-in">
          <div className="bg-white w-full lg:max-w-md lg:rounded-2xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden shadow-xl scale-in rounded-t-2xl lg:rounded-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-4 lg:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Nome *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">{editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Perfil *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full">
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-4 lg:px-6 py-4 border-t border-surface-200 bg-surface-50 sticky bottom-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 lg:flex-none">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 lg:flex-none disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
