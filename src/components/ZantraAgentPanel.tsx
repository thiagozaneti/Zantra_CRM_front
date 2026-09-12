import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Link2, Printer, RefreshCw, RotateCcw, ShieldOff, Trash2, Unlink, Wifi, WifiOff, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { hasActionPermission } from './Layout';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

const statusTone: Record<string, string> = {
  PENDENTE: 'bg-amber-50 text-amber-700 border-amber-200', PROCESSANDO: 'bg-blue-50 text-blue-700 border-blue-200',
  IMPRESSO: 'bg-emerald-50 text-emerald-700 border-emerald-200', FALHOU: 'bg-red-50 text-red-700 border-red-200',
  CANCELADO: 'bg-surface-100 text-surface-500 border-surface-200',
};

export default function ZantraAgentPanel() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canManage = hasActionPermission('printer:manage');
  const [terminals, setTerminals] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [printers, setPrinters] = useState<any[]>([]);
  const [workstation, setWorkstation] = useState<any>({ bound: false, terminal: null });
  const [bindingCode, setBindingCode] = useState('');
  const [stationLabel, setStationLabel] = useState('');
  const [pairing, setPairing] = useState({ terminalName: '', locationId: '', defaultForLocation: false });
  const [generatedPairing, setGeneratedPairing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [now, setNow] = useState(Date.now());

  const selected = useMemo(() => terminals.find((terminal) => terminal.id === selectedId) || null, [terminals, selectedId]);
  const pairingSeconds = generatedPairing ? Math.max(0, Math.ceil((new Date(generatedPairing.expiresAt).getTime() - now) / 1000)) : 0;

  const load = async () => {
    setLoading(true);
    try {
      const [terminalData, jobData, locationData, workstationData] = await Promise.all([
        api.getPrinterTerminals(), api.getPrintJobs('limit=50'), api.getReferenceLocations(), api.getWorkstationStatus(),
      ]);
      let currentWorkstation = workstationData;
      const lastRenewal = Number(localStorage.getItem('zantra_workstation_renewed_at') || 0);
      if (currentWorkstation.bound && Date.now() - lastRenewal > 24 * 60 * 60_000) { currentWorkstation = await api.renewWorkstation(); localStorage.setItem('zantra_workstation_renewed_at', String(Date.now())); }
      setTerminals(terminalData); setJobs(jobData.data); setLocations(locationData); setWorkstation(currentWorkstation);
      setSelectedId((current) => terminalData.some((item: any) => item.id === current) ? current : terminalData[0]?.id || '');
    } catch (error: any) { showToast('error', error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!selectedId) return setPrinters([]);
    api.getTerminalPrinters(selectedId).then(setPrinters).catch(() => setPrinters([]));
  }, [selectedId, terminals]);

  const run = async (key: string, action: () => Promise<any>, message: string) => {
    setBusy(key);
    try { await action(); showToast('success', message); await load(); }
    catch (error: any) { showToast('error', error.message); }
    finally { setBusy(''); }
  };

  const generatePairing = async () => {
    if (!pairing.terminalName.trim() || !pairing.locationId) return showToast('warning', 'Informe o nome do terminal e o local.');
    setBusy('pairing');
    try { const result = await api.createPrinterPairing(pairing); setGeneratedPairing(result); showToast('success', 'Código gerado. Informe-o no Zantra Agent desta máquina.'); }
    catch (error: any) { showToast('error', error.message); }
    finally { setBusy(''); }
  };

  const bind = () => run('bind', async () => { const result = await api.bindWorkstation(bindingCode, stationLabel || undefined); setWorkstation(result); setBindingCode(''); }, 'Navegador vinculado permanentemente a este terminal.');
  const unbind = async () => {
    if (!(await confirm({ title: 'Desvincular esta estação?', message: 'Este navegador deixará de direcionar vendas para a impressora atual. O Agent continuará pareado.', confirmText: 'Desvincular', type: 'warning' }))) return;
    await run('unbind', async () => { await api.unbindWorkstation(); localStorage.removeItem('zantra_workstation_renewed_at'); setWorkstation({ bound: false, terminal: null }); }, 'Estação desvinculada.');
  };
  const revoke = async () => {
    if (!selected || !(await confirm({ title: `Revogar ${selected.name}?`, message: 'O Agent e todos os vínculos deste terminal perderão acesso imediatamente.', confirmText: 'Revogar terminal', type: 'danger' }))) return;
    await run('revoke', () => api.revokePrinterTerminal(selected.id), 'Terminal revogado.');
  };
  const remove = async () => {
    if (!selected || !(await confirm({ title: `Remover ${selected.name}?`, message: 'O terminal será removido da operação, perderá o acesso imediatamente e seus trabalhos pendentes serão cancelados. O histórico de impressão será preservado para auditoria.', confirmText: 'Remover terminal', type: 'danger' }))) return;
    await run('remove', () => api.deletePrinterTerminal(selected.id), 'Terminal removido do sistema.');
  };

  return <div className="space-y-5">
    <section className="rounded-xl border border-surface-200 bg-white p-4 lg:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><Link2 size={18} className="text-brand-600"/><h2 className="font-semibold">Impressora deste computador</h2></div><p className="mt-1 text-xs text-surface-500">O vínculo fica salvo neste navegador e não é removido ao sair da conta.</p></div>
        <button className="btn-secondary flex items-center gap-2" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Atualizar</button>
      </div>
      {workstation.bound ? <div className="mt-4 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3"><span className="mt-0.5"><CheckCircle2 size={20} className="text-emerald-600"/></span><div><p className="font-medium text-emerald-900">{workstation.terminal.name}</p><p className="text-xs text-emerald-700">{workstation.terminal.locationName} · {workstation.terminal.online ? 'Agent online' : 'Agent offline'} · {workstation.terminal.activePrinterName || 'Impressora não configurada'}</p></div></div>
        <button className="btn-secondary flex items-center gap-2" onClick={() => void unbind()} disabled={busy === 'unbind'}><Unlink size={15}/>Desvincular</button>
      </div> : <div className="mt-4 grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 md:grid-cols-[1fr_1fr_auto]">
        <input value={bindingCode} onChange={(event) => setBindingCode(event.target.value.toUpperCase())} placeholder="Código exibido pelo Agent" maxLength={30}/>
        <input value={stationLabel} onChange={(event) => setStationLabel(event.target.value)} placeholder="Nome desta estação (opcional)" maxLength={200}/>
        <button className="btn-primary" onClick={() => void bind()} disabled={busy === 'bind' || bindingCode.trim().length < 6}>Vincular navegador</button>
      </div>}
    </section>

    {canManage && <section className="rounded-xl border border-surface-200 bg-white p-4 lg:p-5">
      <div><h2 className="font-semibold">Parear um novo Agent</h2><p className="mt-1 text-xs text-surface-500">Gere o código uma vez e informe-o na instalação do computador correspondente.</p></div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
        <input value={pairing.terminalName} onChange={(event) => setPairing({ ...pairing, terminalName: event.target.value })} placeholder="Ex.: Caixa Bocha 01" maxLength={200}/>
        <select value={pairing.locationId} onChange={(event) => setPairing({ ...pairing, locationId: event.target.value })}><option value="">Selecione o local</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pairing.defaultForLocation} onChange={(event) => setPairing({ ...pairing, defaultForLocation: event.target.checked })}/>Padrão do local</label>
        <button className="btn-primary" onClick={() => void generatePairing()} disabled={busy === 'pairing'}>Gerar código</button>
      </div>
      {generatedPairing && <div className={`mt-4 rounded-lg border p-4 ${pairingSeconds ? 'border-brand-200 bg-brand-50' : 'border-red-200 bg-red-50'}`}><p className="text-xs font-medium uppercase tracking-wide text-surface-500">Código de uso único</p><div className="mt-1 flex flex-wrap items-end justify-between gap-3"><p className="font-mono text-2xl font-bold tracking-widest text-surface-900">{generatedPairing.pairingCode}</p><p className="flex items-center gap-1 text-sm text-surface-600"><Clock3 size={14}/>{pairingSeconds ? `Expira em ${Math.floor(pairingSeconds / 60)}:${String(pairingSeconds % 60).padStart(2, '0')}` : 'Código expirado'}</p></div></div>}
    </section>}

    <section className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
        <div className="border-b border-surface-100 px-4 py-3"><h2 className="font-semibold">Terminais</h2><p className="text-xs text-surface-500">{terminals.length} cadastrado(s)</p></div>
        <div className="max-h-[560px] divide-y divide-surface-100 overflow-auto">{terminals.map((terminal) => <button key={terminal.id} onClick={() => setSelectedId(terminal.id)} className={`w-full p-4 text-left transition ${selectedId === terminal.id ? 'bg-brand-50' : 'hover:bg-surface-50'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-surface-900">{terminal.name}</p><p className="truncate text-xs text-surface-500">{terminal.location?.name}</p></div>{terminal.status === 'REVOGADO' ? <ShieldOff size={17} className="text-red-500"/> : terminal.online ? <Wifi size={17} className="text-emerald-500"/> : <WifiOff size={17} className="text-amber-500"/>}</div><p className="mt-2 truncate text-xs text-surface-400">{terminal.activePrinterName || 'Sem impressora ativa'}</p></button>)}</div>
        {!terminals.length && <p className="p-8 text-center text-sm text-surface-400">Nenhum Agent pareado.</p>}
      </div>

      <div className="space-y-4">{selected ? <>
        <div className="rounded-xl border border-surface-200 bg-white p-4 lg:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{selected.name}</h2>{selected.defaultForLocation && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">PADRÃO</span>}</div><p className="text-sm text-surface-500">{selected.location?.name} · {selected.machineName || 'Máquina ainda não informada'} · Agent {selected.agentVersion || '—'}</p></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${selected.status === 'REVOGADO' ? statusTone.FALHOU : selected.online ? statusTone.IMPRESSO : statusTone.PENDENTE}`}>{selected.status === 'REVOGADO' ? <XCircle size={13}/> : selected.online ? <CheckCircle2 size={13}/> : <AlertTriangle size={13}/>} {selected.status === 'REVOGADO' ? 'Revogado' : selected.online ? 'Online' : 'Offline'}</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="Impressora ativa" value={selected.activePrinterName || 'Não configurada'}/><Info label="Disponibilidade" value={selected.printerAvailable ? 'Disponível' : 'Indisponível'}/><Info label="Último heartbeat" value={selected.lastHeartbeatAt ? new Date(selected.lastHeartbeatAt).toLocaleString('pt-BR') : 'Nunca conectado'}/></div>
          {canManage && selected.status !== 'REVOGADO' && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><select value={selected.locationId} onChange={(event) => void run('location', () => api.updatePrinterTerminal(selected.id, { locationId: event.target.value }), 'Local do terminal atualizado.')}><option value="">Selecione o local</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>{!selected.defaultForLocation && <button className="btn-secondary" onClick={() => void run('default', () => api.updatePrinterTerminal(selected.id, { defaultForLocation: true }), 'Terminal definido como padrão do local.')}>Tornar padrão</button>}</div>}
          {selected.configurationError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{selected.configurationError}</p>}
          {canManage && selected.status !== 'REVOGADO' && <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><select value={selected.desiredPrinterName || ''} onChange={(event) => event.target.value && void run('printer', () => api.selectTerminalPrinter(selected.id, event.target.value), 'Configuração enviada ao Agent.')}><option value="">Selecione a impressora desejada</option>{printers.map((printer) => <option key={printer.id} value={printer.name}>{printer.name}{printer.available ? '' : ' (indisponível)'}</option>)}</select><div className="flex flex-wrap gap-2"><button className="btn-secondary flex items-center gap-2" onClick={() => void run('test', () => api.testTerminalPrinter(selected.id), 'Teste enfileirado.')}><Printer size={15}/>Teste</button><button className="btn-secondary flex items-center gap-2" onClick={() => void run('rotate', () => api.rotatePrinterCredential(selected.id), 'Rotação solicitada ao Agent.')}><RotateCcw size={15}/>Rotacionar</button><button title="Revogar acesso" className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => void revoke()}><ShieldOff size={15}/></button><button title="Remover terminal" className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700" disabled={busy === 'remove'} onClick={() => void remove()}><Trash2 size={15}/>Remover</button></div></div>}
          {canManage && selected.status === 'REVOGADO' && <div className="mt-4 flex justify-end"><button title="Remover terminal" className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700" disabled={busy === 'remove'} onClick={() => void remove()}><Trash2 size={15}/>Remover terminal</button></div>}
          {selected.configurationVersion !== selected.appliedConfigurationVersion && <p className="mt-2 text-xs text-amber-600">Aguardando o Agent aplicar a configuração v{selected.configurationVersion}.</p>}
        </div>
      </> : <div className="rounded-xl border border-dashed border-surface-300 p-10 text-center text-surface-400">Selecione um terminal.</div>}</div>
    </section>

    <section className="overflow-hidden rounded-xl border border-surface-200 bg-white"><div className="border-b border-surface-100 px-4 py-3"><h2 className="font-semibold">Fila e histórico recentes</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-surface-50 text-left text-xs uppercase text-surface-500">{['Data','Terminal','Tipo','Situação','Tentativas','Erro',''].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody>{jobs.map((job) => <tr key={job.id} className="border-t border-surface-100"><td className="whitespace-nowrap px-4 py-3">{new Date(job.createdAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3">{job.terminalName}</td><td className="px-4 py-3">{job.type}{job.reprint ? ' · Reimpressão' : ''}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-xs ${statusTone[job.status] || statusTone.CANCELADO}`}>{job.status}</span></td><td className="px-4 py-3">{job.attempts}/{job.maxAttempts}</td><td className="max-w-xs truncate px-4 py-3 text-xs text-red-600">{job.errorMessage || '—'}</td><td className="px-4 py-3"><div className="flex gap-2">{canManage && job.status === 'FALHOU' && <button className="text-brand-600" onClick={() => void run(`retry-${job.id}`, () => api.retryPrintJob(job.id), 'Trabalho reagendado.')}>Tentar novamente</button>}{canManage && ['PENDENTE','FALHOU'].includes(job.status) && <button className="text-red-600" onClick={() => void run(`cancel-${job.id}`, () => api.cancelPrintJob(job.id), 'Trabalho cancelado.')}>Cancelar</button>}</div></td></tr>)}</tbody></table></div>{!jobs.length && <p className="p-8 text-center text-sm text-surface-400">Nenhum trabalho de impressão.</p>}</section>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-surface-100 bg-surface-50 p-3"><p className="text-[11px] font-medium text-surface-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-surface-800">{value}</p></div>; }
