export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function findDuplicates(files: File[]): Promise<Map<string, File[]>> {
  const byHash = new Map<string, File[]>();
  for (const file of files) {
    const hash = await hashFile(file);
    const group = byHash.get(hash) || [];
    group.push(file);
    byHash.set(hash, group);
  }
  const dupes = new Map<string, File[]>();
  for (const [hash, group] of byHash) {
    if (group.length > 1) {
      dupes.set(hash, group);
    }
  }
  return dupes;
}

export function deduplicateByHash(files: File[]): File[] {
  const seen = new Set<string>();
  const result: File[] = [];
  for (const file of files) {
    const key = file.name + '__' + file.size;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(file);
    }
  }
  return result;
}
