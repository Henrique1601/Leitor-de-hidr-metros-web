import Tesseract from 'tesseract.js';
import type { MedidorRead } from './gemini';

function extractNumbers(text: string): string[] {
  const matches = text.match(/\d{4,7}/g);
  return matches || [];
}

function calculateConfidence(numbers: string[]): 'alta' | 'media' | 'baixa' {
  if (numbers.length === 0) return 'baixa';
  const allSame = numbers.every((n) => n === numbers[0]);
  if (allSame && numbers[0].length >= 5) return 'media';
  if (numbers.length >= 1 && numbers[0].length >= 5) return 'media';
  return 'baixa';
}

export async function extractWithTesseract(
  imageBase64: string,
  mediaType: string,
  apartamentos: string[]
): Promise<{ medidores: MedidorRead[]; fallback: boolean }> {
  const buffer = Buffer.from(imageBase64, 'base64');

  const { data } = await Tesseract.recognize(buffer, 'eng', {
    logger: () => {},
  });

  const text = data.text;
  const numbers = extractNumbers(text);

  const medidores: MedidorRead[] = [];
  const n = apartamentos.length || 1;

  for (let i = 0; i < n; i++) {
    if (i < numbers.length) {
      const num = numbers[i];
      medidores.push({
        posicao: i + 1,
        indiceInteiro: num,
        indiceDecimal: '',
        confianca: calculateConfidence([num]),
        observacao: `Leitura via OCR (fallback) - confiança reduzida`,
      });
    } else {
      medidores.push({
        posicao: i + 1,
        indiceInteiro: '',
        indiceDecimal: '',
        confianca: 'baixa',
        observacao: 'Não foi possível ler via OCR',
      });
    }
  }

  return { medidores, fallback: true };
}
