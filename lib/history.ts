import { GroupedRow } from './results';

export interface HistoryEntry {
  id: string;
  date: string;
  label: string;
  rows: GroupedRow[];
  buildingId?: string;
  buildingName?: string;
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

export function saveToHistory(label: string, rows: GroupedRow[], originalDate?: string, buildingId?: string, buildingName?: string): HistoryEntry {
  const entry: HistoryEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: originalDate || new Date().toISOString(),
    label,
    rows: rows.map((r) => ({ ...r })),
    ...(buildingId ? { buildingId } : {}),
    ...(buildingName ? { buildingName } : {}),
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

export interface PeriodData {
  id: string;
  label: string;
  date: string;
  rows: GroupedRow[];
}

export function getMultiPeriodData(limit: number = 5): PeriodData[] {
  const history = getHistory();
  return history.slice(0, limit).map((e) => ({
    id: e.id,
    label: e.label || new Date(e.date).toLocaleDateString('pt-BR'),
    date: e.date,
    rows: e.rows,
  }));
}

export function getEvolutionData(apartments: string[], periods: PeriodData[]): Map<string, { period: string; consumo: number }[]> {
  const evolution = new Map<string, { period: string; consumo: number }[]>();
  for (const apt of apartments) {
    const data: { period: string; consumo: number }[] = [];
    for (const p of periods) {
      const row = p.rows.find((r) => r.apartamento === apt);
      data.push({ period: p.label, consumo: Number(row?.consumo) || 0 });
    }
    evolution.set(apt, data);
  }
  return evolution;
}

export function getHistoryByBuilding(buildingId?: string | null): HistoryEntry[] {
  if (!buildingId) return getHistory();
  return getHistory().filter((e) => !e.buildingId || e.buildingId === buildingId);
}
