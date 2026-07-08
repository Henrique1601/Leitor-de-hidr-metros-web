export interface MedidorLeitura {
  posicao: number;
  indiceInteiro: string;
  indiceDecimal: string;
  confianca: 'alta' | 'media' | 'baixa';
  observacao: string;
}

export interface ExtractResult {
  arquivo: string;
  apartamentosEsperados: string[];
  medidores: MedidorLeitura[];
  semAcesso?: boolean;
  erro?: string;
}

export interface GroupedRow {
  apartamento: string;
  indice: string;
  confianca: string;
  observacao: string;
  arquivos: string;
}

function aptSortKey(apt: string): [number, number, string] {
  const m = apt.match(/^(\d+)([A-Za-z]*)$/);
  if (m) return [0, parseInt(m[1], 10), m[2]];
  return [1, 0, apt];
}

export function groupByApartment(results: ExtractResult[]): GroupedRow[] {
  const byApt = new Map<
    string,
    { arquivo: string; indice: string | null; confianca: string; observacao: string }[]
  >();
  const semAcesso = new Set<string>();

  for (const r of results) {
    if (r.semAcesso) {
      r.apartamentosEsperados.forEach((a) => semAcesso.add(a));
      continue;
    }
    r.apartamentosEsperados.forEach((apt, idx) => {
      const pos = idx + 1;
      const m = r.medidores.find((x) => x.posicao === pos) ?? r.medidores[idx];
      const list = byApt.get(apt) ?? [];
      if (m) {
        const indice = m.indiceDecimal ? `${m.indiceInteiro},${m.indiceDecimal}` : m.indiceInteiro;
        list.push({ arquivo: r.arquivo, indice, confianca: m.confianca, observacao: m.observacao });
      } else {
        list.push({
          arquivo: r.arquivo,
          indice: null,
          confianca: 'baixa',
          observacao: r.erro || 'não foi possível casar medidor com apê nesta foto',
        });
      }
      byApt.set(apt, list);
    });
  }

  const rows: GroupedRow[] = [];
  for (const apt of semAcesso) {
    rows.push({ apartamento: apt, indice: '', confianca: 'N/A', observacao: 'Sem acesso ao hidrômetro', arquivos: '' });
  }

  for (const [apt, leituras] of byApt.entries()) {
    const valores = new Set(leituras.filter((l) => l.indice).map((l) => l.indice as string));
    const arquivos = leituras.map((l) => l.arquivo).join(', ');
    if (valores.size === 1) {
      const indice = Array.from(valores)[0];
      const confs = leituras.filter((l) => l.indice).map((l) => l.confianca);
      const conf = confs.every((c) => c === 'alta') ? 'alta' : confs.length ? 'media' : 'baixa';
      let obs = Array.from(new Set(leituras.map((l) => l.observacao).filter(Boolean))).join('; ');
      if (leituras.length > 1) obs = (obs ? obs + '; ' : '') + `confirmado em ${leituras.length} foto(s)`;
      rows.push({ apartamento: apt, indice, confianca: conf, observacao: obs, arquivos });
    } else if (valores.size > 1) {
      rows.push({
        apartamento: apt,
        indice: Array.from(valores).join(' / '),
        confianca: 'baixa',
        observacao: 'DIVERGÊNCIA entre fotos - revisar manualmente',
        arquivos,
      });
    } else {
      const obs = Array.from(new Set(leituras.map((l) => l.observacao).filter(Boolean))).join('; ');
      rows.push({ apartamento: apt, indice: '', confianca: 'baixa', observacao: obs || 'não foi possível ler', arquivos });
    }
  }

  rows.sort((a, b) => {
    const ka = aptSortKey(a.apartamento);
    const kb = aptSortKey(b.apartamento);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    return ka[2].localeCompare(kb[2]);
  });

  return rows;
}
