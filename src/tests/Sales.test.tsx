import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sales from '../pages/Sales';
import { api } from '../lib/api';
import { receiptRows } from '../lib/saleReceipt';

vi.mock('../lib/api', () => ({ api: { getReferenceLocations: vi.fn(), getSaleProducts: vi.fn(), getSales: vi.fn(), getWorkstationStatus: vi.fn(), createSale: vi.fn(), getPrintJob: vi.fn(), printSale: vi.fn(), reverseSale: vi.fn() } }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
const confirmChange = vi.hoisted(() => vi.fn());
vi.mock('../components/ConfirmDialog', () => ({ useConfirm: () => ({ prompt: vi.fn(), confirm: confirmChange }) }));
vi.mock('../components/Layout', () => ({ hasActionPermission: (permission: string) => ['sales:view', 'sales:create', 'sales:reverse'].includes(permission) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ADMINISTRADOR', locations: [{ id: 'bar-1' }] } }) }));
vi.mock('../components/RFIDCommandPanel', () => ({ default: ({ onSelect, cardInputRef }: any) => <><input aria-label="Número ou leitura da comanda" ref={cardInputRef}/><button onClick={() => onSelect({ comandaId: 'comanda-1', cardCode: '1234', valorTotal: 20, status: 'active' })}>Simular comanda</button></> }));
vi.mock('../lib/uuid', () => ({ createUuid: () => 'requisicao-1' }));

const product = { id: 'p1', name: 'Refrigerante', sku: '123', unit: 'un', salePrice: 5, availableQuantity: 3 };

describe('Frente de vendas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmChange.mockResolvedValue(true);
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
    expect(screen.queryByLabelText('Forma de pagamento')).toBeNull();
    expect(screen.getByText('Pagamento com saldo da comanda')).toBeTruthy();
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

  it('inicia na busca e conclui a venda ao confirmar a quantidade com Enter', async () => {
    render(<Sales/>);
    const search = await screen.findByLabelText('Código ou descrição do produto');
    await waitFor(() => expect(document.activeElement).toBe(search));
    fireEvent.change(search, { target: { value: '123' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    const quantity = await screen.findByLabelText('Quantidade (un)');
    expect(document.activeElement).toBe(quantity);
    expect(api.createSale).not.toHaveBeenCalled();
    fireEvent.change(quantity, { target: { value: '2' } });
    fireEvent.keyDown(quantity, { key: 'Enter' });
    await waitFor(() => expect(api.createSale).toHaveBeenCalledTimes(1));
    expect(api.createSale).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'PIX', items: [{ productId: 'p1', quantity: 2, unitPrice: 5 }] }));
  });

  it('guarda o local escolhido e restaura ao voltar ao PDV', async () => {
    vi.mocked(api.getReferenceLocations).mockResolvedValue([{ id: 'bar-1', name: 'Bar', allowsSale: true }, { id: 'bar-2', name: 'Outro bar', allowsSale: true }]);
    const view = render(<Sales/>);
    const select = await screen.findByLabelText('Local de venda *');
    await screen.findByRole('option', { name: 'Outro bar' });
    fireEvent.change(select, { target: { value: 'bar-2' } });
    expect(localStorage.getItem('zantra_sale_location_anonymous')).toBe('bar-2');
    view.unmount();
    render(<Sales/>);
    await waitFor(() => expect((screen.getByLabelText('Local de venda *') as HTMLSelectElement).value).toBe('bar-2'));
  });
  it('rejeita fração para unidade e quantidade acima do estoque', async () => {
    render(<Sales/>);
    const search = await screen.findByLabelText('Código ou descrição do produto');
    fireEvent.change(search, { target: { value: '123' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    const quantity = await screen.findByLabelText('Quantidade (un)');
    fireEvent.change(quantity, { target: { value: '0,42' } });
    fireEvent.keyDown(quantity, { key: 'Enter' });
    expect(screen.getByText(/quantidade inteira maior que zero/)).toBeTruthy();
    fireEvent.change(quantity, { target: { value: '4' } });
    fireEvent.keyDown(quantity, { key: 'Enter' });
    expect(screen.getByText(/Estoque insuficiente/)).toBeTruthy();
    expect(api.createSale).not.toHaveBeenCalled();
  });

  it('Shift+Enter volta à busca e não seleciona produto ambíguo sem escolha', async () => {
    vi.mocked(api.getSaleProducts).mockResolvedValue([product, { ...product, id: 'p2', name: 'Refrigerante zero', sku: '456' }]);
    render(<Sales/>);
    const search = await screen.findByLabelText('Código ou descrição do produto');
    await screen.findByRole('button', { name: /Refrigerante zero/ });
    fireEvent.change(search, { target: { value: 'Refrigerante' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    const quantity = await screen.findByLabelText('Quantidade (un)');
    fireEvent.keyDown(quantity, { key: 'Enter', shiftKey: true });
    expect(document.activeElement).toBe(search);
    fireEvent.change(search, { target: { value: 'Refriger' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(screen.getByText(/Há mais de um resultado/)).toBeTruthy();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(screen.getByText('Produto selecionado').parentElement?.textContent).toContain('Refrigerante zero');
    fireEvent.keyDown(screen.getByLabelText('Quantidade (un)'), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(search));
  });

  it('F6 prepara leitura da comanda e não envia venda sem identificação', async () => {
    render(<Sales/>);
    const search = await screen.findByLabelText('Código ou descrição do produto');
    fireEvent.click(await screen.findByRole('button', { name: /Refrigerante/ }));
    fireEvent.keyDown(search, { key: 'F6' });
    expect((screen.getByLabelText('Forma de pagamento') as HTMLSelectElement).value).toBe('COMANDA');
    expect(document.activeElement).toBe(screen.getByLabelText('Número ou leitura da comanda'));
    expect((screen.getByRole('button', { name: 'Concluir venda' }) as HTMLButtonElement).disabled).toBe(true);
    expect(api.createSale).not.toHaveBeenCalled();
  });

  it('não envia duas vendas enquanto a primeira ainda está sendo processada', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(api.createSale).mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<Sales/>);
    fireEvent.click(await screen.findByRole('button', { name: /Refrigerante/ }));
    const button = screen.getByRole('button', { name: 'Concluir venda' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.createSale).toHaveBeenCalledTimes(1);
    resolve({ number: 2, totalAmount: 5, printWarning: { message: 'Sem impressora' } });
    await waitFor(() => expect(screen.getByText(/Nenhum item na venda/)).toBeTruthy());
  });

  it('preserva o carrinho se o operador cancelar a troca de local', async () => {
    confirmChange.mockResolvedValue(false);
    vi.mocked(api.getReferenceLocations).mockResolvedValue([{ id: 'bar-1', name: 'Bar', allowsSale: true }, { id: 'bar-2', name: 'Outro bar', allowsSale: true }]);
    render(<Sales/>);
    fireEvent.click(await screen.findByRole('button', { name: /Refrigerante/ }));
    fireEvent.change(screen.getByLabelText('Local de venda *'), { target: { value: 'bar-2' } });
    await waitFor(() => expect(confirmChange).toHaveBeenCalled());
    expect((screen.getByLabelText('Local de venda *') as HTMLSelectElement).value).toBe('bar-1');
    expect(screen.getByLabelText('Quantidade de Refrigerante')).toBeTruthy();
  });
});

it('PDF apresenta códigos, quantidade e valores reais dos itens', () => {
  const rows = receiptRows({ number: 10, createdAt: '2026-01-01T00:00:00Z', status: 'CONCLUIDA', location: { name: 'Bar' }, registeredBy: { name: 'Operador' }, paymentMethod: 'PIX', subtotal: '10.00', discount: '0.00', totalAmount: '10.00', items: [{ product: { name: 'Refrigerante', sku: '123', unit: 'un' }, quantity: 2, unitPrice: '5.00', total: '10.00' }] });
  expect(rows[0][1]).toBe('123');
  expect(rows[0][2]).toBe('Refrigerante');
  expect(rows[0][3]).toBe('2 un');
  expect(rows[0][5]).toContain('10,00');
});
