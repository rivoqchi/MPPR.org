import { getStoredFileUrl, uploadFile } from '@/shared/api/files-api'

const IMAGE_ACCEPT = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

export function isSupportedDocumentImage(file: File): boolean {
  return IMAGE_ACCEPT.includes(file.type) || /\.(png|jpe?g|gif|webp)$/i.test(file.name)
}

export async function uploadDocumentImage(file: File): Promise<{
  src: string
  storageKey: string
  width: number
  height: number
}> {
  const meta = await uploadFile(file, file.name)
  const src = getStoredFileUrl(meta.id)
  const dimensions = await readImageDimensions(src)

  return {
    src,
    storageKey: meta.id,
    width: Math.min(dimensions.width, 420),
    height: dimensions.height
      ? Math.round((Math.min(dimensions.width, 420) / dimensions.width) * dimensions.height)
      : 280,
  }
}

export async function readImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.naturalWidth || 280, height: image.naturalHeight || 280 })
    }
    image.onerror = () => {
      resolve({ width: 280, height: 280 })
    }
    image.src = src
  })
}

export function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return null
  }

  const mimeType = match[1]
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new File([bytes], fileName, { type: mimeType })
}
