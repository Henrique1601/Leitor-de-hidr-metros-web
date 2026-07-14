import { Building, Bloco, Andar, saveBuildings, BuildingState } from './building';

function makeAndares(torreName: string, aptsByFloor: Record<number, number>): Andar[] {
  const andares: Andar[] = [];
  for (const [floor, count] of Object.entries(aptsByFloor)) {
    const num = parseInt(floor);
    const apts: string[] = [];
    for (let i = 1; i <= count; i++) {
      apts.push(`${torreName}${num}${String(i).padStart(2, '0')}`);
    }
    andares.push({ numero: num, apts });
  }
  return andares;
}

const TORRE_A_APTS: Record<number, number> = {
  3: 4, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8,
  10: 8, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 16: 8,
  17: 8, 18: 8, 19: 8, 20: 8, 21: 8, 22: 8, 23: 8,
  24: 8, 25: 8,
};

const TORRE_C_APTS: Record<number, number> = {
  3: 5, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8,
  10: 8, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 16: 8,
  17: 8, 18: 8, 19: 8, 20: 8, 21: 8, 22: 8, 23: 8,
  24: 8, 25: 8,
};

const TORRE_E_APTS: Record<number, number> = {
  3: 4, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8,
  10: 8, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 16: 8,
  17: 8, 18: 8, 19: 8, 20: 8, 21: 8, 22: 8, 23: 7,
  24: 8, 25: 8,
};

const TORRE_G_APTS: Record<number, number> = {
  3: 5, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8,
  10: 8, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 16: 8,
  17: 8, 18: 8, 19: 8, 20: 8, 21: 8, 22: 8, 23: 8,
  24: 8, 25: 8,
};

function makeTorre(nome: string, apts: Record<number, number>): Bloco {
  return {
    id: crypto.randomUUID(),
    nome,
    andares: makeAndares(nome, apts),
  };
}

export function createAcquaplayBuilding(): Building {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    nome: 'Acquaplay',
    blocos: [
      makeTorre('A', TORRE_A_APTS),
      makeTorre('B', TORRE_A_APTS),
      makeTorre('C', TORRE_C_APTS),
      makeTorre('D', TORRE_A_APTS),
      makeTorre('E', TORRE_E_APTS),
      makeTorre('F', TORRE_A_APTS),
      makeTorre('G', TORRE_G_APTS),
      makeTorre('H', TORRE_G_APTS),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function seedAcquaplay(): BuildingState {
  const building = createAcquaplayBuilding();
  const state: BuildingState = {
    buildings: [building],
    activeBuildingId: building.id,
  };
  saveBuildings(state);
  return state;
}
