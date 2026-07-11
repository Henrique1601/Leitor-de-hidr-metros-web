import path from 'path';
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

function resolveLocalPath(relativePath: string): string {
  const pkgDir = path.dirname(require.resolve('tesseract.js/package.json'));
  return path.join(pkgDir, relativePath);
}

export async function extractWithTesseract(
  imageBase64: string,
  mediaType: string,
  apartamentos: string[]
): Promise<{ medidores: MedidorRead[]; fallback: boolean }> {
  const buffer = Buffer.from(imageBase64, 'base64');

  const worker = await Tesseract.createWorker('eng', undefined, {
    workerPath: resolveLocalPath('dist/worker.min.js'),
    corePath: resolveLocalPath('dist/tesseract-core-simd.wasm.js'),
    langPath: resolveLocalPath('dist'),
  });

  try {
    const { data } = await worker.recognize(buffer);
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
          observacao: 'Leitura via OCR (fallback) - confianca reduzida',
        });
      } else {
        medidores.push({
          posicao: i + 1,
          indiceInteiro: '',
          indiceDecimal: '',
          confianca: 'baixa',
          observacao: 'Nao foi possivel ler via OCR',
        });
      }
    }

    return { medidores, fallback: true };
  } finally {
    await worker.terminate();
  }
}
