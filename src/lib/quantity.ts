const discreteUnits = new Set([
  'un', 'und', 'unid', 'unidade', 'unidades', 'pc', 'pç', 'peca', 'peça', 'pecas', 'peças',
  'balde', 'baldes', 'caixa', 'caixas', 'cx', 'pacote', 'pacotes', 'pct', 'garrafa', 'garrafas',
  'lata', 'latas', 'saco', 'sacos', 'frasco', 'frascos', 'rolo', 'rolos', 'fardo', 'fardos',
]);

export function isDiscreteUnit(unit?: string) {
  return discreteUnits.has((unit || '').trim().toLocaleLowerCase('pt-BR'));
}

export function quantityStep(unit?: string) {
  return isDiscreteUnit(unit) ? 1 : 0.001;
}
