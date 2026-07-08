import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'claude-sonnet-4-6';

const PROMPT_TEMPLATE = (n: number, apts: string[]) => `Esta foto mostra ${n} hidrômetro(s) de água. ${
  apts.length ? `Os apartamentos, na ordem esquerda->direita, são: ${apts.join(', ')}.` : ''
}

Para CADA hidrômetro visível na foto, da ESQUERDA para a DIREITA:
1. Leia o número do índice (o mostrador com os dígitos pretos/brancos que mostram o consumo total, geralmente 5-6 dígitos). Ignore os dígitos vermelhos/decimais menores se houver separação clara entre eles e os dígitos principais — reporte ambos separadamente se estiver em dúvida.
2. Avalie sua confiança na leitura (alta/media/baixa).
3. Anote qualquer problema (embaçado, reflexo, número parcialmente coberto, etc).

Responda APENAS em JSON válido, sem markdown, no formato:
{"medidores": [{"posicao": 1, "indice_inteiro": "12345", "indice_decimal": "678", "confianca": "alta", "observacao": ""}]}

Se não conseguir ler algum hidrômetro com segurança, ainda assim inclua o item com confianca "baixa" e a observação explicando o problema.`;

export async function POST(req: NextRequest) {
  try {
    const { arquivo, apartamentos, imageBase64, mediaType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ arquivo, erro: 'imagem ausente' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const apts: string[] = apartamentos ?? [];
    const n = apts.length || 1;

    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: PROMPT_TEMPLATE(n, apts) },
          ],
        },
      ],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const cleaned = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    const medidores = (parsed.medidores || []).map((m: any) => ({
      posicao: m.posicao,
      indiceInteiro: String(m.indice_inteiro ?? ''),
      indiceDecimal: String(m.indice_decimal ?? ''),
      confianca: m.confianca ?? 'baixa',
      observacao: m.observacao ?? '',
    }));

    return NextResponse.json({ arquivo, apartamentosEsperados: apts, medidores });
  } catch (err: any) {
    return NextResponse.json(
      { erro: err?.message || 'falha desconhecida' },
      { status: 500 }
    );
  }
}
