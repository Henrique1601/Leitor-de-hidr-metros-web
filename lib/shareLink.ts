import type { GroupedRow } from './results';

interface SharePayload {
  label: string;
  date: string;
  rows: GroupedRow[];
}

export function encodeShareUrl(rows: GroupedRow[], label: string): string {
  const payload: SharePayload = {
    label,
    date: new Date().toISOString(),
    rows,
  };
  const json = JSON.stringify(payload);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return `${base}#result=${encoded}`;
}

export function decodeShareUrl(hash: string): SharePayload | null {
  try {
    const prefix = '#result=';
    if (!hash.startsWith(prefix)) return null;
    const encoded = hash.slice(prefix.length);
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json) as SharePayload;
    if (!payload.rows || !Array.isArray(payload.rows)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function copyShareLink(rows: GroupedRow[], label: string): Promise<boolean> {
  try {
    const url = encodeShareUrl(rows, label);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
