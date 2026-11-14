import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, PackagePlus, ClipboardList, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { hasPermission } from '../components/Layout';
const supplyStatus: Record<string, string> = { SOLICITADA: 'Solicitado', EM_PREPARACAO: 'Em separação', ENVIADA: 'Enviado' };

export default function Pending() {
  const [data, setData] = useState<any>(null); const [error, setError] = useState(false);
  const load = () => { setError(false); api.getPending().then(setData).catch(() => setError(true)); };
  useEffect(() => { load(); }, []);
  if (error && !data) return <div role="alert" className="space-y-3 rounded-lg border bg-white p-8 text-center text-surface-700"><p>Não foi possível carregar as pendências. Confira a conexão e tente novamente.</p><button className="btn-secondary" onClick={load}>Tentar novamente</button></div>;
  if (!data) return <div role="status" className="p-8 text-center text-surface-600">Carregando pendências...</div>;
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold">Central de Pendências</h1><p className="text-sm text-surface-500">{data.counts.total} item(ns) exigem atenção</p></div><div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[['Transferências', data.counts.transfers], ['Abastecimentos', data.counts.supplies], ['Inventários', data.counts.inventories || 0], ['Impressões', data.counts.printJobs || 0], ['Estoque baixo', data.counts.lowStock]].map(([label, value]) => <div className="rounded-lg border bg-white p-4" key={String(label)}><p className="text-xs text-surface-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>
    <PendingSection title="Transferências" icon={ArrowLeftRight} to={hasPermission('transfers') ? '/transfers' : undefined}>{data.transfers.map((row: any) => <Row key={row.id} title={row.product.name} text={`${row.origin.name} → ${row.destination.name}`} status={row.status === 'PENDENTE_APROVACAO' ? 'Aguardando aprovação' : 'Aguardando recebimento'}/>)}</PendingSection>
    <PendingSection title="Solicitações de abastecimento" icon={PackagePlus} to={hasPermission('supplies') ? '/supplies' : undefined}>{data.supplies.map((row: any) => <Row key={row.id} title={`Solicitação #${row.number}`} text={`${row.source?.name || 'Origem a definir'} → ${row.destination.name}`} status={supplyStatus[row.status] || row.status}/>)}</PendingSection>
    <PendingSection title="Inventários físicos" icon={ClipboardList} to={hasPermission('inventory') ? '/inventories' : undefined}>{(data.inventories || []).map((row: any) => <Row key={row.id} title={`Inventário #${row.number}`} text={row.location.name} status={row.status === 'PENDENTE_APROVACAO' ? 'Aguardando aprovação' : 'Recontagem necessária'}/>)}</PendingSection>
    <PendingSection title="Impressões" icon={Printer} to={hasPermission('printer') ? '/printer' : undefined}>{(data.printJobs || []).map((row: any) => <Row key={row.id} title={`${row.type === 'VENDA' ? 'Comprovante' : 'Teste'} · ${row.terminal.name}`} text={row.terminal.location.name} status={row.status === 'FALHOU' ? 'Falha na impressão' : 'Aguardando a estação'}/>)}</PendingSection>
    <PendingSection title="Estoque baixo" icon={AlertTriangle} to={hasPermission('stock') ? '/stock' : undefined}>{data.lowStock.map((row: any) => <Row key={row.id} title={row.product.name} text={row.location.name} status={`${row.quantity} ${row.product.unit} · mínimo ${row.effectiveMinStock}`}/>)}</PendingSection>
  </div>;
}
function PendingSection({ title, icon: Icon, children, to }: any) { const rows = Array.isArray(children) ? children : children ? [children] : []; return <section className="rounded-lg border bg-white"><div className="flex flex-wrap items-center gap-2 border-b p-4"><Icon size={19}/><h2 className="font-semibold">{title}</h2><span className="text-sm text-surface-600">({rows.length})</span>{to && <Link className="ml-auto text-sm font-medium text-brand-700 underline" to={to}>Abrir {title.toLocaleLowerCase('pt-BR')}</Link>}</div><div className="divide-y">{rows.length ? rows : <p className="p-6 text-center text-sm text-surface-600">Nenhuma pendência</p>}</div></section>; }
function Row({ title, text, status }: any) { return <div className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-surface-400">{text}</p></div><span className="text-xs font-medium text-amber-700">{status}</span></div>; }
