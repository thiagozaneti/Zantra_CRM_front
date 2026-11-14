import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Inventories from '../pages/Inventories';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: { getInventories: vi.fn(), getReferenceLocations: vi.fn(), getInventory: vi.fn(), countInventoryItem: vi.fn(), submitInventory: vi.fn() } }));
vi.mock('../components/Layout', () => ({ hasActionPermission: (value: string) => value === 'inventory:count' }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../components/ConfirmDialog', () => ({ useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true), prompt: vi.fn() }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'RESPONSAVEL_BAR' } }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getReferenceLocations).mockResolvedValue([]);
  vi.mocked(api.getInventories).mockResolvedValue([{ id: 'inv', number: 10, location: { name: 'Bar' }, createdBy: { name: 'Gestor' }, openedAt: '2026-01-01T12:00:00Z', _count: { items: 1 }, status: 'EM_CONTAGEM' }]);
  vi.mocked(api.getInventory).mockResolvedValue({ id: 'inv', number: 10, location: { name: 'Bar' }, status: 'EM_CONTAGEM', items: [{ id: 'item', status: 'PENDENTE', countedQuantity: null, product: { name: 'Produto', unit: 'un' } }] });
  vi.mocked(api.countInventoryItem).mockRejectedValue(new Error('Falha de comunicação'));
});
afterEach(cleanup);

it('não envia a contagem para aprovação quando salvar os itens falha', async () => {
  render(<Inventories/>);
  fireEvent.click(await screen.findByRole('button', { name: /Inventário #10/ }));
  await screen.findByText('Quantidade contada');
  const input = screen.getByRole('spinbutton');
  fireEvent.change(input, { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Concluir contagem' }));
  await waitFor(() => expect(api.countInventoryItem).toHaveBeenCalled());
  await screen.findByText(/Não foi possível salvar todas as contagens/);
  expect(api.submitInventory).not.toHaveBeenCalled();
});
