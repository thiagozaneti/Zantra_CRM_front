import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '../lib/api';
import { hasActionPermission } from '../components/Layout';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { quantityStep } from '../lib/quantity';
import { useAuth } from '../context/AuthContext';

const statusLabels: Record<string, string> = { REQUESTED: 'Aguardando resposta', PREPARING: 'Aceito / em separação', SENT: 'Enviado', RECEIVED: 'Recebido', REJECTED: 'Recusado', CANCELLED: 'Cancelado' };
const statusColors: Record<string, string> = { REQUESTED: 'bg-amber-50 text-amber-700', PREPARING: 'bg-blue-50 text-blue-700', SENT: 'bg-purple-50 text-purple-700', RECEIVED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-red-50 text-red-700', CANCELLED: 'bg-surface-100 text-surface-600' };

export default function Supplies() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ sourceId: '', destinationId: '', notes: '', items: [] as any[] });
  const [error, setError] = useState('');
  const canCreate = hasActionPermission('supplies:create');
  const canManage = hasActionPermission('supplies:manage');
  const { showToast } = useToast();
  const { confirm, prompt } = useConfirm();
  const userLocationIds = user?.locations?.map((location) => location.id) || (user?.assignedLocationId ? [user.assignedLocationId] : []);
  const manager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const load = async () => { try { const result = await api.getSupplyRequests(); setRequests(result.data); } catch (err: any) { showToast('error', err.message); } };
  useEffect(() => { load(); Promise.all([api.getReferenceLocations(), api.getReferenceProducts()]).then(([locs, prods]) => { setLocations(locs); setProducts(prods); }); }, []);
  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: 1 }] });
  const save = async () => {
    if (!form.sourceId || !form.destinationId) return setError('Selecione de qual local está solicitando e para qual local será enviado');
    try { await api.createSupplyRequest(form); setShowModal(false); showToast('success', 'Solicitação enviada ao local responsável'); load(); } catch (err: any) { setError(err.message); }
  };
  const act = async (request: any, action: string) => {
    let message: string | undefined;
    if (action === 'reject') {
      message = await prompt({ title: `Recusar solicitação #${request.number}`, message: 'Informe por que o local não poderá atender. A justificativa será enviada ao solicitante.', label: 'Motivo da recusa', placeholder: 'Ex.: item sem saldo, quantidade indisponível ou previsão de reposição', confirmText: 'Recusar solicitação', type: 'danger' }) || undefined;
      if (!message) return;
    } else {
      const labels: Record<string, string> = { accept: 'Aceitar e iniciar separação', send: 'Confirmar envio', receive: 'Confirmar recebimento', cancel: 'Cancelar solicitação' };
      const ok = await confirm({ title: labels[action], message: `Confirma esta ação na solicitação #${request.number}?`, confirmText: 'Confirmar', type: action === 'cancel' ? 'danger' : 'info' });
      if (!ok) return;
    }
    try { await api.updateSupplyRequest(request.id, action, message); showToast('success', action === 'reject' ? 'Solicitação recusada e solicitante avisado' : 'Solicitação atualizada'); load(); } catch (err: any) { showToast('error', err.message); }
  };

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Abastecimento</h1><p className="text-sm text-surface-500">Pedidos direcionados entre locais, com aceite e confirmação</p></div>{canCreate && <button className="btn-primary flex gap-2" onClick={() => { setForm({ sourceId: '', destinationId: '', notes: '', items: [{ productId: '', quantity: 1 }] }); setError(''); setShowModal(true); }}><Plus size={17}/>Nova solicitação</button>}</div>
    <div className="grid gap-3">{requests.map((request) => {
      const sourceResponsible = manager || (canManage && userLocationIds.includes(request.source?.id));
      const destinationResponsible = manager || userLocationIds.includes(request.destination.id);
      const requester = request.requestedBy.id === user?.id;
      return <div key={request.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">Solicitação #{request.number}</p><p className="text-sm text-surface-600 mt-0.5"><strong>{request.source?.name}</strong> → <strong>{request.destination.name}</strong></p><p className="text-xs text-surface-500 mt-1">Solicitado por {request.requestedBy.name}{request.handledBy ? ` • Respondido por ${request.handledBy.name}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[request.status]}`}>{statusLabels[request.status]}</span></div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">{request.items.map((item: any) => <span key={item.id} className="rounded bg-surface-100 px-2 py-1">{item.product.name}: {item.quantity} {item.product.unit}</span>)}</div>
        {request.notes && <p className="mt-3 text-sm text-surface-600"><strong>Observação:</strong> {request.notes}</p>}
        {request.responseMessage && <div className={`mt-3 rounded-lg border p-3 text-sm ${request.status === 'REJECTED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}><strong>Resposta do local:</strong> {request.responseMessage}</div>}
        {!request.source && request.status === 'REQUESTED' && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Solicitação antiga sem origem definida. Cancele-a e abra um novo pedido direcionado.</p>}
        <div className="mt-4 flex flex-wrap gap-2">{request.source && request.status === 'REQUESTED' && sourceResponsible && <><button className="btn-primary" onClick={() => act(request, 'accept')}>Aceitar e separar</button><button className="btn-secondary text-red-600" onClick={() => act(request, 'reject')}>Recusar / sem estoque</button></>}{request.status === 'REQUESTED' && (requester || manager) && <button className="btn-secondary" onClick={() => act(request, 'cancel')}>Cancelar pedido</button>}{request.status === 'PREPARING' && sourceResponsible && <button className="btn-primary" onClick={() => act(request, 'send')}>Confirmar envio</button>}{request.status === 'SENT' && destinationResponsible && <button className="btn-primary" onClick={() => act(request, 'receive')}>Confirmar recebimento</button>}</div>
      </div>;
    })}</div>
    {!requests.length && <div className="rounded-xl border border-dashed bg-white py-12 text-center text-surface-500">Nenhuma solicitação de abastecimento encontrada.</div>}
    {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-xl bg-white shadow-xl"><div className="flex justify-between border-b p-4"><h2 className="font-semibold">Nova solicitação</h2><button onClick={() => setShowModal(false)}><X size={19}/></button></div><div className="max-h-[70vh] space-y-4 overflow-auto p-5">{error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}<div className="grid sm:grid-cols-2 gap-3"><div><label className="text-sm">Solicitar de *</label><select className="mt-1 w-full" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}><option value="">Selecione a origem...</option>{locations.filter((location) => location.allowsTransferOrigin && location.id !== form.destinationId).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div><div><label className="text-sm">Entregar em *</label><select className="mt-1 w-full" value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })}><option value="">Selecione o destino...</option>{locations.filter((location) => location.allowsTransferDestination && location.id !== form.sourceId).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div></div>{form.items.map((item, index) => { const product = products.find((row) => row.id === item.productId); return <div key={index} className="grid grid-cols-[1fr_110px_32px] gap-2"><select value={item.productId} onChange={(e) => setForm({ ...form, items: form.items.map((row, i) => i === index ? { ...row, productId: e.target.value } : row) })}><option value="">Produto...</option>{products.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><input type="number" min={quantityStep(product?.unit)} step={quantityStep(product?.unit)} value={item.quantity} onChange={(e) => setForm({ ...form, items: form.items.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row) })}/><button onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}><X size={16}/></button></div>})}<button className="text-sm text-brand-600" onClick={addItem}>+ Adicionar produto</button><textarea className="w-full" rows={2} placeholder="Observações ou urgência do pedido" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></div><div className="flex justify-end gap-2 border-t p-4"><button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn-primary" onClick={save}>Enviar solicitação</button></div></div></div>}
  </div>;
}
