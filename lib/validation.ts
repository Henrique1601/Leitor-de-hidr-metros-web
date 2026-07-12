export interface ValidacaoItem {
  regra: string;
  mensagem: string;
  severidade: 'alerta' | 'critico';
}

const REGRAS: { regra: string; test: (indice: string, consumo: string, observacao: string) => string | null; severidade: 'alerta' | 'critico' }[] = [
  {
    regra: 'indice_maior_99999',
    test: (indice) => {
      if (!indice) return null;
      const cleaned = indice.replace(/[^\d,\.]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 99999) return 'Indice > 99.999 (possivel erro de OCR)';
      return null;
    },
    severidade: 'alerta',
  },
  {
    regra: 'consumo_negativo',
    test: (_, consumo) => {
      if (!consumo) return null;
      const cleaned = consumo.replace(/[^\d\-\.]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num < 0) return 'Consumo negativo (hodrometro retrocedeu?)';
      return null;
    },
    severidade: 'alerta',
  },
  {
    regra: 'consumo_muito_alto',
    test: (_, consumo) => {
      if (!consumo) return null;
      const cleaned = consumo.replace(/[^\d\-\.]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 500) return 'Consumo > 500 m³ (possivel erro de leitura)';
      return null;
    },
    severidade: 'alerta',
  },
  {
    regra: 'divergencia_fotos',
    test: (_, __, observacao) => {
      if (observacao && observacao.toUpperCase().includes('DIVERG')) return 'Divergencia entre fotos do mesmo apartamento';
      return null;
    },
    severidade: 'critico',
  },
  {
    regra: 'sem_leitura',
    test: (indice) => {
      if (!indice || indice.trim() === '') return 'Sem leitura capturada';
      return null;
    },
    severidade: 'alerta',
  },
];

export function validarLeitura(indice: string, consumo: string, observacao: string): ValidacaoItem[] {
  const itens: ValidacaoItem[] = [];
  for (const r of REGRAS) {
    const msg = r.test(indice, consumo, observacao);
    if (msg) {
      itens.push({ regra: r.regra, mensagem: msg, severidade: r.severidade });
    }
  }
  return itens;
}

export function formatarValidacao(validacoes: ValidacaoItem[]): string {
  if (validacoes.length === 0) return '';
  return validacoes.map((v) => `${v.severidade === 'critico' ? '🔴' : '⚠️'} ${v.mensagem}`).join('; ');
}
