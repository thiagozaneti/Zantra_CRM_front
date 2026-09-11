import ZantraAgentPanel from '../components/ZantraAgentPanel';

export default function PrinterSettings() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-surface-900">Impressão e terminais</h1><p className="mt-1 text-surface-500">Pareamento dos Zantra Agents, vínculo desta estação, fila e configuração remota das impressoras</p></div><ZantraAgentPanel/></div>;
}
