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
): Promise<import('./results').ExtractResult> {
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

let ocrWorker: Worker | null = null;
let ocrCallbacks = new Map<string, {
  resolve: (result: import('./results').ExtractResult) => void;
  reject: (err: Error) => void;
}>();

function getOcrWorker(): Worker {
  if (ocrWorker) return ocrWorker;

  ocrWorker = new Worker(
    new URL('./ocrWorker.worker.ts', import.meta.url),
    { type: 'module' }
  );

  ocrWorker.onmessage = (e: MessageEvent) => {
    const { id, result, error } = e.data;
    const cb = ocrCallbacks.get(id);
    if (!cb) return;
    ocrCallbacks.delete(id);

    if (error) {
      cb.reject(new Error(error));
    } else {
      cb.resolve(result);
    }
  };

  return ocrWorker;
}

export function extractLocalWorker(
  base64: string,
  mediaType: string,
  apartamentos: string[]
): Promise<import('./results').ExtractResult> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const worker = getOcrWorker();

  return new Promise((resolve, reject) => {
    ocrCallbacks.set(id, { resolve, reject });
    worker.postMessage({ id, base64, mediaType, apartamentos });
  });
}

export function terminateOcrWorker() {
  if (ocrWorker) {
    ocrWorker.terminate();
    ocrWorker = null;
  }
  ocrCallbacks.clear();
}
