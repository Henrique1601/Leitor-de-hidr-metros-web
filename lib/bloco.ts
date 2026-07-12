export interface AptParsed {
  bloco: string | null;
  numero: number;
  raw: string;
}

const APT_PATTERNS = [
  /^(\d{1,4})([A-Za-z]{1,2})$/,
  /^([A-Za-z]{1,2})(\d{1,4})$/,
];

export function parseApt(raw: string): AptParsed {
  const clean = raw.trim();
  for (const pat of APT_PATTERNS) {
    const m = clean.match(pat);
    if (m) {
      const part1 = m[1];
      const part2 = m[2];
      if (/^\d+$/.test(part1)) {
        return { bloco: part2.toUpperCase(), numero: parseInt(part1, 10), raw: clean };
      }
      return { bloco: part1.toUpperCase(), numero: parseInt(part2, 10), raw: clean };
    }
  }
  const num = parseInt(clean, 10);
  return { bloco: null, isNaN: isNaN(num), numero: isNaN(num) ? 0 : num, raw: clean } as AptParsed;
}

export function aptSortKey(raw: string): [number, string, number] {
  const p = parseApt(raw);
  const blockOrder = p.bloco ? p.bloco.charCodeAt(0) - 64 : 0;
  return [blockOrder, p.bloco || '', p.numero];
}

export function aptBlockLabel(raw: string): string {
  const p = parseApt(raw);
  return p.bloco || 'S/B';
}

export function formatAptDisplay(raw: string): string {
  const p = parseApt(raw);
  if (p.bloco) return `${p.bloco}-${p.numero}`;
  return raw;
}
