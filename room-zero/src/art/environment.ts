import Phaser from 'phaser'
import { createRng, makeCanvasTexture, makeSheet, pick, type Painter } from './pixel'

const OUTLINE = '#16121f'

export const ART = {
  background: 'background',
  vignette: 'vignette',
  groundTop: 'ground-top',
  groundFill: 'ground-fill',
  step: 'step',
  planks: 'planks',
  runestone: 'runestone',
  spikes: 'spikes',
  lever: 'lever',
  plate: 'plate',
  rune: 'rune',
  door: 'door',
  torch: 'torch',
  glow: 'glow',
  pixel: 'pixel',
} as const

export const TORCH_ANIM = 'torch-burn'

/** Shared tiles and a pit-free castle backdrop. Rooms draw their own pits on top. */
export function createSharedArt(scene: Phaser.Scene): void {
  createBackground(scene)
  createVignette(scene)
  createGroundTiles(scene)
  createStepTile(scene)
  createBridgeTiles(scene)
  createSpikes(scene)
  createLever(scene)
  createPlate(scene)
  createRune(scene)
  createDoor(scene)
  createTorch(scene)
  createGlow(scene)
  makeCanvasTexture(scene, ART.pixel, 1, 1, (p) => p.rect(0, 0, 1, 1, '#ffffff'))
}

function drawBricks(
  p: Painter,
  rng: () => number,
  area: { x: number; y: number; width: number; height: number },
  brick: { width: number; height: number },
  colors: readonly string[],
  mortar: string,
  highlight?: string,
): void {
  p.rect(area.x, area.y, area.width, area.height, mortar)
  for (let row = 0; row * brick.height < area.height; row++) {
    const offset = row % 2 === 0 ? 0 : brick.width / 2
    for (let bx = -offset; bx < area.width; bx += brick.width) {
      const x0 = Math.max(0, bx)
      const x1 = Math.min(area.width, bx + brick.width - 1)
      const y0 = row * brick.height
      const y1 = Math.min(area.height, y0 + brick.height - 1)
      if (x1 <= x0 || y1 <= y0) {
        continue
      }
      p.rect(area.x + x0, area.y + y0, x1 - x0, y1 - y0, pick(rng, colors))
      if (highlight && rng() < 0.5) {
        p.rect(area.x + x0, area.y + y0, x1 - x0, 1, highlight)
      }
    }
  }
}

function createBackground(scene: Phaser.Scene): void {
  const width = 320
  const height = 180
  const rng = createRng(7)

  makeCanvasTexture(scene, ART.background, width, height, (p) => {
    drawBricks(
      p,
      rng,
      { x: 0, y: 0, width, height },
      { width: 16, height: 8 },
      ['#241d38', '#272040', '#211b33', '#2a2245', '#251e3b'],
      '#17121f',
      '#2f2850',
    )

    // Darker upper band suggests a high ceiling lost in shadow.
    for (let y = 0; y < 40; y++) {
      p.ctx.globalAlpha = 0.55 * (1 - y / 40)
      p.rect(0, y, width, 1, '#07050b')
    }
    p.ctx.globalAlpha = 1

    drawWindow(p, rng, 120, 26, true)
    drawWindow(p, rng, 200, 26, false)
    for (const cx of [120, 200]) {
      drawLightShaft(p, cx, 74, 128)
    }

    for (const px of [0, 154, 308]) {
      drawPillar(p, px, height)
    }

    for (const cx of [44, 282]) {
      drawChain(p, cx, 0, 30 + Math.floor(rng() * 20))
    }
  })
}

function drawWindow(p: Painter, rng: () => number, cx: number, top: number, moon: boolean): void {
  const halfWidth = 13
  const bodyTop = top + halfWidth
  const bottom = top + 48
  for (let y = top - 2; y <= bottom + 2; y++) {
    for (let x = cx - halfWidth - 2; x <= cx + halfWidth + 2; x++) {
      const inArch = (r: number) =>
        y >= bodyTop ? Math.abs(x - cx) <= r : Math.hypot(x - cx, y - bodyTop) <= r
      if (y > bottom + 2) {
        continue
      }
      if (inArch(halfWidth) && y <= bottom) {
        const t = (y - top) / (bottom - top)
        p.dot(x, y, t < 0.4 ? '#1c2a50' : t < 0.75 ? '#243762' : '#2d4676')
      } else if (inArch(halfWidth + 2)) {
        p.dot(x, y, y > bottom ? '#4a4170' : '#3d3560')
      }
    }
  }
  for (let i = 0; i < 9; i++) {
    const sx = cx - halfWidth + 2 + Math.floor(rng() * (halfWidth * 2 - 3))
    const sy = top + 4 + Math.floor(rng() * 34)
    p.dot(sx, sy, rng() < 0.3 ? '#ffffff' : '#9fb7e8')
  }
  if (moon) {
    const mx = cx + 5
    const my = top + 10
    for (let y = -4; y <= 4; y++) {
      for (let x = -4; x <= 4; x++) {
        if (Math.hypot(x, y) <= 4 && Math.hypot(x + 2, y - 1) > 3.2) {
          p.dot(mx + x, my + y, '#eef4ff')
        }
      }
    }
  }
  p.rect(cx, top, 1, bottom - top + 1, '#14111f')
  p.rect(cx - halfWidth, top + 28, halfWidth * 2 + 1, 1, '#14111f')
}

function drawLightShaft(p: Painter, cx: number, top: number, floorY: number): void {
  p.ctx.save()
  p.ctx.globalAlpha = 0.07
  p.ctx.fillStyle = '#a9c8ff'
  p.ctx.beginPath()
  p.ctx.moveTo(cx - 12, top)
  p.ctx.lineTo(cx + 12, top)
  p.ctx.lineTo(cx + 34, floorY)
  p.ctx.lineTo(cx - 2, floorY)
  p.ctx.closePath()
  p.ctx.fill()
  p.ctx.restore()
}

function drawPillar(p: Painter, x: number, height: number): void {
  const width = 12
  p.rect(x, 0, width, height, '#2f2a48')
  p.rect(x, 0, 2, height, '#40385f')
  p.rect(x + width - 2, 0, 2, height, '#1c1730')
  for (let y = 6; y < height; y += 10) {
    p.rect(x + 2, y, width - 4, 1, '#252039')
  }
  p.rect(x - 2, 14, width + 4, 3, '#40385f')
  p.rect(x - 2, 17, width + 4, 1, '#1c1730')
}

function drawChain(p: Painter, cx: number, top: number, length: number): void {
  for (let y = top; y < top + length; y += 3) {
    const wide = Math.floor(y / 3) % 2 === 0
    if (wide) {
      p.rect(cx - 1, y, 3, 2, '#4a4466')
      p.dot(cx, y, '#2a2640')
    } else {
      p.rect(cx, y, 1, 3, '#5d5780')
    }
  }
}

function createVignette(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, ART.vignette, 320, 180, (p) => {
    const gradient = p.ctx.createRadialGradient(160, 96, 60, 160, 90, 200)
    gradient.addColorStop(0, 'rgba(5,3,10,0)')
    gradient.addColorStop(1, 'rgba(5,3,10,0.7)')
    p.ctx.fillStyle = gradient
    p.ctx.fillRect(0, 0, 320, 180)
  })
}

function createGroundTiles(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, ART.groundTop, 16, 16, (p) => {
    const rng = createRng(11)
    drawBricks(
      p,
      rng,
      { x: 0, y: 0, width: 16, height: 16 },
      { width: 8, height: 4 },
      ['#3a3157', '#352c50', '#3f355e'],
      '#211b33',
      '#4a4170',
    )
    p.rect(0, 0, 16, 1, '#8b80b8')
    p.rect(0, 1, 16, 1, '#5b5185')
    for (let x = 0; x < 16; x++) {
      if (rng() < 0.45) {
        p.dot(x, 0, rng() < 0.5 ? '#5f8f6a' : '#7fb08a')
      }
      if (rng() < 0.25) {
        p.dot(x, 1, '#4c7356')
      }
    }
    p.dot(4, 2, '#4c7356')
    p.dot(11, 2, '#4c7356')
  })

  makeCanvasTexture(scene, ART.groundFill, 16, 16, (p) => {
    drawBricks(
      p,
      createRng(13),
      { x: 0, y: 0, width: 16, height: 16 },
      { width: 8, height: 4 },
      ['#2a2340', '#272038', '#2d2645'],
      '#17121f',
      '#332b4d',
    )
  })
}

function createStepTile(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, ART.step, 16, 16, (p) => {
    p.rect(0, 0, 16, 16, '#3d4e78')
    p.rect(0, 0, 16, 2, '#d5e4ff')
    p.rect(0, 2, 16, 1, '#8ff6ff')
    p.rect(0, 8, 16, 1, '#243352')
    p.rect(8, 3, 1, 5, '#243352')
    p.rect(0, 9, 1, 7, '#243352')
    p.rect(0, 14, 16, 2, '#1a2744')
  })
}

function createBridgeTiles(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, ART.planks, 16, 8, (p) => {
    const rng = createRng(17)
    p.rect(0, 0, 16, 6, '#8a5a32')
    p.rect(0, 0, 16, 1, '#c08850')
    p.rect(0, 5, 16, 1, '#5c3a20')
    p.rect(0, 6, 16, 1, '#3a2414')
    for (const x of [0, 8]) {
      p.rect(x, 1, 1, 5, '#5c3a20')
    }
    for (let i = 0; i < 6; i++) {
      p.dot(1 + Math.floor(rng() * 14), 2 + Math.floor(rng() * 3), '#74482a')
    }
    p.dot(2, 2, '#d8d0c0')
    p.dot(10, 2, '#d8d0c0')
  })

  makeCanvasTexture(scene, ART.runestone, 16, 8, (p) => {
    p.rect(0, 0, 16, 8, '#4a5a86')
    p.rect(0, 0, 16, 1, '#9fb4e8')
    p.rect(0, 1, 16, 1, '#6d80b5')
    p.rect(0, 6, 16, 1, '#2e3a5e')
    p.rect(0, 7, 16, 1, '#1a2038')
    p.rect(0, 1, 1, 6, '#2e3a5e')
    for (const [x, y] of [
      [7, 2],
      [8, 3],
      [9, 2],
      [8, 4],
      [7, 5],
      [9, 5],
    ]) {
      p.dot(x, y, '#8ff6ff')
    }
    p.dot(6, 3, '#4fb7c9')
    p.dot(10, 3, '#4fb7c9')
  })
}

function createSpikes(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, ART.spikes, 16, 8, (p) => {
    for (const ox of [0, 8]) {
      const cx = ox + 3
      for (let y = 1; y < 7; y++) {
        const half = Math.floor(((y - 1) * 3) / 5)
        for (let x = cx - half; x <= cx + half; x++) {
          p.dot(x, y, x < cx ? '#b4afcc' : x === cx ? '#8f8aa8' : '#5a5573')
        }
      }
      p.dot(cx, 1, '#e8e4ff')
    }
    p.rect(0, 7, 16, 1, '#2b2640')
  })
}

function createLever(scene: Phaser.Scene): void {
  makeSheet(scene, ART.lever, 12, 12, 2, (p, i) => {
    const tipX = i === 0 ? 2 : 9
    p.line(6, 8, tipX, 2, OUTLINE)
    p.line(5, 8, tipX - 1, 2, '#9a96b0')
    p.rect(tipX - 1, 1, 2, 2, i === 0 ? '#e85d4c' : '#8ff6ff')
    p.rect(1, 8, 10, 4, OUTLINE)
    p.rect(2, 9, 8, 2, '#4a4170')
    p.rect(2, 9, 8, 1, '#6a5f94')
    p.dot(5, 9, i === 0 ? '#e85d4c' : '#8ff6ff')
    p.dot(6, 9, i === 0 ? '#e85d4c' : '#8ff6ff')
  })
}

function createPlate(scene: Phaser.Scene): void {
  makeSheet(scene, ART.plate, 14, 8, 2, (p, i) => {
    p.rect(0, 2, 14, 6, OUTLINE)
    p.rect(1, 3, 12, 4, i === 0 ? '#4a3048' : '#1d4a52')
    p.rect(1, 3, 12, 1, i === 0 ? '#e85d4c' : '#8ff6ff')
    p.rect(2, 5, 10, 1, i === 0 ? '#a33b48' : '#4fc3d6')
    p.dot(4, 4, '#d8d0e8')
    p.dot(9, 4, '#d8d0e8')
  })
}

function createRune(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, ART.rune, 9, 13, (p) => {
    for (let y = 0; y < 13; y++) {
      const half = Math.round(((y <= 6 ? y : 12 - y) * 4) / 6)
      for (let x = 4 - half; x <= 4 + half; x++) {
        const edge = Math.abs(x - 4) === half
        p.dot(x, y, edge ? '#2c8fa3' : x < 4 ? '#c6fdff' : x === 4 ? '#8ff6ff' : '#4fc3d6')
      }
    }
    p.dot(3, 3, '#ffffff')
    p.dot(3, 4, '#ffffff')
  })
}

function createDoor(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, ART.door, 16, 24, (p) => {
    const cx = 7.5
    const archY = 8
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 16; x++) {
        const outer = y >= archY ? true : Math.hypot(x - cx, y - archY) <= 8
        const inner =
          y >= archY ? x >= 3 && x <= 12 && y >= 4 : Math.hypot(x - cx, y - archY) <= 5 && y >= 3
        if (!outer) {
          continue
        }
        if (inner) {
          const warm = y >= 18 ? '#5a3a18' : y >= 12 ? '#2e1f12' : '#160f0b'
          p.dot(x, y, warm)
        } else {
          const seam = (y % 5 === 0 && y >= archY) || (y < archY && (x + y) % 6 === 0)
          p.dot(x, y, seam ? '#2f2850' : x < 8 ? '#5b5185' : '#4a4170')
        }
      }
    }
    for (let y = 9; y < 24; y++) {
      p.dot(7, y, '#3a2614')
    }
    p.dot(10, 15, '#f0c060')
    p.rect(0, 23, 16, 1, OUTLINE)
  })
}

function createTorch(scene: Phaser.Scene): void {
  const widths = [
    [0, 1, 1, 2, 2, 3, 3, 3, 2],
    [0, 0, 1, 2, 3, 3, 3, 3, 2],
    [0, 1, 2, 2, 2, 3, 3, 3, 2],
  ]
  makeSheet(scene, ART.torch, 8, 14, 3, (p, f) => {
    const lean = f - 1
    widths[f].forEach((half, y) => {
      const cx = 4 + (y < 4 ? lean : 0)
      for (let x = cx - half; x <= cx + half - 1 + (half === 0 ? 1 : 0); x++) {
        const d = Math.abs(x + 0.5 - cx)
        p.dot(x, y, d <= half - 1.5 ? '#fff2a8' : d <= half - 0.5 ? '#ffb347' : '#e8582c')
      }
    })
    p.rect(1, 8, 6, 2, '#5d5780')
    p.rect(1, 8, 6, 1, '#7d77a0')
    p.rect(3, 10, 2, 4, '#3a3446')
  })
  if (!scene.anims.exists(TORCH_ANIM)) {
    scene.anims.create({
      key: TORCH_ANIM,
      frames: scene.anims.generateFrameNumbers(ART.torch, { frames: [0, 1, 2, 1] }),
      frameRate: 8,
      repeat: -1,
    })
  }
}

function createGlow(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, ART.glow, 128, 128, (p) => {
    const gradient = p.ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    p.ctx.fillStyle = gradient
    p.ctx.fillRect(0, 0, 128, 128)
  })
}
