import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Kiosks from '../pages/Kiosks';
import { clubApi } from '../lib/club-api';

vi.mock('../lib/club-api',()=>({clubApi:{dashboard:vi.fn(),kiosks:vi.fn(),kiosk:vi.fn(),saveKiosk:vi.fn(),addPhoto:vi.fn(),editPhoto:vi.fn(),reservations:vi.fn(),agenda:vi.fn(),status:vi.fn(),audit:vi.fn(),activities:vi.fn(),saveActivity:vi.fn()}}));
vi.mock('../components/Toast',()=>({useToast:()=>({showToast:vi.fn()})}));
vi.mock('../components/ConfirmDialog',()=>({useConfirm:()=>({confirm:vi.fn(),prompt:vi.fn()})}));
const kiosk={id:'11111111-1111-4111-8111-111111111111',name:'Jardim',description:'Quiosque do jardim',capacity:10,barbecue:true,electricity:true,nearby:'Piscina',price:'25.00',latitude:-20,longitude:-48,status:'ATIVO',notes:null,photos:[]};
describe('Quiosques no Zantra',()=>{
  beforeEach(()=>{vi.clearAllMocks();localStorage.setItem('zantra_user',JSON.stringify({permissions:['kiosks:view']}));vi.mocked(clubApi.dashboard).mockResolvedValue({kiosks:[{status:'ATIVO',_count:1}],open:0,pending:0,confirmed:0,totalAmount:'0.00'});vi.mocked(clubApi.kiosks).mockResolvedValue({data:[kiosk],pagination:{page:1,pages:1,total:1}});});
  afterEach(()=>{cleanup();localStorage.clear();});
  it('exibe resumo e bloqueia ações sem permissão de gerenciamento',async()=>{
    render(<Kiosks/>);await screen.findByText('Reservas abertas');
    fireEvent.click(screen.getByRole('button',{name:'Quiosques'}));await screen.findByText('Jardim');
    expect(screen.queryByRole('button',{name:'Novo quiosque'})).toBeNull();expect(screen.queryByLabelText('Editar Jardim')).toBeNull();
  });
  it('cadastro envia coordenadas numéricas, capacidade inteira e valor string',async()=>{
    localStorage.setItem('zantra_user',JSON.stringify({permissions:['kiosks:view','kiosks:manage']}));vi.mocked(clubApi.saveKiosk).mockResolvedValue(kiosk);
    render(<Kiosks/>);await screen.findByText('Reservas abertas');fireEvent.click(screen.getByRole('button',{name:'Quiosques'}));await screen.findByText('Jardim');
    fireEvent.click(screen.getByRole('button',{name:'Novo quiosque'}));
    fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Novo jardim'}});fireEvent.change(screen.getByLabelText('Descrição'),{target:{value:'Perto da piscina'}});
    fireEvent.change(screen.getByLabelText('Latitude'),{target:{value:'-20'}});fireEvent.change(screen.getByLabelText('Longitude'),{target:{value:'-48'}});
    fireEvent.click(screen.getByRole('button',{name:'Salvar quiosque'}));
    await waitFor(()=>expect(clubApi.saveKiosk).toHaveBeenCalledWith(undefined,expect.objectContaining({name:'Novo jardim',capacity:2,price:'0.00',latitude:-20,longitude:-48})));
  });
  it('erro de API é exibido sem tela branca',async()=>{
    vi.mocked(clubApi.dashboard).mockRejectedValue(new Error('API do clube indisponível'));
    render(<Kiosks/>);expect(await screen.findByRole('alert')).toHaveProperty('textContent','API do clube indisponível');
    expect(screen.getByRole('button',{name:'Atualizar'})).toBeTruthy();
  });
});
