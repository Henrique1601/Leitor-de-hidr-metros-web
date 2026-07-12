export interface FaixaTarifa {
  id: string;
  minM3: number;
  maxM3: number | null;
  valorPorM3: number;
}

export interface TarifaConfig {
  faixas: FaixaTarifa[];
  fixo: number;
}

const TARIFA_KEY = 'hidrometro-tarifa';

export function getTarifaConfig(): TarifaConfig {
  try {
    const raw = localStorage.getItem(TARIFA_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { faixas: [], fixo: 0 };
}

export function saveTarifaConfig(config: TarifaConfig): void {
  try {
    localStorage.setItem(TARIFA_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

export function calcularTarifa(consumoM3: number, config: TarifaConfig): number {
  if (consumoM3 <= 0 || config.faixas.length === 0) return 0;

  let valor = config.fixo;

  const sorted = [...config.faixas].sort((a, b) => a.minM3 - b.minM3);

  for (const faixa of sorted) {
    const max = faixa.maxM3 ?? Infinity;
    if (consumoM3 > faixa.minM3) {
      const faixaInicio = faixa.minM3;
      const faixaFim = Math.min(consumoM3, max);
      if (faixaFim > faixaInicio) {
        valor += (faixaFim - faixaInicio) * faixa.valorPorM3;
      }
    }
  }

  return Math.round(valor * 100) / 100;
}

export function criarFaixaPadrao(): FaixaTarifa {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
    minM3: 0,
    maxM3: 10,
    valorPorM3: 0,
  };
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
