import { NextRequest, NextResponse } from "next/server";
import { extractWithGemini } from "@/lib/gemini";
import { extractWithOCRSpace } from "@/lib/ocrspace";
import { extractWithTesseract } from "@/lib/tesseract";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { arquivo, apartamentos, imageBase64, mediaType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { arquivo, erro: "imagem ausente" },
        { status: 400 },
      );
    }

    const apts: string[] = apartamentos ?? [];

    const hasGemini = !!(process.env.GEMINI_API_KEY || '').trim() &&
      (process.env.GEMINI_API_KEY || '').trim().length >= 10;
    const hasOCRSpace = !!(process.env.OCR_SPACE_API_KEY || '').trim() &&
      (process.env.OCR_SPACE_API_KEY || '').trim().length >= 10;

    if (hasGemini) {
      try {
        const result = await extractWithGemini(imageBase64, mediaType, apts);
        return NextResponse.json({
          arquivo,
          apartamentosEsperados: apts,
          medidores: result.medidores,
          fallback: false,
        });
      } catch (geminiError: any) {
        console.warn(`Gemini falhou para ${arquivo}: ${geminiError?.message}`);
      }
    }

    if (hasOCRSpace) {
      try {
        console.log(`Tentando OCR.space para ${arquivo}...`);
        const result = await extractWithOCRSpace(imageBase64, mediaType, apts);
        return NextResponse.json({
          arquivo,
          apartamentosEsperados: apts,
          medidores: result.medidores,
          fallback: !hasGemini,
        });
      } catch (ocrError: any) {
        console.warn(`OCR.space falhou para ${arquivo}: ${ocrError?.message}`);
      }
    }

    try {
      console.log(`Tentando Tesseract fallback para ${arquivo}...`);
      const fallbackResult = await extractWithTesseract(imageBase64, mediaType, apts);
      return NextResponse.json({
        arquivo,
        apartamentosEsperados: apts,
        medidores: fallbackResult.medidores,
        fallback: true,
      });
    } catch (tesseractError: any) {
      console.error(`Tesseract falhou para ${arquivo}: ${tesseractError?.message}`);
      return NextResponse.json(
        {
          arquivo,
          apartamentosEsperados: apts,
          medidores: [],
          erro: `Todos os métodos de OCR falharam: ${tesseractError?.message || 'falha desconhecida'}`,
        },
        { status: 500 },
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { erro: err?.message || "falha desconhecida" },
      { status: 500 },
    );
  }
}
