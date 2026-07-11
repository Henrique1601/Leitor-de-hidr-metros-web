import { GoogleGenerativeAI } from '@google/generative-ai';

const rawKey = (process.env.GEMINI_API_KEY || '').trim();
const apiKey = rawKey.split(/\s+/)[0] || rawKey;
const genAI = new GoogleGenerativeAI(apiKey);

export interface MedidorRead {
  posicao: number;
  indiceInteiro: string;
  indiceDecimal: string;
  confianca: 'alta' | 'media' | 'baixa';
  observacao: string;
}

const PROMPT = (n: number, apts: string[]) => `Esta foto mostra ${n} hidrômetro(s) de água. ${
  apts.length ? `Os apartamentos, na ordem esquerda->direita, são: ${apts.join(', ')}.` : ''
}

Para CADA hidrômetro visível na foto, da ESQUERDA para a DIREITA:
1. Leia o número do índice (o mostrador com os dígitos pretos/brancos que mostram o consumo total, geralmente 5-6 dígitos). Ignore os dígitos vermelhos/decimais menores se houver separação clara entre eles e os dígitos principais — reporte ambos separadamente se estiver em dúvida.
2. Avalie sua confiança na leitura (alta/media/baixa).
3. Anote qualquer problema (embaçado, reflexo, número parcialmente coberto, etc).

Responda APENAS em JSON válido, sem markdown, no formato:
{"medidores": [{"posicao": 1, "indice_inteiro": "12345", "indice_decimal": "678", "confianca": "alta", "observacao": ""}]}

Se não conseguir ler algum hidrômetro com segurança, ainda assim inclua o item com confianca "baixa" e a observação explicando o problema.`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function extractWithGemini(
  imageBase64: string,
  mediaType: string,
  apartamentos: string[]
): Promise<{ medidores: MedidorRead[] }> {
  if (!apiKey || apiKey.length < 10) {
    throw new Error('GEMINI_API_KEY não configurada ou inválida');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mediaType || 'image/jpeg',
    },
  };

  const n = apartamentos.length || 1;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent([PROMPT(n, apartamentos), imagePart]);
      const text = result.response.text();

      const cleaned = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleaned);

      const medidores = (parsed.medidores || []).map((m: any) => ({
        posicao: m.posicao,
        indiceInteiro: String(m.indice_inteiro ?? ''),
        indiceDecimal: String(m.indice_decimal ?? ''),
        confianca: m.confianca ?? 'baixa',
        observacao: m.observacao ?? '',
      }));

      return { medidores };
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('quota');
      if (isQuotaError && attempt < maxRetries - 1) {
        const delay = (attempt + 1) * 10000;
        console.warn(`Gemini quota hit, retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Gemini falhou após todas as tentativas');
}
