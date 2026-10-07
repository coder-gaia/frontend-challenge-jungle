const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_INPUT_BYTES = 5 * 1024 * 1024

/**
 * Redimensiona a imagem do avatar no cliente (recorte quadrado central, 256 px, WebP/JPEG)
 * antes do upload — mantém o payload pequeno e não depende de processamento no servidor.
 */
export async function resizeAvatar(file: File, size = 256): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Use uma imagem PNG, JPEG ou WebP.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('A imagem deve ter no máximo 5 MB.')

  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível processar a imagem.')
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  )
  bitmap.close()

  const webp = canvas.toDataURL('image/webp', 0.85)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85)
}
