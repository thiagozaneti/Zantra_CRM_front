import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommandManagement from '../components/CommandManagement';
import { api } from '../lib/api';

const permissions = vi.hoisted(() => ({ create: false, update: false }));
vi.mock('../lib/api', () => ({ api: { getCommands: vi.fn(), getCommandPurchases: vi.fn(), createCommand: vi.fn(), updateCommandValue: vi.fn(), updateCommandStatus: vi.fn() } }));
vi.mock('../components/Layout', () => ({ hasActionPermission: (permission: string) => permission === 'commands:create' ? permissions.create : permissions.update }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  permissions.create = false;
  permissions.update = false;
  vi.mocked(api.getCommands).mockResolvedValue([{ id: '1', cardCode: '1234', totalAmount: 20, status: 'ATIVA', movements: [] }]);
});
afterEach(cleanup);

describe('Comandas', () => {
  it('permite consultar, mas não apresenta ações de alteração sem permissão', async () => {
    render(<CommandManagement/>);
    await screen.findByText('Cartão 1234');
    expect(screen.queryByRole('button', { name: 'Adicionar crédito' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cadastrar' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /Situação do cartão/ })).toBeNull();
  });

  it('bloqueia envios duplicados enquanto uma recarga está em andamento', async () => {
    permissions.update = true;
    vi.mocked(api.updateCommandValue).mockImplementation(() => new Promise(() => {}));
    render(<CommandManagement/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar crédito' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor' }), { target: { value: '10' } });
    const confirm = screen.getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(api.updateCommandValue).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Salvando...' }).hasAttribute('disabled')).toBe(true);
  });

  it('permite atualizar sem permitir cadastrar', async () => {
    permissions.update = true;
    render(<CommandManagement/>);
    expect(await screen.findByRole('button', { name: 'Adicionar crédito' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cadastrar' })).toBeNull();
  });

  it('localiza o cartão ao receber leitura RFID fora de um campo', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(10);
    render(<CommandManagement/>);
    await screen.findByText('Cartão 1234');
    for (const key of '1234') fireEvent.keyDown(window, { key });
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect((screen.getByLabelText('Buscar ou bipar cartão') as HTMLInputElement).value).toBe('1234'));
    vi.restoreAllMocks();
  });

  it('carrega compras somente ao abrir o cartão e oferece paginação', async () => {
    vi.mocked(api.getCommandPurchases).mockResolvedValue({ data: [{ id: 'venda', number: 7, createdAt: '2026-01-01', status: 'CONCLUIDA', totalAmount: 15, location: { name: 'Bar' }, items: [{ product: { name: 'Água', unit: 'un' }, quantity: 1, total: 15 }] }], pagination: { page: 1, pages: 2, total: 11 } });
    render(<CommandManagement/>);
    expect(api.getCommandPurchases).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: /Cartão 1234/ }));
    expect(await screen.findByText(/Venda #7/)).toBeTruthy();
    expect(screen.getByText(/Água/)).toBeTruthy();
    expect(api.getCommandPurchases).toHaveBeenCalledWith('1', 1);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(api.getCommandPurchases).toHaveBeenCalledWith('1', 2));
  });
});
