import { HistoryEntry, getHistory, saveToHistory } from './history';

export function exportBackup(): void {
  const history = getHistory();
  const json = JSON.stringify(history, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hidrometro_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function importBackup(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data)) {
          resolve({ imported: 0, skipped: 0, errors: ['Arquivo nao e um array valido'] });
          return;
        }

        const existing = getHistory();
        const existingKeys = new Set(existing.map((e) => `${e.label}__${e.date}`));
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const entry of data) {
          if (!entry.date || !entry.label || !Array.isArray(entry.rows)) {
            errors.push(`Entrada invalida: ${JSON.stringify(entry).slice(0, 60)}`);
            continue;
          }
          const key = `${entry.label}__${entry.date}`;
          if (existingKeys.has(key)) {
            skipped++;
            continue;
          }
          saveToHistory(entry.label, entry.rows, entry.date);
          imported++;
        }

        resolve({ imported, skipped, errors });
      } catch {
        resolve({ imported: 0, skipped: 0, errors: ['Falha ao ler arquivo JSON'] });
      }
    };
    reader.readAsText(file);
  });
}
