import mammoth from 'mammoth'

export async function convertDocxBlobToHtml(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((imageBuffer) => ({
          src: `data:${image.contentType};base64,${imageBuffer}`,
        })),
      ),
    },
  )

  const html = result.value.trim()
  return html || '<p></p>'
}
