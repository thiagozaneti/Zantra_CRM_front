import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sales from '../pages/Sales';
import { api } from '../lib/api';
import { receiptRows } from '../lib/saleReceipt';

vi.mock('../lib/api', () => ({ api: { getReferenceLocations: vi.fn(), getSaleProducts: vi.fn(), getSales: vi.fn(), getWorkstationStatus: vi.fn(), createSale: vi.fn(), getPrintJob: vi.fn(), printSale: vi.fn(), reverseSale: vi.fn() } }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../components/ConfirmDialog', () => ({ useConfirm: () => ({ prompt: vi.fn() }) }));
vi.mock('../components/Layout', () => ({ hasActionPermission: (permission: string) => ['sales:view', 'sales:create', 'sales:reverse'].includes(permission) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ADMINISTRADOR', locations: [{ id: 'bar-1' }] } }) }));
vi.mock('../components/RFIDCommandPanel', () => ({ default: ({ onSelect }: any) => <button onClick={() => onSelect({ comandaId: 'comanda-1', cardCode: '1234', valorTotal: 20, status: 'active' })}>Simular comanda</button> }));
vi.mock('../lib/uuid', () => ({ createUuid: () => 'requisicao-1' }));

const product = { id: 'p1', name: 'Refrigerante', sku: '123', unit: 'un', salePrice: 5, availableQuantity: 3 };

describe('Frente de vendas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getReferenceLocations).mockResolvedValue([{ id: 'bar-1', name: 'Bar', allowsSale: true }]);
    vi.mocked(api.getSaleProducts).mockResolvedValue([product]);
    vi.mocked(api.getSales).mockResolvedValue({ data: [], summary: { completedSales: 0, totalAmount: 0 } });
    vi.mocked(api.getWorkstationStatus).mockResolvedValue({ bound: false });
    vi.mocked(api.createSale).mockResolvedValue({ number: 1, totalAmount: 10, printWarning: { message: 'Sem impressora' } });
  });
  afterEach(() => { cleanup(); localStorage.clear(); });

  it('apresenta saldo, itens em tabela e conclui a venda com os valores corretos', async () => {
    render(<Sales/>);
    fireEvent.click(await screen.findByRole('button', { name: /Refrigerante/ }));
    expect(screen.getByRole('table')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade de Refrigerante' }));
    expect((screen.getByLabelText('Quantidade de Refrigerante') as HTMLInputElement).value).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Simular comanda' }));
    expect(screen.getByText('Saldo disponível').parentElement?.textContent).toContain('20,00');
    expect((screen.getByLabelText('Forma de pagamento') as HTMLSelectElement).value).toBe('COMANDA');
    fireEvent.click(screen.getByRole('button', { name: 'Concluir venda' }));
    await waitFor(() => expect(api.createSale).toHaveBeenCalledWith(expect.objectContaining({
      locationId: 'bar-1', paymentMethod: 'COMANDA', comandaId: 'comanda-1', printReceipt: true,
      items: [{ productId: 'p1', quantity: 2, unitPrice: 5 }],
    })));
    await waitFor(() => expect(screen.getByText(/Nenhum item na venda/)).toBeTruthy());
  });

  it('permite pesquisar e remover um item', async () => {
    render(<Sales/>);
    fireEvent.change(await screen.findByLabelText('Código ou descrição do produto'), { target: { value: '123' } });
    fireEvent.click(await screen.findByRole('button', { name: /Refrigerante/ }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('Refrigerante')).toBeTruthy();
    fireEvent.click(within(table).getByRole('button', { name: 'Remover Refrigerante' }));
    expect(screen.getByText(/Nenhum item na venda/)).toBeTruthy();
  });
});

it('PDF apresenta códigos, quantidade e valores reais dos itens', () => {
  const rows = receiptRows({ number: 10, createdAt: '2026-01-01T00:00:00Z', status: 'CONCLUIDA', location: { name: 'Bar' }, registeredBy: { name: 'Operador' }, paymentMethod: 'PIX', subtotal: '10.00', discount: '0.00', totalAmount: '10.00', items: [{ product: { name: 'Refrigerante', sku: '123', unit: 'un' }, quantity: 2, unitPrice: '5.00', total: '10.00' }] });
  expect(rows[0][1]).toBe('123');
  expect(rows[0][2]).toBe('Refrigerante');
  expect(rows[0][3]).toBe('2 un');
  expect(rows[0][5]).toContain('10,00');
});
