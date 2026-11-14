import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RFIDCommandPanel from '../components/RFIDCommandPanel';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: { identifyRFIDCard: vi.fn() } }));

describe('Leitura da comanda no PDV', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('consulta o código lido no campo sem acionar a confirmação da venda', async () => {
    const selected = vi.fn();
    const finish = vi.fn();
    vi.mocked(api.identifyRFIDCard).mockResolvedValue({ data: { comandaId: '1', cardCode: '00001234', valorTotal: 50, status: 'active' } });
    render(<form onSubmit={(event) => { event.preventDefault(); finish(); }}><RFIDCommandPanel enabled busy={false} selected={null} onSelect={selected}/><button type="submit">Finalizar</button></form>);
    const input = screen.getByLabelText('Número ou leitura da comanda');
    fireEvent.change(input, { target: { value: '00001234' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(selected).toHaveBeenCalledWith(expect.objectContaining({ cardCode: '00001234', valorTotal: 50 })));
    expect(finish).not.toHaveBeenCalled();
  });

  it('rejeita código inválido e mantém o campo para nova tentativa', async () => {
    render(<RFIDCommandPanel enabled busy={false} selected={null} onSelect={vi.fn()}/>);
    const input = screen.getByLabelText('Número ou leitura da comanda');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText('Leitura inválida')).toBeTruthy();
    expect(api.identifyRFIDCard).not.toHaveBeenCalled();
  });

  it('bloqueia nova consulta enquanto a leitura ainda está em processamento', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(api.identifyRFIDCard).mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<RFIDCommandPanel enabled busy={false} selected={null} onSelect={vi.fn()}/>);
    const input = screen.getByLabelText('Número ou leitura da comanda') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '00001234' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(input.disabled).toBe(true));
    expect(screen.getByText('Consultando comanda')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(api.identifyRFIDCard).toHaveBeenCalledTimes(1);
    resolve({ data: { comandaId: '1', cardCode: '00001234', valorTotal: 50, status: 'active' } });
    await waitFor(() => expect(screen.getByText('Comanda identificada')).toBeTruthy());
  });
});
