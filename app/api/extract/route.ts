import { NextRequest, NextResponse } from "next/server";
import { extractWithGemini } from "@/lib/gemini";

export const runtime = "nodejs";

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

    let result: { medidores: any[] };

    try {
      result = await extractWithGemini(imageBase64, mediaType, apts);
    } catch (geminiError: any) {
      const msg = geminiError?.message || "falha desconhecida";
      const isQuota = msg.includes("429") || msg.includes("quota");
      return NextResponse.json(
        {
          arquivo,
          apartamentosEsperados: apts,
          medidores: [],
          erro: isQuota
            ? "Cota do Gemini esgotada. Aguarde alguns minutos e tente novamente."
            : `Erro Gemini: ${msg}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      arquivo,
      apartamentosEsperados: apts,
      medidores: result.medidores,
      fallback: false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { erro: err?.message || "falha desconhecida" },
      { status: 500 },
    );
  }
}
