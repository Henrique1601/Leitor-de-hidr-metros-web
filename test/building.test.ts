import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createBuilding,
  updateBuilding,
  deleteBuilding,
  setActiveBuilding,
  getActiveBuilding,
  totalApts,
  allApts,
  generateApts,
  inferAndares,
  inferBuildingFromHistory,
  loadBuildings,
  saveBuildings,
  migrateToBuildings,
  BuildingState,
} from '@/lib/building';

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    clear: vi.fn(() => { store.clear(); }),
    get length() { return store.size; },
    key: vi.fn((i: number) => [...store.keys()][i] ?? null),
  };
}

describe('building', () => {
  let storage: ReturnType<typeof mockStorage>;

  beforeEach(() => {
    storage = mockStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, writable: true });
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8) },
      writable: true,
    });
  });

  describe('createBuilding', () => {
    it('creates building with nome and empty blocos', () => {
      const b = createBuilding('Teste');
      expect(b.nome).toBe('Teste');
      expect(b.blocos).toEqual([]);
      expect(b.id).toBeTruthy();
      expect(b.createdAt).toBeTruthy();
      expect(b.updatedAt).toBe(b.createdAt);
    });

    it('creates building with blocos', () => {
      const b = createBuilding('Teste', [{ id: 'b1', nome: 'A', andares: [{ numero: 1, apts: ['101'] }] }]);
      expect(b.blocos).toHaveLength(1);
      expect(b.blocos[0].nome).toBe('A');
    });
  });

  describe('updateBuilding', () => {
    it('updates nome and updatedAt', () => {
      const b = createBuilding('Old');
      const updated = updateBuilding(b, { nome: 'New' });
      expect(updated.nome).toBe('New');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(b.updatedAt).getTime());
    });

    it('does not change id or createdAt', () => {
      const b = createBuilding('Test');
      const updated = updateBuilding(b, { nome: 'Changed' });
      expect(updated.id).toBe(b.id);
      expect(updated.createdAt).toBe(b.createdAt);
    });
  });

  describe('deleteBuilding', () => {
    it('removes building from state', () => {
      const b1 = createBuilding('A');
      const b2 = createBuilding('B');
      const state: BuildingState = { buildings: [b1, b2], activeBuildingId: b1.id };
      const result = deleteBuilding(state, b1.id);
      expect(result.buildings).toHaveLength(1);
      expect(result.buildings[0].id).toBe(b2.id);
    });

    it('switches activeBuildingId if deleted building was active', () => {
      const b1 = createBuilding('A');
      const b2 = createBuilding('B');
      const state: BuildingState = { buildings: [b1, b2], activeBuildingId: b1.id };
      const result = deleteBuilding(state, b1.id);
      expect(result.activeBuildingId).toBe(b2.id);
    });

    it('sets activeBuildingId to null if no buildings left', () => {
      const b1 = createBuilding('A');
      const state: BuildingState = { buildings: [b1], activeBuildingId: b1.id };
      const result = deleteBuilding(state, b1.id);
      expect(result.activeBuildingId).toBeNull();
    });
  });

  describe('setActiveBuilding', () => {
    it('sets activeBuildingId', () => {
      const b = createBuilding('Test');
      const state: BuildingState = { buildings: [b], activeBuildingId: null };
      const result = setActiveBuilding(state, b.id);
      expect(result.activeBuildingId).toBe(b.id);
    });

    it('can set to null', () => {
      const b = createBuilding('Test');
      const state: BuildingState = { buildings: [b], activeBuildingId: b.id };
      const result = setActiveBuilding(state, null);
      expect(result.activeBuildingId).toBeNull();
    });
  });

  describe('getActiveBuilding', () => {
    it('returns active building', () => {
      const b = createBuilding('Test');
      const state: BuildingState = { buildings: [b], activeBuildingId: b.id };
      expect(getActiveBuilding(state)?.nome).toBe('Test');
    });

    it('returns null if no active building', () => {
      const state: BuildingState = { buildings: [], activeBuildingId: null };
      expect(getActiveBuilding(state)).toBeNull();
    });
  });

  describe('totalApts', () => {
    it('counts all apartments across blocos and andares', () => {
      const b = createBuilding('Test', [
        { id: 'b1', nome: 'A', andares: [{ numero: 1, apts: ['A101', 'A102'] }, { numero: 2, apts: ['A201'] }] },
        { id: 'b2', nome: 'B', andares: [{ numero: 1, apts: ['B101', 'B102', 'B103'] }] },
      ]);
      expect(totalApts(b)).toBe(6);
    });
  });

  describe('allApts', () => {
    it('returns flat array of all apartments', () => {
      const b = createBuilding('Test', [
        { id: 'b1', nome: 'A', andares: [{ numero: 1, apts: ['A101', 'A102'] }] },
        { id: 'b2', nome: 'B', andares: [{ numero: 1, apts: ['B101'] }] },
      ]);
      expect(allApts(b)).toEqual(['A101', 'A102', 'B101']);
    });
  });

  describe('generateApts', () => {
    it('generates apts for a floor without block prefix', () => {
      expect(generateApts(1, 4)).toEqual(['101', '102', '103', '104']);
    });

    it('generates apts with block prefix', () => {
      expect(generateApts(2, 3, 'A')).toEqual(['A201', 'A202', 'A203']);
    });
  });

  describe('inferAndares', () => {
    it('infers floors from history', () => {
      const history = [
        { rows: [{ apartamento: 'A101', bloco: 'A' }, { apartamento: 'A102', bloco: 'A' }] },
        { rows: [{ apartamento: 'A201', bloco: 'A' }] },
      ];
      const andares = inferAndares(history, 'A');
      expect(andares).toHaveLength(2);
      expect(andares[0].numero).toBe(1);
      expect(andares[0].apts).toContain('A101');
      expect(andares[1].numero).toBe(2);
    });
  });

  describe('inferBuildingFromHistory', () => {
    it('creates building with inferred structure', () => {
      const history = [
        { rows: [{ apartamento: 'A101', bloco: 'A' }, { apartamento: 'B101', bloco: 'B' }] },
      ];
      const building = inferBuildingFromHistory(history);
      expect(building.nome).toBe('Prédio Padrão');
      expect(building.blocos).toHaveLength(2);
    });
  });

  describe('loadBuildings / saveBuildings', () => {
    it('saves and loads state', () => {
      const b = createBuilding('Test');
      const state: BuildingState = { buildings: [b], activeBuildingId: b.id };
      saveBuildings(state);
      const loaded = loadBuildings();
      expect(loaded.buildings).toHaveLength(1);
      expect(loaded.buildings[0].nome).toBe('Test');
    });

    it('returns empty state if nothing saved', () => {
      const loaded = loadBuildings();
      expect(loaded.buildings).toEqual([]);
      expect(loaded.activeBuildingId).toBeNull();
    });
  });

  describe('migrateToBuildings', () => {
    it('returns existing state if buildings already exist', () => {
      const b = createBuilding('Existing');
      saveBuildings({ buildings: [b], activeBuildingId: b.id });
      const result = migrateToBuildings();
      expect(result.buildings).toHaveLength(1);
      expect(result.buildings[0].nome).toBe('Existing');
    });

    it('creates default building from history if no buildings exist', () => {
      const history = [
        { rows: [{ apartamento: 'A101', bloco: 'A' }] },
      ];
      localStorage.setItem('hidrometro-history', JSON.stringify(history));
      const result = migrateToBuildings();
      expect(result.buildings).toHaveLength(1);
      expect(result.buildings[0].nome).toBe('Prédio Padrão');
      expect(result.activeBuildingId).toBe(result.buildings[0].id);
    });
  });
});
