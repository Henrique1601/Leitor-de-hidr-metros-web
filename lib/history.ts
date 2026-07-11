import { GroupedRow } from './results';

export interface HistoryEntry {
  id: string;
  date: string;
  label: string;
  rows: GroupedRow[];
}

const STORAGE_KEY = 'hidrometro-history';
const MAX_ENTRIES = 20;

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(label: string, rows: GroupedRow[]): HistoryEntry {
  const entry: HistoryEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
    label,
    rows: rows.map((r) => ({ ...r })),
  };

  const history = getHistory();
  history.unshift(entry);

  if (history.length > MAX_ENTRIES) {
    history.splice(MAX_ENTRIES);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // silently ignore storage errors
  }

  return entry;
}

export function deleteFromHistory(id: string): void {
  const history = getHistory().filter((e) => e.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // silently ignore
  }
}

export function getPreviousIndices(entryId: string): Map<string, string> | null {
  const history = getHistory();
  const entry = history.find((e) => e.id === entryId);
  if (!entry) return null;

  const map = new Map<string, string>();
  for (const row of entry.rows) {
    if (row.indice && row.confianca !== 'N/A') {
      map.set(row.apartamento, row.indice);
    }
  }
  return map;
}

export function getLatestPreviousIndices(currentLabel?: string): Map<string, string> | null {
  const history = getHistory();
  const entry = history.find((e) => !currentLabel || e.label !== currentLabel);
  if (!entry) return null;
  return getPreviousIndices(entry.id);
}
