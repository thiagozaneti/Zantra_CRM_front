import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Plus, Search, Edit2, Trash2, X, Warehouse, Store } from 'lucide-react';

interface Location { id: string; name: string; type: string; description: string; active: boolean; }

export default function Locations() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
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
      if (editing) {
        await api.updateLocation(editing.id, form);
        showToast('success', 'Local atualizado com sucesso!');
      } else {
        await api.createLocation(form);
        showToast('success', 'Local criado com sucesso!');
      }
      setShowModal(false); loadLocations();
    } catch (err: any) { setError(err.message); showToast('error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Desativar Local',
      message: 'Tem certeza que deseja desativar este local? Ele não aparecerá mais nos selects.',
      confirmText: 'Desativar',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.deleteLocation(id);
      showToast('success', 'Local desativado com sucesso!');
      loadLocations();
    }
    catch (err: any) { showToast('error', err.message); }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-surface-900">Locais</h1>
          <p className="text-surface-500 mt-1 text-sm">{locations.length} locais cadastrados</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo Local
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
          <input placeholder="Buscar local..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">Todos os tipos</option>
          <option value="COLD_ROOM">Câmara Fria</option>
          <option value="BAR">Bar</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-surface-400">Carregando...</div>
        ) : locations.length === 0 ? (
          <div className="col-span-full text-center py-12 text-surface-400">Nenhum local encontrado</div>
        ) : locations.map((l, index) => (
          <div key={l.id} className="card p-4 lg:p-5 hover:shadow-md transition-all duration-300 slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${l.type === 'COLD_ROOM' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                  {l.type === 'COLD_ROOM' ? <Warehouse size={20} className="text-blue-600" /> : <Store size={20} className="text-purple-600" />}
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">{l.name}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${l.type === 'COLD_ROOM' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {l.type === 'COLD_ROOM' ? 'Câmara Fria' : 'Bar'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(l)} className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                  <Edit2 size={16} />
                </button>
                {l.active && (
                  <button onClick={() => handleDelete(l.id)} className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            {l.description && <p className="text-sm text-surface-500 mb-3">{l.description}</p>}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${l.active ? 'bg-emerald-500' : 'bg-surface-300'}`}></span>
              <span className="text-xs text-surface-500">{l.active ? 'Ativo' : 'Inativo'}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 fade-in">
          <div className="bg-white w-full lg:max-w-md lg:rounded-2xl max-h-[95vh] lg:max-h-[90vh] overflow-hidden shadow-xl scale-in rounded-t-2xl lg:rounded-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">{editing ? 'Editar Local' : 'Novo Local'}</h2>
              <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-4 lg:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Nome *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Tipo *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full">
                  <option value="COLD_ROOM">Câmara Fria</option>
                  <option value="BAR">Bar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Descrição</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" rows={2} />
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
