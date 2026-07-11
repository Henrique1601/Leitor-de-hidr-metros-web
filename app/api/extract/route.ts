import { NextRequest, NextResponse } from "next/server";
import { extractWithGemini } from "@/lib/gemini";
import { extractWithTesseract } from "@/lib/tesseract";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    let result: { medidores: any[]; fallback?: boolean };

    try {
      result = await extractWithGemini(imageBase64, mediaType, apts);
      result.fallback = false;
    } catch (geminiError: any) {
      console.warn(
        `Gemini falhou para ${arquivo}, usando Tesseract:`,
        geminiError?.message,
      );
      result = await extractWithTesseract(imageBase64, mediaType, apts);
    }

    return NextResponse.json({
      arquivo,
      apartamentosEsperados: apts,
      medidores: result.medidores,
      fallback: result.fallback ?? false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { erro: err?.message || "falha desconhecida" },
      { status: 500 },
    );
  }
}
