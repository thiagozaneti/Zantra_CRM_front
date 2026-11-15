import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommandManagement from '../components/CommandManagement';
import { api } from '../lib/api';

const permissions = vi.hoisted(() => ({ create: false, update: false }));
vi.mock('../lib/api', () => ({ api: { getCommands: vi.fn(), createCommand: vi.fn(), updateCommandValue: vi.fn(), updateCommandStatus: vi.fn() } }));
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
});
