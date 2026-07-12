import { describe, it, expect } from 'vitest';
import { validarLeitura } from '@/lib/validation';

describe('validarLeitura', () => {
  it('returns empty for normal reading', () => {
    const result = validarLeitura('12345', '50', '');
    expect(result).toHaveLength(0);
  });

  it('flags indice > 99999', () => {
    const result = validarLeitura('100000', '', '');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((v) => v.regra === 'indice_maior_99999')).toBe(true);
  });

  it('flags negative consumo', () => {
    const result = validarLeitura('12345', '-10', '');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((v) => v.regra === 'consumo_negativo')).toBe(true);
  });

  it('flags consumo > 500', () => {
    const result = validarLeitura('12345', '600', '');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((v) => v.regra === 'consumo_muito_alto')).toBe(true);
  });

  it('flags divergence', () => {
    const result = validarLeitura('12345', '', 'DIVERGÊNCIA entre fotos');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((v) => v.regra === 'divergencia_fotos')).toBe(true);
    expect(result.find((v) => v.regra === 'divergencia_fotos')?.severidade).toBe('critico');
  });

  it('flags empty indice', () => {
    const result = validarLeitura('', '', '');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((v) => v.regra === 'sem_leitura')).toBe(true);
  });

  it('handles comma decimal indice', () => {
    const result = validarLeitura('100000,5', '', '');
    expect(result.some((v) => v.regra === 'indice_maior_99999')).toBe(true);
  });

  it('does not false-positive on normal consumo', () => {
    const result = validarLeitura('12345', '50', '');
    expect(result.some((v) => v.regra === 'consumo_negativo')).toBe(false);
    expect(result.some((v) => v.regra === 'consumo_muito_alto')).toBe(false);
  });
});
