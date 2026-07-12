const STORAGE_KEY = 'hidrometro_columns_v1';

export interface ColumnDef {
  id: string;
  header: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'ape', header: 'Ape', visible: true },
  { id: 'bloco', header: 'Bloco', visible: false },
  { id: 'indice', header: 'Indice', visible: true },
  { id: 'consumo', header: 'Consumo', visible: true },
  { id: 'alerta', header: 'Alerta', visible: true },
  { id: 'valor', header: 'Valor', visible: true },
  { id: 'confianca', header: 'Confianca', visible: true },
  { id: 'observacao', header: 'Observacao', visible: true },
  { id: 'validacao', header: 'Validacao', visible: true },
  { id: 'foto', header: 'Foto', visible: true },
];

export function loadColumns(): ColumnDef[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNS;
    const saved = JSON.parse(raw) as ColumnDef[];
    const ids = DEFAULT_COLUMNS.map((c) => c.id);
    const byId = new Map(saved.map((c) => [c.id, c.visible]));
    return DEFAULT_COLUMNS.map((def) => ({
      ...def,
      visible: byId.get(def.id) ?? def.visible,
    }));
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export function saveColumns(columns: ColumnDef[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch {}
}

export function getDefaultColumns(): ColumnDef[] {
  return DEFAULT_COLUMNS.map((c) => ({ ...c }));
}
