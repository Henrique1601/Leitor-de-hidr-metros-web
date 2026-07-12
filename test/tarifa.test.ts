import { describe, it, expect } from 'vitest';
import { calcularTarifa, TarifaConfig } from '@/lib/tarifa';

function makeConfig(faixas: { min: number; max: number | null; valor: number }[], fixo = 0): TarifaConfig {
  return {
    fixo,
    faixas: faixas.map((f, i) => ({
      id: String(i),
      minM3: f.min,
      maxM3: f.max,
      valorPorM3: f.valor,
    })),
  };
}

describe('calcularTarifa', () => {
  it('returns 0 for no config', () => {
    expect(calcularTarifa(10, { faixas: [], fixo: 0 })).toBe(0);
  });

  it('returns 0 for zero consumption', () => {
    const config = makeConfig([{ min: 0, max: 10, valor: 5 }]);
    expect(calcularTarifa(0, config)).toBe(0);
  });

  it('calculates simple single tier', () => {
    const config = makeConfig([{ min: 0, max: 10, valor: 5 }]);
    expect(calcularTarifa(5, config)).toBe(25);
  });

  it('calculates with fixo', () => {
    const config = makeConfig([{ min: 0, max: 10, valor: 5 }], 20);
    expect(calcularTarifa(5, config)).toBe(45);
  });

  it('calculates progressive tiers', () => {
    const config = makeConfig([
      { min: 0, max: 10, valor: 5 },
      { min: 10, max: 20, valor: 8 },
    ]);
    // 15 m3: 10*5 + 5*8 = 50 + 40 = 90
    expect(calcularTarifa(15, config)).toBe(90);
  });

  it('handles unlimited last tier (maxM3 null)', () => {
    const config = makeConfig([
      { min: 0, max: 10, valor: 5 },
      { min: 10, max: null, valor: 10 },
    ]);
    // 25 m3: 10*5 + 15*10 = 50 + 150 = 200
    expect(calcularTarifa(25, config)).toBe(200);
  });

  it('rounds to 2 decimal places', () => {
    const config = makeConfig([{ min: 0, max: 10, valor: 3.33 }]);
    // 3 * 3.33 = 9.99
    expect(calcularTarifa(3, config)).toBe(9.99);
  });
});
