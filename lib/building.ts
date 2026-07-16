export interface Andar {
  numero: number;
  apts: string[];
  metroCounts?: Record<string, number>;
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

const API_BASE = '/api';

function dbRowToBuilding(row: { id: string; name: string; data: Record<string, unknown>; created_at: string; updated_at: string }): Building {
  const d = row.data as Record<string, unknown>;
  return {
    id: row.id,
    nome: row.name,
    blocos: (d.blocos as Bloco[]) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildingToDb(b: Building) {
  return { id: b.id, name: b.nome, data: { blocos: b.blocos } };
}

export async function fetchBuildings(): Promise<Building[]> {
  const res = await fetch(`${API_BASE}/buildings`);
  if (!res.ok) throw new Error('Failed to fetch buildings');
  const rows = await res.json();
  return rows.map(dbRowToBuilding);
}

export async function fetchActiveBuildingId(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/settings?key=active_building_id`);
  if (!res.ok) return null;
  const { value } = await res.json();
  return value === 'null' || value === null ? null : (value as string);
}

export async function setActiveBuildingId(id: string | null): Promise<void> {
  await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'active_building_id', value: id }),
  });
}

export async function createBuildingApi(nome: string, blocos: Bloco[] = []): Promise<Building> {
  const now = new Date().toISOString();
  const building: Building = {
    id: crypto.randomUUID(),
    nome,
    blocos,
    createdAt: now,
    updatedAt: now,
  };
  const res = await fetch(`${API_BASE}/buildings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildingToDb(building)),
  });
  if (!res.ok) throw new Error('Failed to create building');
  return dbRowToBuildingAny(await res.json());
}

export async function updateBuildingApi(b: Building, patch: Partial<Omit<Building, 'id' | 'createdAt'>>): Promise<Building> {
  const updated = { ...b, ...patch, updatedAt: new Date().toISOString() };
  const res = await fetch(`${API_BASE}/buildings/${updated.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildingToDb(updated)),
  });
  if (!res.ok) throw new Error('Failed to update building');
  return dbRowToBuildingAny(await res.json());
}

export async function deleteBuildingApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/buildings/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete building');
}

export async function seedBuildings(buildings: Building[]): Promise<{ created: number; skipped: number }> {
  const res = await fetch(`${API_BASE}/buildings/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buildings: buildings.map(buildingToDb) }),
  });
  if (!res.ok) throw new Error('Failed to seed buildings');
  return res.json();
}

function dbRowToBuildingAny(row: Record<string, unknown>): Building {
  const d = row.data as Record<string, unknown>;
  return {
    id: row.id as string,
    nome: row.name as string,
    blocos: (d.blocos as Bloco[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/* Pure functions — no I/O, no changes needed */

export function createBuildingLocal(nome: string, blocos: Bloco[] = []): Building {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), nome, blocos, createdAt: now, updatedAt: now };
}

export function updateBuildingLocal(building: Building, patch: Partial<Omit<Building, 'id' | 'createdAt'>>): Building {
  return { ...building, ...patch, updatedAt: new Date().toISOString() };
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
  return createBuildingLocal('Prédio Padrão', blocoNames.map((nome) => ({
    id: crypto.randomUUID(),
    nome,
    andares: inferAndares(history, nome),
  })));
}
