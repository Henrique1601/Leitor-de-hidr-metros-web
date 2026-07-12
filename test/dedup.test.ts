import { describe, it, expect } from 'vitest';
import { deduplicateByHash } from '@/lib/dedup';

function makeFile(name: string, size: number): File {
  return new File(['x'.repeat(size)], name, { type: 'image/jpeg' });
}

describe('deduplicateByHash', () => {
  it('keeps unique files', () => {
    const f1 = makeFile('a.jpg', 100);
    const f2 = makeFile('b.jpg', 200);
    const result = deduplicateByHash([f1, f2]);
    expect(result.length).toBe(2);
  });

  it('removes duplicate name+size', () => {
    const f1 = makeFile('a.jpg', 100);
    const f2 = makeFile('a.jpg', 100);
    const result = deduplicateByHash([f1, f2]);
    expect(result.length).toBe(1);
  });

  it('keeps files with same name but different size', () => {
    const f1 = makeFile('a.jpg', 100);
    const f2 = makeFile('a.jpg', 200);
    const result = deduplicateByHash([f1, f2]);
    expect(result.length).toBe(2);
  });

  it('keeps files with same size but different name', () => {
    const f1 = makeFile('a.jpg', 100);
    const f2 = makeFile('b.jpg', 100);
    const result = deduplicateByHash([f1, f2]);
    expect(result.length).toBe(2);
  });

  it('handles empty array', () => {
    const result = deduplicateByHash([]);
    expect(result.length).toBe(0);
  });
});
