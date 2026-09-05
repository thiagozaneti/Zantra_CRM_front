import CommandManagement from '../components/CommandManagement';

export default function Commands() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-surface-900">Comandas</h1><p className="mt-1 text-surface-500">Cadastro, recarga, ajuste de saldo e histórico dos cartões RFID</p></div><CommandManagement/></div>;
}
