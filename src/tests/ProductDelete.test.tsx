import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Products from '../pages/Products';
import { api } from '../lib/api';

const access = vi.hoisted(() => ({ remove: false }));
const confirmAction = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', () => ({ api: { getProducts: vi.fn(), getCategories: vi.fn(), getUnits: vi.fn(), deleteProduct: vi.fn() } }));
vi.mock('../components/Layout', () => ({ hasActionPermission: (permission: string) => permission === 'products:delete' && access.remove }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../components/ConfirmDialog', () => ({ useConfirm: () => ({ confirm: confirmAction }) }));

beforeEach(() => {
  vi.clearAllMocks();
  access.remove = false;
  confirmAction.mockResolvedValue(true);
  vi.mocked(api.getProducts).mockResolvedValue({ data: [{ id: 'p', name: 'Água', unit: 'un', active: true, supplyFlow: 'DIRETO_BAR_PERMITIDO', minStock: 0 }], pagination: { page: 1, pages: 1, total: 1 } });
  vi.mocked(api.getCategories).mockResolvedValue([]);
  vi.mocked(api.getUnits).mockResolvedValue([]);
  vi.mocked(api.deleteProduct).mockResolvedValue({});
});
afterEach(cleanup);

it('esconde a exclusão sem a permissão específica', async () => {
  render(<Products/>);
  await screen.findAllByText('Água');
  expect(screen.queryByRole('button', { name: 'Excluir Água' })).toBeNull();
});

it('confirma e exclui com a permissão específica', async () => {
  access.remove = true;
  render(<Products/>);
  const buttons = await screen.findAllByRole('button', { name: 'Excluir Água', hidden: true });
  fireEvent.click(buttons[0]);
  await waitFor(() => expect(api.deleteProduct).toHaveBeenCalledWith('p'));
  expect(confirmAction).toHaveBeenCalled();
});
