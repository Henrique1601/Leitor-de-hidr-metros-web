export interface Andar {
  numero: number;
  apts: string[];
}

export interface Bloco {
  id: string;
  nome: string;
  andares: Andar[];
}

export interface Building {
  id: string;
  nome: string;
  blocos: Bloco[];
  createdAt: string;
  updatedAt: string;
}

export interface BuildingState {
  buildings: Building[];
  activeBuildingId: string | null;
}

const STORAGE_KEY = 'hidrometro-buildings';
const HISTORY_KEY = 'hidrometro-history';

export function loadBuildings(): BuildingState {
  if (typeof window === 'undefined') return { buildings: [], activeBuildingId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { buildings: [], activeBuildingId: null };
    return JSON.parse(raw);
  } catch {
    return { buildings: [], activeBuildingId: null };
  }
}

export function saveBuildings(state: BuildingState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createBuilding(nome: string, blocos: Bloco[] = []): Building {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    nome,
    blocos,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBuilding(building: Building, patch: Partial<Omit<Building, 'id' | 'createdAt'>>): Building {
  return {
    ...building,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export function deleteBuilding(state: BuildingState, id: string): BuildingState {
  const buildings = state.buildings.filter((b) => b.id !== id);
  const activeBuildingId = state.activeBuildingId === id ? (buildings[0]?.id ?? null) : state.activeBuildingId;
  return { buildings, activeBuildingId };
}

export function setActiveBuilding(state: BuildingState, id: string | null): BuildingState {
  return { ...state, activeBuildingId: id };
}

export function getActiveBuilding(state: BuildingState): Building | null {
  return state.buildings.find((b) => b.id === state.activeBuildingId) ?? null;
}

export function totalApts(building: Building): number {
  return building.blocos.reduce((sum, bloco) => {
    return sum + bloco.andares.reduce((s, andar) => s + andar.apts.length, 0);
  }, 0);
}

export function allApts(building: Building): string[] {
  return building.blocos.flatMap((bloco) => bloco.andares.flatMap((andar) => andar.apts));
}

export function generateApts(andarNumero: number, quantidade: number, blocoNome?: string): string[] {
  const apts: string[] = [];
  for (let i = 1; i <= quantidade; i++) {
    const num = `${andarNumero}${String(i).padStart(2, '0')}`;
    apts.push(blocoNome ? `${blocoNome}${num}` : num);
  }
  return apts;
}

export function inferAndares(history: Array<{ rows: Array<{ apartamento: string; bloco: string }> }>, blocoNome: string): Andar[] {
  const andarMap = new Map<number, Set<string>>();

  for (const entry of history) {
    for (const row of entry.rows) {
      if (row.bloco !== blocoNome) continue;
      const apt = row.apartamento;
      const match = apt.match(/^[A-Za-z]*(\d+)/);
      if (!match) continue;
      const numStr = match[1];
      const andar = parseInt(numStr.substring(0, 1), 10);
      if (isNaN(andar)) continue;
      if (!andarMap.has(andar)) andarMap.set(andar, new Set());
      andarMap.get(andar)!.add(apt);
    }
  }

  const andares: Andar[] = [];
  for (const [numero, apts] of andarMap) {
    andares.push({ numero, apts: [...apts].sort() });
  }
  return andares.sort((a, b) => a.numero - b.numero);
}

export function inferBuildingFromHistory(history: Array<{ rows: Array<{ apartamento: string; bloco: string }> }>): Building {
  const blocoNames = [...new Set(history.flatMap((p) => p.rows.map((r) => r.bloco)))].filter(Boolean);

  return createBuilding('Prédio Padrão', blocoNames.map((nome) => ({
    id: crypto.randomUUID(),
    nome,
    andares: inferAndares(history, nome),
  })));
}

interface HistoryEntry {
  buildingId?: string;
  rows: Array<{ apartamento: string; bloco: string }>;
}

export function migrateToBuildings(): BuildingState {
  const existing = loadBuildings();
  if (existing.buildings.length > 0) return existing;

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return { buildings: [], activeBuildingId: null };
    const history: HistoryEntry[] = JSON.parse(raw);
    if (!Array.isArray(history) || history.length === 0) return { buildings: [], activeBuildingId: null };

    const building = inferBuildingFromHistory(history);
    const state: BuildingState = {
      buildings: [building],
      activeBuildingId: building.id,
    };
    saveBuildings(state);
    return state;
  } catch {
    return { buildings: [], activeBuildingId: null };
  }
}
