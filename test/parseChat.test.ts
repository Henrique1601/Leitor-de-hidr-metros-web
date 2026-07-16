import { describe, it, expect } from 'vitest';
import { parseChat, parsePhotoFiles } from '@/lib/parseChat';

const SAMPLE_CHAT = `10/07/2025 9:30 da manh\u00e3 - Joao: IMG-20250710-WA0001.jpg (arquivo anexado)
101A 102A
10/07/2025 9:35 da manh\u00e3 - Joao: IMG-20250710-WA0002.jpg (arquivo anexado)
A103 A104
10/07/2025 10:00 da manh\u00e3 - Joao: IMG-20250710-WA0003.jpg (arquivo anexado)
Ninguem atendeu ap B201
10/07/2025 10:05 da manh\u00e3 - Joao: IMG-20250710-WA0004.jpg (arquivo anexado)
C301
`;

describe('parseChat', () => {
  it('extracts photo entries with apartments', () => {
    const rows = parseChat(SAMPLE_CHAT);
    expect(rows.length).toBe(4);
    expect(rows[0].arquivo).toBe('IMG-20250710-WA0001.jpg');
    expect(rows[0].apartamentos).toContain('101A');
    expect(rows[0].apartamentos).toContain('102A');
    expect(rows[0].data).toBe('20250710');
  });

  it('detects sem_acesso flag', () => {
    const rows = parseChat(SAMPLE_CHAT);
    const noAccess = rows.find((r) => r.flags.includes('sem_acesso'));
    expect(noAccess).toBeDefined();
    expect(noAccess?.arquivo).toBe('IMG-20250710-WA0003.jpg');
  });

  it('filters by date range', () => {
    const rows = parseChat(SAMPLE_CHAT, '2025-07-10', '2025-07-10');
    expect(rows.length).toBe(4);

    const empty = parseChat(SAMPLE_CHAT, '2025-07-11', '2025-07-15');
    expect(empty.length).toBe(0);
  });

  it('inherits caption from previous photo', () => {
    const chat = `10/07/2025 9:30 da manh\u00e3 - Joao: IMG-20250710-WA0001.jpg (arquivo anexado)
D401 D402
10/07/2025 9:35 da manh\u00e3 - Joao: IMG-20250710-WA0002.jpg (arquivo anexado)
`;
    const rows = parseChat(chat);
    expect(rows.length).toBe(2);
    expect(rows[1].apartamentos).toContain('D401');
    expect(rows[1].apartamentos).toContain('D402');
    expect(rows[1].flags).toContain('legenda_herdada_da_foto_anterior');
  });

  it('returns empty array for chat with no images', () => {
    const chat = '10/07/2025 9:30 da manh\u00e3 - Joao: Ola pessoal\n';
    const rows = parseChat(chat);
    expect(rows.length).toBe(0);
  });
});

describe('parsePhotoFiles', () => {
  function makeFile(name: string, size = 1000): File {
    return new File([''], name, { type: 'image/jpeg', lastModified: Date.now() });
  }

  it('extracts apartment from numeric filename', () => {
    const rows = parsePhotoFiles([makeFile('501.jpg')]);
    expect(rows.length).toBe(1);
    expect(rows[0].apartamentos).toEqual(['501']);
    expect(rows[0].arquivo).toBe('501.jpg');
  });

  it('extracts apartment from filename with prefix', () => {
    const rows = parsePhotoFiles([makeFile('IMG_501.jpg')]);
    expect(rows[0].apartamentos).toEqual(['501']);
  });

  it('matches against known apartments', () => {
    const knownApts = ['501', '502', '503'];
    const rows = parsePhotoFiles([makeFile('501.jpg'), makeFile('999.jpg')], knownApts);
    expect(rows[0].apartamentos).toEqual(['501']);
    expect(rows[1].apartamentos).toEqual([]);
    expect(rows[1].flags).toContain('sem_legenda');
  });

  it('matches by segment splitting for underscore filenames', () => {
    const knownApts = ['501', '502'];
    const rows = parsePhotoFiles([makeFile('foto_501_cor.jpg')], knownApts);
    expect(rows[0].apartamentos).toEqual(['501']);
  });

  it('skips non-image files', () => {
    const txtFile = new File([''], 'notes.txt', { type: 'text/plain', lastModified: Date.now() });
    const rows = parsePhotoFiles([txtFile]);
    expect(rows.length).toBe(0);
  });

  it('handles multiple photos', () => {
    const rows = parsePhotoFiles([
      makeFile('501.jpg'),
      makeFile('502.jpg'),
      makeFile('503.jpg'),
    ]);
    expect(rows.length).toBe(3);
    expect(rows.map((r) => r.apartamentos[0])).toEqual(['501', '502', '503']);
  });

  it('matches apartment from hyphenated filename like 1-510.jpg', () => {
    const knownApts = ['501', '502', '503', '504', '505', '506', '507', '508', '509', '510', '511', '512', '513', '514', '515', '516', '517', '518', '519', '520', '521'];
    const rows = parsePhotoFiles([makeFile('1-510.jpg'), makeFile('2-510.jpg')], knownApts);
    expect(rows[0].apartamentos).toEqual(['510']);
    expect(rows[1].apartamentos).toEqual(['510']);
    expect(rows[0].flags).toEqual([]);
    expect(rows[1].flags).toEqual([]);
  });

  it('matches apartment from multi-digit prefix like 1-1005.jpg', () => {
    const knownApts = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010'];
    const rows = parsePhotoFiles([makeFile('1-1005.jpg')], knownApts);
    expect(rows[0].apartamentos).toEqual(['1005']);
  });

  it('matches by segment splitting for underscore filenames', () => {
    const knownApts = ['501', '502', '503'];
    const rows = parsePhotoFiles([makeFile('foto_501_cor.jpg')], knownApts);
    expect(rows[0].apartamentos).toEqual(['501']);
  });

  it('falls back to all-digits when no known apts provided', () => {
    const rows = parsePhotoFiles([makeFile('1-510.jpg')]);
    expect(rows[0].apartamentos).toEqual(['1510']);
  });
});
