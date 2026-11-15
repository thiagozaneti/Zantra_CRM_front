import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Stock from '../pages/Stock';
import { api } from '../lib/api';
import { productLabel } from '../lib/productLabel';

vi.mock('../lib/api', () => ({ api: { getStock: vi.fn(), getReferenceLocations: vi.fn(), getReferenceProducts: vi.fn() } }));
vi.mock('../components/Layout', () => ({ hasActionPermission: () => false }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getReferenceLocations).mockResolvedValue([{ id: 'local', name: 'Bar', active: true }]);
  vi.mocked(api.getReferenceProducts).mockResolvedValue([]);
  vi.mocked(api.getStock).mockResolvedValue([
    { product: { id: 'a', name: 'Água', sku: 'A1', barcode: '12345', unit: 'un', minStock: 0, deletedAt: null }, location: { id: 'local' }, quantity: 3 },
    { product: { id: 'b', name: 'Refrigerante', sku: 'B1', barcode: '67890', unit: 'un', minStock: 0, deletedAt: '2026-01-01' }, location: { id: 'local' }, quantity: 2 },
  ]);
});
afterEach(cleanup);

it('pesquisa por código de barras e identifica produto excluído', async () => {
  render(<Stock/>);
  await waitFor(() => expect(screen.getAllByText('Água').length).toBeGreaterThan(0));
  fireEvent.change(screen.getByLabelText('Buscar produto'), { target: { value: '67890' } });
  expect(screen.queryByText('Água')).toBeNull();
  expect(screen.getAllByText('Refrigerante (produto excluído)').length).toBeGreaterThan(0);
});

it('preserva nomes normais e marca somente produtos excluídos', () => {
  expect(productLabel({ name: 'Água' })).toBe('Água');
  expect(productLabel({ name: 'Água', deletedAt: '2026-01-01' })).toContain('produto excluído');
});
