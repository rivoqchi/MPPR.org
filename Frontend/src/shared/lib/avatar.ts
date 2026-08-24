import { uploadFile } from '@/shared/api/files-api'

const MAX_AVATAR_DIMENSION = 256
const INITIAL_JPEG_QUALITY = 0.82
const MIN_JPEG_QUALITY = 0.45
const MAX_AVATAR_BYTES = 180_000

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('INVALID_IMAGE'))
    }

    image.src = objectUrl
  })
}

async function compressAvatarToFile(file: File): Promise<File> {
  const image = await loadImageFromFile(file)
  const canvas = document.createElement('canvas')
  const largestSide = Math.max(image.width, image.height)
  const scale = largestSide > MAX_AVATAR_DIMENSION ? MAX_AVATAR_DIMENSION / largestSide : 1

  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('CANVAS_NOT_SUPPORTED')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  let quality = INITIAL_JPEG_QUALITY
  let blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })

  while (blob && blob.size > MAX_AVATAR_BYTES && quality > MIN_JPEG_QUALITY) {
    quality -= 0.08
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
  }

  if (!blob || blob.size > MAX_AVATAR_BYTES) {
    throw new Error('AVATAR_TOO_LARGE')
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

export async function uploadAvatarFile(file: File): Promise<string> {
  const compressed = await compressAvatarToFile(file)
  const uploaded = await uploadFile(compressed, compressed.name)
  return uploaded.id
}
