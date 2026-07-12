import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetPage = vi.fn();
const mockGetNumberOfPages = vi.fn().mockReturnValue(1);
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockInternal = { pageSize: { getWidth: () => 297, getHeight: () => 210 } };

vi.mock('jspdf', () => {
  return {
    default: class {
      save = mockSave;
      text = mockText;
      setPage = mockSetPage;
      getNumberOfPages = mockGetNumberOfPages;
      setFontSize = mockSetFontSize;
      setTextColor = mockSetTextColor;
      internal = mockInternal;
    },
  };
});

vi.mock('jspdf-autotable', () => {
  return { default: vi.fn() };
});

import { exportComparativo } from '@/lib/exportComparativo';
import type { GroupedRow } from '@/lib/results';

function makeRow(apartamento: string, indice: string, consumo: string, confianca: string): GroupedRow {
  return { apartamento, indice, consumo, confianca, observacao: '', validacao: undefined, arquivos: 'test.jpg' };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetNumberOfPages.mockReturnValue(1);
});

describe('exportComparativo', () => {
  it('calls doc.save with correct filename', () => {
    const p1 = { label: 'Janeiro 2026', rows: [makeRow('101', '1000', '50', 'alta')] };
    const p2 = { label: 'Fevereiro 2026', rows: [makeRow('101', '1050', '50', 'alta')] };
    exportComparativo(p1, p2);
    expect(mockSave).toHaveBeenCalled();
    const filename = mockSave.mock.calls[0][0] as string;
    expect(filename).toContain('comparativo_Janeiro_2026_vs_Fevereiro_2026');
    expect(filename).toMatch(/\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('includes title and subtitle text', () => {
    const p1 = { label: 'Mes 1', rows: [] };
    const p2 = { label: 'Mes 2', rows: [] };
    exportComparativo(p1, p2);
    expect(mockText).toHaveBeenCalledWith('Comparacao de Leituras', 14, 18);
    expect(mockText).toHaveBeenCalledWith(
      expect.stringContaining('Mes 1'),
      14,
      26
    );
  });

  it('sets page numbers', () => {
    const p1 = { label: 'A', rows: [] };
    const p2 = { label: 'B', rows: [] };
    exportComparativo(p1, p2);
    expect(mockGetNumberOfPages).toHaveBeenCalled();
    expect(mockSetPage).toHaveBeenCalledWith(1);
  });

  it('handles empty periods', () => {
    const p1 = { label: 'Empty 1', rows: [] };
    const p2 = { label: 'Empty 2', rows: [] };
    expect(() => exportComparativo(p1, p2)).not.toThrow();
    expect(mockSave).toHaveBeenCalled();
  });

  it('handles multiple apartments across both periods', () => {
    const p1 = {
      label: 'Periodo 1',
      rows: [
        makeRow('101', '1000', '50', 'alta'),
        makeRow('102', '2000', '80', 'media'),
      ],
    };
    const p2 = {
      label: 'Periodo 2',
      rows: [
        makeRow('101', '1050', '50', 'alta'),
        makeRow('103', '3000', '60', 'alta'),
      ],
    };
    expect(() => exportComparativo(p1, p2)).not.toThrow();
    expect(mockSave).toHaveBeenCalled();
  });
});
