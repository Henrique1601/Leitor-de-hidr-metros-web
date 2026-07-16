import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createBuildingLocal,
  updateBuildingLocal,
  getActiveBuilding,
  totalApts,
  allApts,
  generateApts,
  inferAndares,
  inferBuildingFromHistory,
  BuildingState,
} from '@/lib/building';

describe('building', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8) },
      writable: true,
    });
  });

  describe('createBuildingLocal', () => {
    it('creates building with nome and empty blocos', () => {
      const b = createBuildingLocal('Teste');
      expect(b.nome).toBe('Teste');
      expect(b.blocos).toEqual([]);
      expect(b.id).toBeTruthy();
      expect(b.createdAt).toBeTruthy();
      expect(b.updatedAt).toBe(b.createdAt);
    });

    it('creates building with blocos', () => {
      const b = createBuildingLocal('Teste', [{ id: 'b1', nome: 'A', andares: [{ numero: 1, apts: ['101'] }] }]);
      expect(b.blocos).toHaveLength(1);
      expect(b.blocos[0].nome).toBe('A');
    });
  });

  describe('updateBuildingLocal', () => {
    it('updates nome and updatedAt', () => {
      const b = createBuildingLocal('Old');
      const updated = updateBuildingLocal(b, { nome: 'New' });
      expect(updated.nome).toBe('New');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(b.updatedAt).getTime());
    });

    it('does not change id or createdAt', () => {
      const b = createBuildingLocal('Test');
      const updated = updateBuildingLocal(b, { nome: 'Changed' });
      expect(updated.id).toBe(b.id);
      expect(updated.createdAt).toBe(b.createdAt);
    });
  });

  describe('getActiveBuilding', () => {
    it('returns active building', () => {
      const b = createBuildingLocal('Test');
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
      const b = createBuildingLocal('Test', [
        { id: 'b1', nome: 'A', andares: [{ numero: 1, apts: ['A101', 'A102'] }, { numero: 2, apts: ['A201'] }] },
        { id: 'b2', nome: 'B', andares: [{ numero: 1, apts: ['B101', 'B102', 'B103'] }] },
      ]);
      expect(totalApts(b)).toBe(6);
    });
  });

  describe('allApts', () => {
    it('returns flat array of all apartments', () => {
      const b = createBuildingLocal('Test', [
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
});
