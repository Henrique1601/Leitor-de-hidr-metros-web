import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportBackup, importBackup } from '@/lib/backup';

function createBackupFile(content: string): File {
  return new File([content], 'backup.json', { type: 'application/json' });
}

describe('exportBackup', () => {
  it('creates a download link', () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    exportBackup();

    expect(clickSpy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe('importBackup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects non-array JSON', async () => {
    const file = createBackupFile('{"not": "array"}');
    const result = await importBackup(file);
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid JSON', async () => {
    const file = createBackupFile('not json at all');
    const result = await importBackup(file);
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('imports valid entries', async () => {
    const entries = [
      {
        id: 'test1',
        date: '2026-07-10T00:00:00.000Z',
        label: 'Teste',
        rows: [
          { apartamento: '101', indice: '12345', consumo: '50', confianca: 'alta', observacao: '', arquivos: 'test.jpg' },
        ],
      },
    ];
    const file = createBackupFile(JSON.stringify(entries));
    const result = await importBackup(file);
    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('skips duplicate entries', async () => {
    const entries = [
      {
        id: 'dup1',
        date: '2026-07-10T00:00:00.000Z',
        label: 'Dup',
        rows: [],
      },
    ];
    const file = createBackupFile(JSON.stringify(entries));

    await importBackup(file);
    const result = await importBackup(file);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('handles entries with missing fields', async () => {
    const entries = [{ id: 'bad' }];
    const file = createBackupFile(JSON.stringify(entries));
    const result = await importBackup(file);
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
