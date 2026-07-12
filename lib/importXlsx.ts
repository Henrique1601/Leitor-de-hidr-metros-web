import * as XLSX from 'xlsx';
import type { GroupedRow } from './results';

export interface ImportXlsxResult {
  rows: GroupedRow[];
  label: string;
  errors: string[];
}

const APT_ALIASES = ['ape', 'ap', 'apartamento', 'apto', 'apart', 'unidade', 'unit', 'flat'];
const INDICE_ALIASES = ['indice', 'index', 'leitura', 'reading', 'valor', 'value', 'hidrometro', 'medidor'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findCol(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (aliases.some((a) => h === a || h.includes(a))) return i;
  }
  return -1;
}

export function parseXlsx(buffer: ArrayBuffer, fallbackLabel?: string): ImportXlsxResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], label: fallbackLabel || '', errors: ['Planilha vazia'] };

  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  if (raw.length < 2) return { rows: [], label: fallbackLabel || '', errors: ['Planilha sem dados (menos de 2 linhas)'] };

  const headers = raw[0].map(String);
  const aptIdx = findCol(headers, APT_ALIASES);
  const indiceIdx = findCol(headers, INDICE_ALIASES);

  if (aptIdx === -1 || indiceIdx === -1) {
    return {
      rows: [],
      label: fallbackLabel || '',
      errors: [
        aptIdx === -1 ? 'Coluna de apartamento nao encontrada' : '',
        indiceIdx === -1 ? 'Coluna de indice nao encontrada' : '',
      ].filter(Boolean),
    };
  }

  const rows: GroupedRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    const apt = String(row[aptIdx] ?? '').trim();
    const indice = String(row[indiceIdx] ?? '').trim();
    if (!apt || !indice) continue;

    rows.push({
      apartamento: apt,
      indice,
      consumo: '',
      confianca: 'N/A',
      observacao: 'Importado de planilha',
      arquivos: `importado_${sheetName}`,
    });
  }

  if (rows.length === 0) {
    errors.push('Nenhuma linha valida encontrada na planilha');
  }

  const label = fallbackLabel || sheetName || new Date().toLocaleDateString('pt-BR');
  return { rows, label, errors };
}
