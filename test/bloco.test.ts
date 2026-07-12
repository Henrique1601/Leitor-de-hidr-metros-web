import { describe, it, expect } from 'vitest';
import { parseApt, aptSortKey, aptBlockLabel, formatAptDisplay } from '@/lib/bloco';

describe('parseApt', () => {
  it('parses digit-letter format (101A)', () => {
    const p = parseApt('101A');
    expect(p.bloco).toBe('A');
    expect(p.numero).toBe(101);
  });

  it('parses letter-digit format (A103)', () => {
    const p = parseApt('A103');
    expect(p.bloco).toBe('A');
    expect(p.numero).toBe(103);
  });

  it('parses plain numeric (201)', () => {
    const p = parseApt('201');
    expect(p.bloco).toBeNull();
    expect(p.numero).toBe(201);
  });

  it('parses multi-letter block (AB101)', () => {
    const p = parseApt('AB101');
    expect(p.bloco).toBe('AB');
    expect(p.numero).toBe(101);
  });

  it('normalizes block to uppercase', () => {
    const p = parseApt('a103');
    expect(p.bloco).toBe('A');
  });

  it('preserves raw value', () => {
    const p = parseApt('101A');
    expect(p.raw).toBe('101A');
  });
});

describe('aptSortKey', () => {
  it('sorts numeric-only before block-prefixed', () => {
    const k1 = aptSortKey('201');
    const k2 = aptSortKey('A101');
    expect(k1[0]).toBeLessThan(k2[0]);
  });

  it('sorts blocks alphabetically', () => {
    const kA = aptSortKey('A101');
    const kB = aptSortKey('B101');
    expect(kA[0]).toBeLessThan(kB[0]);
  });

  it('sorts numbers within same block', () => {
    const k1 = aptSortKey('A101');
    const k2 = aptSortKey('A102');
    expect(k1[2]).toBeLessThan(k2[2]);
  });
});

describe('aptBlockLabel', () => {
  it('returns block letter for A101', () => {
    expect(aptBlockLabel('A101')).toBe('A');
  });

  it('returns block letter for 101A', () => {
    expect(aptBlockLabel('101A')).toBe('A');
  });

  it('returns S/B for plain numeric', () => {
    expect(aptBlockLabel('201')).toBe('S/B');
  });
});

describe('formatAptDisplay', () => {
  it('formats A103 as A-103', () => {
    expect(formatAptDisplay('A103')).toBe('A-103');
  });

  it('formats 101A as A-101', () => {
    expect(formatAptDisplay('101A')).toBe('A-101');
  });

  it('keeps plain numeric as-is', () => {
    expect(formatAptDisplay('201')).toBe('201');
  });
});
