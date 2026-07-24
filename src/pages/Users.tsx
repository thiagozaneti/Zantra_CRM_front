import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const roles = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gestor' },
  { value: 'COLD_ROOM_RESPONSIBLE', label: 'Resp. Câmara Fria' },
  { value: 'BAR_RESPONSIBLE', label: 'Resp. Bar' },
  { value: 'PRODUCT_REGISTER', label: 'Cadastro de Produtos' },
  { value: 'READ_ONLY', label: 'Consulta' },
];

interface User { id: string; name: string; email: string; role: string; active: boolean; createdAt: string; }

export default function Users() {
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
      } else {
        await api.createUser(form);
      }
      setShowModal(false); loadUsers();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este usuário?')) return;
    try { await api.deleteUser(id); loadUsers(); }
    catch (err: any) { alert(err.message); }
  };

  const getRoleLabel = (role: string) => roles.find((r) => r.value === role)?.label || role;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-zantra-600 hover:bg-zantra-500 text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zantra-500" size={18} />
        <input placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10" />
      </div>

      <div className="bg-zantra-800 rounded-xl border border-zantra-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zantra-700">
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Perfil</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-zantra-400">Carregando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-zantra-400">Nenhum usuário encontrado</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-zantra-700/50 hover:bg-zantra-700/30">
                  <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-zantra-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-zantra-700 text-zantra-300">
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} className="text-zantra-400 hover:text-white"><Edit2 size={16} /></button>
                      {u.active && <button onClick={() => handleDeactivate(u.id)} className="text-yellow-400 hover:text-yellow-300"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zantra-800 rounded-xl border border-zantra-700 w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-zantra-700">
              <h2 className="text-lg font-semibold text-white">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zantra-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div><label className="block text-sm text-zantra-400 mb-1">Nome *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" /></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Email *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" /></div>
              <div><label className="block text-sm text-zantra-400 mb-1">{editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full" /></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Perfil *</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full">{roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-zantra-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-zantra-400 hover:text-white">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-zantra-600 hover:bg-zantra-500 text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
