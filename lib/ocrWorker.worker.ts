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

self.onmessage = async (e: MessageEvent) => {
  const { id, base64, mediaType, apartamentos } = e.data;

  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(`data:${mediaType};base64,${base64}`);

    const nums = (data.text.match(/\b(\d{4,7})\b/g) || []).slice(0, apartamentos.length);
    const confianca =
      data.confidence > 85 ? 'alta' : data.confidence > 60 ? 'media' : 'baixa';

    const result = {
      arquivo: '',
      apartamentosEsperados: apartamentos,
      medidores: nums.map((num: string, i: number) => ({
        posicao: i + 1,
        indiceInteiro: num,
        indiceDecimal: '',
        confianca,
        observacao: '',
      })),
    };

    self.postMessage({ id, result });
  } catch (err: any) {
    self.postMessage({ id, error: err?.message || 'OCR failed' });
  }
};
