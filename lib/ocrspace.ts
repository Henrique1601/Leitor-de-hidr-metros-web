import type { MedidorRead } from './gemini';

const OCR_API_KEY = (process.env.OCR_SPACE_API_KEY || '').trim();
const OCR_API_URL = 'https://api.ocr.space/parse/image';

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

export async function extractWithOCRSpace(
  imageBase64: string,
  mediaType: string,
  apartamentos: string[]
): Promise<{ medidores: MedidorRead[] }> {
  if (!OCR_API_KEY || OCR_API_KEY.length < 10) {
    throw new Error('OCR_SPACE_API_KEY não configurada ou inválida');
  }

  const dataUri = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:${mediaType || 'image/jpeg'};base64,${imageBase64}`;

  const formData = new URLSearchParams();
  formData.append('base64Image', dataUri);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');

  const response = await fetch(OCR_API_URL, {
    method: 'POST',
    headers: {
      apikey: OCR_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OCR.space API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data.IsErroredOnProcessing) {
    const errorMsg = data.ErrorMessage?.join(', ') || 'OCR processing error';
    throw new Error(`OCR.space: ${errorMsg}`);
  }

  const parsedResults = data.ParsedResults || [];
  const fullText = parsedResults.map((r: any) => r.ParsedText || '').join('\n');

  console.log(`[OCR.space] Texto extraído: ${fullText.substring(0, 200)}`);

  const numbers = extractNumbers(fullText);
  console.log(`[OCR.space] Números encontrados: ${JSON.stringify(numbers)}`);

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
        observacao: 'Leitura via OCR.space',
      });
    } else {
      medidores.push({
        posicao: i + 1,
        indiceInteiro: '',
        indiceDecimal: '',
        confianca: 'baixa',
        observacao: 'Não foi possível ler via OCR.space',
      });
    }
  }

  return { medidores };
}
