import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 10

const MAX_DIM = 1600
const JPEG_QUALITY = 0.85

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ erro: 'imagem ausente' }, { status: 400 })
    }

    const buffer = Buffer.from(imageBase64, 'base64')

    let sharp: any
    try {
      const mod = await import('sharp')
      sharp = mod.default || mod
    } catch {
      return NextResponse.json({
        compressed: imageBase64,
        mediaType: mediaType || 'image/jpeg',
        compressedSize: buffer.length,
      })
    }

    const metadata = await sharp(buffer).metadata()
    const w = metadata.width || MAX_DIM
    const h = metadata.height || MAX_DIM
    const scale = Math.min(1, MAX_DIM / Math.max(w, h))
    const newW = Math.round(w * scale)
    const newH = Math.round(h * scale)

    const resized = await sharp(buffer)
      .resize(newW, newH, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: Math.round(JPEG_QUALITY * 100) })
      .toBuffer()

    const compressed = resized.toString('base64')

    return NextResponse.json({
      compressed,
      mediaType: 'image/jpeg',
      compressedSize: compressed.length,
      originalSize: buffer.length,
      width: newW,
      height: newH,
    })
  } catch (err: any) {
    return NextResponse.json(
      { erro: err?.message || 'falha na compressao' },
      { status: 500 }
    )
  }
}
