'use client'

/**
 * Compress and resize an image file on the client, returning a base64 data URL.
 * This keeps the payload small for socket.io transport (maxHttpBufferSize 5MB).
 */
export async function fileToCompressedDataURL(
  file: File,
  maxSize = 300,
  quality = 0.82,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Il file non è un\'immagine')
  }
  // For very small files we could read directly, but resizing gives consistency.
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Lettura file fallita'))
    reader.readAsDataURL(file)
  })

  return resizeDataURL(dataUrl, maxSize, quality)
}

export function resizeDataURL(
  dataUrl: string,
  maxSize = 300,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      // White background to handle transparent PNGs nicely
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      try {
        const out = canvas.toDataURL('image/jpeg', quality)
        resolve(out)
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => reject(new Error('Immagine non valida'))
    img.src = dataUrl
  })
}
