export interface PhotoIndexRow {
  arquivo: string;
  data: string;
  legendaBruta: string;
  apartamentos: string[];
  flags: string[];
}

type ChatFormat = 'whatsapp' | 'telegram' | 'imessage';

const NO_ACCESS_WORDS = ['ninguém', 'ninguem', 'fechado', 'sem acesso', 'trancado', 'não atendeu', 'nao atendeu'];
const APT_TOKEN = /\b(\d{1,4}[A-Za-z]{1,2}|[A-Za-z]{1,2}\d{1,4})\b/g;
const ARROWS = /[⏪⏩\u200e\u200f]/g;

const FORMAT_DETECTORS: { format: ChatFormat; test: (line: string) => boolean }[] = [
  { format: 'whatsapp', test: (l) => /^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2} da (manhã|tarde|noite) - /.test(l) },
  { format: 'telegram', test: (l) => /^\[?\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\]? /.test(l) },
  { format: 'imessage', test: (l) => /^\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}( AM| PM)? - /.test(l) },
];

const ATTACH_PATTERNS: Record<ChatFormat, { regex: RegExp; dateGroup: number; fileGroup: number }> = {
  whatsapp: {
    regex: /\u200e?(IMG[-_](\d{8})[-_]WA\d+\.(jpg|jpeg|png|webp))[\s]*(?:\(arquivo anexado\)|<.*>)?/i,
    dateGroup: 2,
    fileGroup: 1,
  },
  telegram: {
    regex: /(photo[_ ]?\d{4}[-_]?\d{2}[-_]?\d{2}[-_]?\d{2}[-_]?\d{2}[-_]?\d{2}\.(jpg|jpeg|png))/i,
    dateGroup: 0,
    fileGroup: 1,
  },
  imessage: {
    regex: /(IMG_\d{8}_\d{6}\.(jpg|jpeg|png))/i,
    dateGroup: 0,
    fileGroup: 1,
  },
};

const MSG_PATTERNS: Record<ChatFormat, RegExp> = {
  whatsapp: /^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2} da (manhã|tarde|noite) - /,
  telegram: /^\[?\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\]? /,
  imessage: /^\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}( AM| PM)? - /,
};

function detectFormat(lines: string[]): ChatFormat {
  for (const line of lines.slice(0, 50)) {
    for (const { format, test } of FORMAT_DETECTORS) {
      if (test(line)) return format;
    }
  }
  return 'whatsapp';
}

function extractDateFromTelegramFile(fname: string): string {
  const m = fname.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
  if (m) return m[1] + m[2] + m[3];
  return '';
}

function extractDateFromIMessageFile(fname: string): string {
  const m = fname.match(/IMG_(\d{4})(\d{2})(\d{2})_(\d{6})/);
  if (m) return m[1] + m[2] + m[3];
  return '';
}

function extractDateFromLine(line: string, format: ChatFormat): string {
  let m: RegExpMatchArray | null = null;
  if (format === 'imessage') {
    m = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return '';
    const month = m[1].padStart(2, '0');
    const day = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = '20' + year;
    return year + month + day;
  }
  m = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return '';
  return m[3] + m[2] + m[1];
}

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

function filterAndBuild(
  order: { fname: string; datestr: string; rawCaption: string }[],
  dateStart?: string,
  dateEnd?: string,
): PhotoIndexRow[] {
  const ds = dateStart ? dateStart.replaceAll('-', '') : undefined;
  const de = dateEnd ? dateEnd.replaceAll('-', '') : undefined;
  const rows: PhotoIndexRow[] = [];
  let lastApts: string[] | null = null;

  for (const { fname, datestr, rawCaption } of order) {
    if (ds && datestr && datestr < ds) continue;
    if (de && datestr && datestr > de) continue;
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

function parseWhatsApp(chatText: string, dateStart?: string, dateEnd?: string): PhotoIndexRow[] {
  const lines = chatText.split('\n');
  const n = lines.length;
  let i = 0;
  const order: { fname: string; datestr: string; rawCaption: string }[] = [];
  const attachPattern = ATTACH_PATTERNS.whatsapp;

  while (i < n) {
    const m = attachPattern.regex.exec(lines[i]);
    if (m) {
      const fname = m[attachPattern.fileGroup];
      const datestr = m[attachPattern.dateGroup];
      let j = i + 1;
      const captionLines: string[] = [];
      while (j < n && !MSG_PATTERNS.whatsapp.test(lines[j])) {
        if (lines[j].trim()) captionLines.push(lines[j].trim());
        j += 1;
      }
      order.push({ fname, datestr, rawCaption: captionLines.join(' ') });
      i = j;
    } else {
      i += 1;
    }
  }
  return filterAndBuild(order, dateStart, dateEnd);
}

function parseTelegram(chatText: string, dateStart?: string, dateEnd?: string): PhotoIndexRow[] {
  const lines = chatText.split('\n');
  const n = lines.length;
  const order: { fname: string; datestr: string; rawCaption: string }[] = [];
  const attachPattern = ATTACH_PATTERNS.telegram;
  const msgPattern = MSG_PATTERNS.telegram;

  for (let i = 0; i < n; i++) {
    const line = lines[i];
    const attachMatch = attachPattern.regex.exec(line);
    if (attachMatch) {
      const fname = attachMatch[attachPattern.fileGroup];
      const datestr = extractDateFromTelegramFile(fname) || extractDateFromLine(line, 'telegram');
      let caption = '';
      if (msgPattern.test(line)) {
        const colonIdx = line.indexOf(': ');
        if (colonIdx > -1) {
          const afterColon = line.slice(colonIdx + 2);
          const fileIdx = afterColon.indexOf(attachMatch[0]);
          if (fileIdx > -1) caption = afterColon.slice(0, fileIdx).trim();
        }
      }
      if (!caption && i + 1 < n && !msgPattern.test(lines[i + 1]) && !attachPattern.regex.test(lines[i + 1])) {
        caption = lines[i + 1].trim();
      }
      order.push({ fname, datestr, rawCaption: caption });
    }
  }
  return filterAndBuild(order, dateStart, dateEnd);
}

function parseIMessage(chatText: string, dateStart?: string, dateEnd?: string): PhotoIndexRow[] {
  const lines = chatText.split('\n');
  const n = lines.length;
  const order: { fname: string; datestr: string; rawCaption: string }[] = [];
  const attachPattern = ATTACH_PATTERNS.imessage;
  const msgPattern = MSG_PATTERNS.imessage;

  for (let i = 0; i < n; i++) {
    const line = lines[i];
    const attachMatch = attachPattern.regex.exec(line);
    if (attachMatch) {
      const fname = attachMatch[attachPattern.fileGroup];
      const datestr = extractDateFromIMessageFile(fname) || extractDateFromLine(line, 'imessage');
      let caption = '';
      if (msgPattern.test(line)) {
        const colonIdx = line.indexOf(': ');
        if (colonIdx > -1) caption = line.slice(colonIdx + 2).replace(attachMatch[0], '').trim();
      }
      if (!caption && i + 1 < n && !msgPattern.test(lines[i + 1]) && !attachPattern.regex.test(lines[i + 1])) {
        caption = lines[i + 1].trim();
      }
      order.push({ fname, datestr, rawCaption: caption });
    }
  }
  return filterAndBuild(order, dateStart, dateEnd);
}

export function parseChat(chatText: string, dateStart?: string, dateEnd?: string): PhotoIndexRow[] {
  const format = detectFormat(chatText.split('\n'));
  console.log(`[parseChat] Formato detectado: ${format}, linhas: ${chatText.split('\n').length}`);
  let rows: PhotoIndexRow[];
  switch (format) {
    case 'telegram':
      rows = parseTelegram(chatText, dateStart, dateEnd);
      break;
    case 'imessage':
      rows = parseIMessage(chatText, dateStart, dateEnd);
      break;
    default:
      rows = parseWhatsApp(chatText, dateStart, dateEnd);
  }
  console.log(`[parseChat] Fotos encontradas: ${rows.length}`);
  return rows;
}

export function getChatFormat(chatText: string): ChatFormat {
  return detectFormat(chatText.split('\n'));
}
