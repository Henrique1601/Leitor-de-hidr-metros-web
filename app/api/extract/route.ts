import { NextRequest, NextResponse } from "next/server";
import { extractWithGemini } from "@/lib/gemini";
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
      console.warn(`Tentando Tesseract fallback...`);
      try {
        const fallbackResult = await extractWithTesseract(imageBase64, mediaType, apts);
        return NextResponse.json({
          arquivo,
          apartamentosEsperados: apts,
          medidores: fallbackResult.medidores,
          fallback: true,
        });
      } catch (tesseractError: any) {
        console.error(`Tesseract falhou para ${arquivo}: ${tesseractError?.message}`);
        const geminiMsg = geminiError?.message || "falha desconhecida";
        const tessMsg = tesseractError?.message || "falha desconhecida";
        const isQuota = geminiMsg.includes("429") || geminiMsg.includes("quota") || geminiMsg.includes("RESOURCE_EXHAUSTED");
        return NextResponse.json(
          {
            arquivo,
            apartamentosEsperados: apts,
            medidores: [],
            erro: isQuota
              ? `Cota do Gemini esgotada. OCR fallback tambem falhou: ${tessMsg}`
              : `Gemini: ${geminiMsg} | OCR: ${tessMsg}`,
          },
          { status: 500 },
        );
      }
    }
  } catch (err: any) {
    return NextResponse.json(
      { erro: err?.message || "falha desconhecida" },
      { status: 500 },
    );
  }
}
