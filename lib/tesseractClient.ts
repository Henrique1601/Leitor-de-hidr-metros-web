import type { ExtractResult } from './results';

let workerPromise: Promise<any> | null = null;

async function getWorker() {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const Tesseract = await import('tesseract.js');
    const worker = await Tesseract.createWorker('eng', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core.wasm.js',
      langPath: '/',
    });
    return worker;
  })();
  return workerPromise;
}

export async function extractLocal(
  base64: string,
  mediaType: string,
  apartamentos: string[]
): Promise<ExtractResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(`data:${mediaType};base64,${base64}`);

  const nums = (data.text.match(/\b(\d{4,7})\b/g) || []).slice(0, apartamentos.length);

  const confianca =
    data.confidence > 85 ? 'alta' : data.confidence > 60 ? 'media' : 'baixa';

  return {
    arquivo: '',
    apartamentosEsperados: apartamentos,
    medidores: nums.map((num: string, i: number) => ({
      posicao: i + 1,
      indiceInteiro: num,
      indiceDecimal: '',
      confianca: confianca as 'alta' | 'media' | 'baixa',
      observacao: '',
    })),
  };
}
