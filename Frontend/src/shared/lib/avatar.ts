const MAX_AVATAR_DIMENSION = 256
const INITIAL_JPEG_QUALITY = 0.82
const MIN_JPEG_QUALITY = 0.45
const MAX_DATA_URL_LENGTH = 180_000

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

export async function compressAvatarToDataUrl(file: File): Promise<string> {
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
  let dataUrl = canvas.toDataURL('image/jpeg', quality)

  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > MIN_JPEG_QUALITY) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('AVATAR_TOO_LARGE')
  }

  return dataUrl
}
