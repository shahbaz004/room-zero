import Phaser from 'phaser'

/** Every art pixel is drawn as a PX x PX block on screen. */
export const PX = 3

export interface Painter {
  ctx: CanvasRenderingContext2D
  rect(x: number, y: number, width: number, height: number, color: string): void
  dot(x: number, y: number, color: string): void
  line(x0: number, y0: number, x1: number, y1: number, color: string): void
}

export type Palette = Record<string, string>

export function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (p: Painter) => void,
): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key)
  }
  const texture = scene.textures.createCanvas(key, width, height)
  if (!texture) {
    throw new Error(`Could not create texture ${key}`)
  }
  const ctx = texture.context
  ctx.imageSmoothingEnabled = false
  draw(createPainter(ctx))
  texture.refresh()
  return texture
}

/** Draws `count` frames side by side and registers them as numeric frames 0..count-1. */
export function makeSheet(
  scene: Phaser.Scene,
  key: string,
  frameWidth: number,
  frameHeight: number,
  count: number,
  drawFrame: (p: Painter, index: number) => void,
): void {
  const texture = makeCanvasTexture(scene, key, frameWidth * count, frameHeight, (p) => {
    for (let i = 0; i < count; i++) {
      p.ctx.save()
      p.ctx.translate(i * frameWidth, 0)
      drawFrame(p, i)
      p.ctx.restore()
    }
  })
  for (let i = 0; i < count; i++) {
    texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight)
  }
}

/** Paints a character grid; `.` is transparent and every other character must be in the palette. */
export function paintGrid(p: Painter, rows: string[], palette: Palette, ox = 0, oy = 0): void {
  const width = rows[0].length
  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Pixel row ${y} is ${row.length} wide, expected ${width}: "${row}"`)
    }
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') {
        continue
      }
      const color = palette[ch]
      if (!color) {
        throw new Error(`No palette color for "${ch}"`)
      }
      p.dot(ox + x, oy + y, color)
    }
  })
}

/** Deterministic PRNG so generated art looks identical on every load. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

function createPainter(ctx: CanvasRenderingContext2D): Painter {
  const rect = (x: number, y: number, width: number, height: number, color: string): void => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, width, height)
  }
  const dot = (x: number, y: number, color: string): void => rect(x, y, 1, 1, color)
  const line = (x0: number, y0: number, x1: number, y1: number, color: string): void => {
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    let x = x0
    let y = y0
    for (;;) {
      dot(x, y, color)
      if (x === x1 && y === y1) {
        return
      }
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x += sx
      }
      if (e2 <= dx) {
        err += dx
        y += sy
      }
    }
  }
  return { ctx, rect, dot, line }
}
