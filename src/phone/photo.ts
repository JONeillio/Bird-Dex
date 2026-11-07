// Shrinks a camera photo to a small JPEG kept inside the record. Everything happens on the phone.
const MAX_SIDE = 640
const MAX_CHARS = 380_000

/** Pure sizing helper: scale (w,h) so the longest side is at most `max`, never enlarging. */
export function fitSize(w: number, h: number, max = MAX_SIDE): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as a picture.'))
    }
    img.src = url
  })
}

export async function shrinkPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a picture.')
  const img = await loadImage(file)
  const { w, h } = fitSize(img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')
  if (!g) throw new Error('This browser cannot shrink pictures.')
  g.drawImage(img, 0, 0, w, h)
  for (const q of [0.75, 0.6, 0.45, 0.3]) {
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length <= MAX_CHARS) return url
  }
  throw new Error('That picture is too large to keep. Try a smaller one.')
}
