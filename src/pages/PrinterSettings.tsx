import ZantraAgentPanel from '../components/ZantraAgentPanel';

export default function PrinterSettings() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-surface-900">Impressora</h1><p className="mt-1 text-surface-500">Conexão com o Zantra Agent, seleção e teste da impressora térmica</p></div><ZantraAgentPanel/></div>;
}
