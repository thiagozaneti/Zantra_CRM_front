import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

interface Location { id: string; name: string; type: string; description: string; active: boolean; }

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: '', type: 'COLD_ROOM', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadLocations(); }, [search, typeFilter]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const result = await api.getLocations(params.toString());
      setLocations(result);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openNew = () => { setEditing(null); setForm({ name: '', type: 'COLD_ROOM', description: '' }); setShowModal(true); setError(''); };
  const openEdit = (l: Location) => { setEditing(l); setForm({ name: l.name, type: l.type, description: l.description || '' }); setShowModal(true); setError(''); };

  const handleSave = async () => {
    if (!form.name) { setError('Nome é obrigatório'); return; }
    setSaving(true); setError('');
    try {
      if (editing) { await api.updateLocation(editing.id, form); }
      else { await api.createLocation(form); }
      setShowModal(false); loadLocations();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este local?')) return;
    try { await api.deleteLocation(id); loadLocations(); }
    catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Locais</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-zantra-600 hover:bg-zantra-500 text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> Novo Local
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zantra-500" size={18} />
          <input placeholder="Buscar local..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">Todos os tipos</option>
          <option value="COLD_ROOM">Câmara Fria</option>
          <option value="BAR">Bar</option>
        </select>
      </div>

      <div className="bg-zantra-800 rounded-xl border border-zantra-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zantra-700">
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zantra-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-zantra-400">Carregando...</td></tr>
              ) : locations.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-zantra-400">Nenhum local encontrado</td></tr>
              ) : locations.map((l) => (
                <tr key={l.id} className="border-b border-zantra-700/50 hover:bg-zantra-700/30">
                  <td className="px-4 py-3 text-white font-medium">{l.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.type === 'COLD_ROOM' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {l.type === 'COLD_ROOM' ? 'Câmara Fria' : 'Bar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zantra-300">{l.description || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {l.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(l)} className="text-zantra-400 hover:text-white"><Edit2 size={16} /></button>
                      {l.active && <button onClick={() => handleDelete(l.id)} className="text-yellow-400 hover:text-yellow-300"><Trash2 size={16} /></button>}
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
              <h2 className="text-lg font-semibold text-white">{editing ? 'Editar Local' : 'Novo Local'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zantra-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div><label className="block text-sm text-zantra-400 mb-1">Nome *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" /></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Tipo *</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full"><option value="COLD_ROOM">Câmara Fria</option><option value="BAR">Bar</option></select></div>
              <div><label className="block text-sm text-zantra-400 mb-1">Descrição</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" rows={2} /></div>
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
