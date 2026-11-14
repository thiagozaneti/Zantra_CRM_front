import { describe, expect, it } from 'vitest';
import { activeNavigation, navigation, visibleNavigation } from '../lib/navigation';

describe('Navegação por áreas', () => {
  it('mostra apenas páginas autorizadas e mantém o início acessível', () => {
    const groups = visibleNavigation(['sales:view', 'security:view']);
    expect(groups.map((group) => group.id)).toEqual(['home', 'sales', 'admin']);
    expect(groups.flatMap((group) => group.pages).map((page) => page.path)).toEqual(['/sales', '/security']);
    expect(visibleNavigation([]).map((group) => group.id)).toEqual(['home']);
  });
  it('reconhece as URLs existentes, inclusive acessos diretos', () => {
    expect(activeNavigation('/')?.id).toBe('home');
    expect(activeNavigation('/card-refunds')?.id).toBe('sales');
    expect(activeNavigation('/inventories')?.id).toBe('stock');
    expect(activeNavigation('/kiosks')?.id).toBe('club');
    expect(new Set(navigation.flatMap((group) => group.pages.map((page) => page.path))).size).toBe(19);
  });
});
