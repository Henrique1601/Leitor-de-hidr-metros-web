import { useCallback } from 'react'

const MAX_DIM = 1600

export function useImageCompression() {
  const compressClientSide = useCallback(
    (file: File): Promise<{ base64: string; mediaType: string }> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
          const w = Math.round(img.width * scale)
          const h = Math.round(img.height * scale)
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            URL.revokeObjectURL(url)
            return reject(new Error('canvas indisponivel'))
          }
          ctx.drawImage(img, 0, 0, w, h)
          URL.revokeObjectURL(url)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('falha ao carregar imagem'))
        }
        img.src = url
      })
    },
    []
  )

  const compressServerSide = useCallback(
    async (base64: string, mediaType: string): Promise<{ base64: string; mediaType: string }> => {
      try {
        const resp = await fetch('/api/compress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        })
        if (!resp.ok) throw new Error('compressao server falhou')
        const data = await resp.json()
        return { base64: data.compressed, mediaType: data.mediaType }
      } catch {
        return compressClientSide(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'img.jpg', { type: mediaType }))
      }
    },
    [compressClientSide]
  )

  return { compressClientSide, compressServerSide }
}
