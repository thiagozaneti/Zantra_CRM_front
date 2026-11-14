import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CardRefunds from '../pages/CardRefunds';
import { api } from '../lib/api';

const confirmation = vi.fn();
vi.mock('../lib/api', () => ({ api: { identifyRefundCard: vi.fn(), getCardRefunds: vi.fn(), createCardRefund: vi.fn() } }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../components/ConfirmDialog', () => ({ useConfirm: () => ({ confirm: confirmation }) }));
vi.mock('../components/Layout', () => ({ hasActionPermission: () => true }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operador' } }) }));
vi.mock('../lib/uuid', () => ({ createUuid: () => '123e4567-e89b-42d3-a456-426614174000' }));

const card = { id: 'card', cardCode: '****1234', status: 'ATIVA', balance: '50.00', cardholderName: null };
const refund = { id: 'movimento', requestId: '123e4567-e89b-42d3-a456-426614174000', cardCode: '****1234', operator: 'Operador', createdAt: '2026-01-01T12:00:00Z', amount: '12.50', previousBalance: '50.00', balance: '37.50', paymentMethod: 'PIX', reason: 'Devolução ao portador' };

async function identify() {
  const field = screen.getByLabelText('Número do cartão');
  fireEvent.change(field, { target: { value: '00001234' } });
  fireEvent.submit(field.closest('form')!);
  await screen.findByText(/Não cadastrado no sistema/);
}
function fillRefund(amount = '12,50') {
  fireEvent.change(screen.getByLabelText('Valor da devolução (R$)'), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText('Forma de devolução'), { target: { value: 'PIX' } });
  fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Devolução ao portador' } });
}

describe('Estorno de saldo', () => {
  beforeEach(() => {
    vi.clearAllMocks(); sessionStorage.clear(); confirmation.mockResolvedValue(true);
    vi.mocked(api.getCardRefunds).mockResolvedValue([]);
    vi.mocked(api.identifyRefundCard).mockResolvedValue(card);
    vi.mocked(api.createCardRefund).mockResolvedValue(refund);
  });
  afterEach(() => { cleanup(); sessionStorage.clear(); });

  it('identifica o cartão, confirma e registra a forma e o valor da devolução', async () => {
    render(<CardRefunds/>);
    expect(document.activeElement).toBe(screen.getByLabelText('Número do cartão'));
    await identify(); fillRefund();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar devolução' }));
    await waitFor(() => expect(api.createCardRefund).toHaveBeenCalledWith({ commandId: 'card', requestId: refund.requestId, amount: '12.50', paymentMethod: 'PIX', reason: refund.reason }));
    expect(await screen.findByText(/Devolução registrada:/)).toBeTruthy();
    expect(sessionStorage.getItem('zantra_refund_pending_operador')).toBeNull();
  });

  it('não envia valor acima do saldo nem sem confirmação', async () => {
    render(<CardRefunds/>); await identify(); fillRefund('50,01');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar devolução' }));
    expect(screen.getByRole('alert').textContent).toContain('não pode superar');
    expect(api.createCardRefund).not.toHaveBeenCalled();
    fillRefund(); confirmation.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar devolução' }));
    await waitFor(() => expect(confirmation).toHaveBeenCalled());
    expect(api.createCardRefund).not.toHaveBeenCalled();
  });

  it('mantém a mesma chave após falha de rede e permite reenvio seguro', async () => {
    vi.mocked(api.createCardRefund).mockRejectedValueOnce(new TypeError('Falha de rede')).mockResolvedValueOnce(refund);
    render(<CardRefunds/>); await identify(); fillRefund();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar devolução' }));
    expect(await screen.findByText('Solicitação aguardando confirmação')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Falha de rede'));
    expect(sessionStorage.getItem('zantra_refund_pending_operador')).toContain(refund.requestId);
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar mesma solicitação' }));
    await waitFor(() => expect(api.createCardRefund).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.createCardRefund).mock.calls[0][0]).toEqual(vi.mocked(api.createCardRefund).mock.calls[1][0]);
    expect(await screen.findByText(/Devolução registrada:/)).toBeTruthy();
  });
});
