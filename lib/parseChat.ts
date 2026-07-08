export interface PhotoIndexRow {
  arquivo: string;
  data: string; // YYYYMMDD
  legendaBruta: string;
  apartamentos: string[];
  flags: string[];
}

const MSG_START = /^(\d{2})\/(\d{2})\/(\d{4}) \d{1,2}:\d{2} da (manhã|tarde|noite) - /;
const ATTACH_RE = /\u200e?(IMG-(\d{8})-WA\d+\.(jpg|jpeg|png))\s\(arquivo anexado\)/i;
const NO_ACCESS_WORDS = ['ninguém', 'ninguem', 'fechado', 'sem acesso', 'trancado', 'não atendeu', 'nao atendeu'];
const APT_TOKEN = /\b(\d{1,4}[A-Za-z]{1,2}|[A-Za-z]{1,2}\d{1,4})\b/g;
const ARROWS = /[⏪⏩\u200e]/g;

function clean(text: string) {
  return text.replace(ARROWS, '').trim();
}

function parseAptList(caption: string): { apts: string[]; flags: string[] } {
  const flags: string[] = [];
  const c = clean(caption);
  if (!c) return { apts: [], flags: ['sem_legenda'] };
  let low = c.toLowerCase();
  for (const w of NO_ACCESS_WORDS) {
    if (low.includes(w)) {
      flags.push('sem_acesso');
      low = low.split(w).join(' ');
    }
  }
  const apts = Array.from(low.matchAll(APT_TOKEN)).map((m) => m[1].toUpperCase());
  if (apts.length === 0) {
    flags.push('formato_inesperado');
    return { apts: [c.toUpperCase()], flags };
  }
  if (apts.length > 2) flags.push('mais_de_2_no_mesmo_bloco');
  return { apts, flags };
}

export function parseChat(chatText: string, dateStart?: string, dateEnd?: string): PhotoIndexRow[] {
  const lines = chatText.split('\n');
  const n = lines.length;
  let i = 0;
  const order: { fname: string; datestr: string; rawCaption: string }[] = [];

  while (i < n) {
    const m = ATTACH_RE.exec(lines[i]);
    if (m) {
      const fname = m[1];
      const datestr = m[2];
      let j = i + 1;
      const captionLines: string[] = [];
      while (j < n && !MSG_START.test(lines[j])) {
        if (lines[j].trim()) captionLines.push(lines[j].trim());
        j += 1;
      }
      order.push({ fname, datestr, rawCaption: captionLines.join(' ') });
      i = j;
    } else {
      i += 1;
    }
  }

  const ds = dateStart ? dateStart.replaceAll('-', '') : undefined;
  const de = dateEnd ? dateEnd.replaceAll('-', '') : undefined;

  const rows: PhotoIndexRow[] = [];
  let lastApts: string[] | null = null;

  for (const { fname, datestr, rawCaption } of order) {
    if (ds && datestr < ds) continue;
    if (de && datestr > de) continue;
    let { apts, flags } = parseAptList(rawCaption);
    if (apts.length === 0 && lastApts) {
      apts = lastApts;
      flags = flags.filter((f) => f !== 'sem_legenda').concat('legenda_herdada_da_foto_anterior');
    }
    if (apts.length > 0 && !flags.includes('sem_acesso')) lastApts = apts;
    rows.push({ arquivo: fname, data: datestr, legendaBruta: rawCaption, apartamentos: apts, flags });
  }
  return rows;
}
