import { describe, it, expect } from 'vitest';
import { groupByApartment, ExtractResult } from '@/lib/results';

function makeResult(apts: string[], indices: string[], arquivo = 'test.jpg'): ExtractResult {
  return {
    arquivo,
    apartamentosEsperados: apts,
    medidores: indices.map((idx, i) => {
      const [inteiro, decimal] = idx.split(',');
      return {
        posicao: i + 1,
        indiceInteiro: inteiro || '',
        indiceDecimal: decimal || '',
        confianca: 'alta' as const,
        observacao: '',
      };
    }),
  };
}

describe('groupByApartment', () => {
  it('groups single result correctly', () => {
    const results = [makeResult(['101'], ['12345'])];
    const grouped = groupByApartment(results);
    expect(grouped.length).toBe(1);
    expect(grouped[0].apartamento).toBe('101');
    expect(grouped[0].indice).toBe('12345');
    expect(grouped[0].confianca).toBe('alta');
  });

  it('detects divergence between photos', () => {
    const results = [
      makeResult(['101'], ['12345'], 'foto1.jpg'),
      makeResult(['101'], ['12399'], 'foto2.jpg'),
    ];
    const grouped = groupByApartment(results);
    expect(grouped.length).toBe(1);
    expect(grouped[0].confianca).toBe('baixa');
    expect(grouped[0].observacao).toContain('DIVERG');
  });

  it('confirms consistent readings', () => {
    const results = [
      makeResult(['101'], ['12345'], 'foto1.jpg'),
      makeResult(['101'], ['12345'], 'foto2.jpg'),
    ];
    const grouped = groupByApartment(results);
    expect(grouped.length).toBe(1);
    expect(grouped[0].indice).toBe('12345');
    expect(grouped[0].observacao).toContain('confirmado em 2 foto');
  });

  it('marks sem acesso entries', () => {
    const results: ExtractResult[] = [
      { arquivo: 'x.jpg', apartamentosEsperados: ['201'], medidores: [], semAcesso: true },
    ];
    const grouped = groupByApartment(results);
    expect(grouped.length).toBe(1);
    expect(grouped[0].observacao).toContain('Sem acesso');
    expect(grouped[0].confianca).toBe('N/A');
  });

  it('sorts apartments numerically', () => {
    const results = [
      makeResult(['301'], ['111']),
      makeResult(['101'], ['222']),
      makeResult(['201'], ['333']),
    ];
    const grouped = groupByApartment(results);
    expect(grouped.map((r) => r.apartamento)).toEqual(['101', '201', '301']);
  });

  it('handles decimal indices', () => {
    const results = [makeResult(['101'], ['12345,678'])];
    const grouped = groupByApartment(results);
    expect(grouped[0].indice).toBe('12345,678');
  });
});
