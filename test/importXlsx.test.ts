import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseXlsx } from '@/lib/importXlsx';

function createXlsxBuffer(headers: string[], rows: (string | number)[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('parseXlsx', () => {
  it('parses valid xlsx with apt and indice columns', () => {
    const buffer = createXlsxBuffer(['Ape', 'Indice'], [['101', 12345], ['102', 12346]]);
    const result = parseXlsx(buffer);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].apartamento).toBe('101');
    expect(result.rows[0].indice).toBe('12345');
    expect(result.rows[0].confianca).toBe('N/A');
  });

  it('handles case-insensitive column names', () => {
    const buffer = createXlsxBuffer(['Apartamento', 'Leitura'], [['201', 500]]);
    const result = parseXlsx(buffer);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].apartamento).toBe('201');
  });

  it('returns error when apt column missing', () => {
    const buffer = createXlsxBuffer(['Nome', 'Valor'], [['A', 1]]);
    const result = parseXlsx(buffer);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it('returns error when indice column missing', () => {
    const buffer = createXlsxBuffer(['Ape', 'Nome'], [['101', 'A']]);
    const result = parseXlsx(buffer);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it('skips empty rows', () => {
    const buffer = createXlsxBuffer(['Ape', 'Indice'], [['101', 12345], ['', ''], ['102', 12346]]);
    const result = parseXlsx(buffer);
    expect(result.rows).toHaveLength(2);
  });

  it('uses fallback label', () => {
    const buffer = createXlsxBuffer(['Ape', 'Indice'], [['101', 12345]]);
    const result = parseXlsx(buffer, 'Meu Periodo');
    expect(result.label).toBe('Meu Periodo');
  });

  it('returns error for empty sheet', () => {
    const buffer = createXlsxBuffer([], []);
    const result = parseXlsx(buffer);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
