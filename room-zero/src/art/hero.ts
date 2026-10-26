import Phaser from 'phaser'
import { makeSheet, paintGrid, type Palette } from './pixel'

export const HERO_KEY = 'hero'
export const HERO_FRAME = { width: 14, height: 16 }

/** Hooded wanderer with glowing eyes and an amber scarf, facing right. */
const PALETTE: Palette = {
  k: '#16121f',
  C: '#8a74d0',
  c: '#5a4796',
  f: '#0b0912',
  e: '#8ff6ff',
  s: '#f0a63a',
  b: '#2b2236',
  h: '#e2b38a',
}

const BLANK = '..............'

const TOP = [
  '....kkkkk.....',
  '...kCCCCCk....',
  '..kCCCCCCCk...',
  '..kCCcffffk...',
  '..kCcffefek...',
  '..kCcfffffk...',
  '..kcsssssssk..',
  '.sskCCCCCCCk..',
  '..kCCCCCCCCk..',
  '..kcCCCCCCCk..',
  '..kcCCCChCck..',
  '..kccCCCCcck..',
  '..kcccccccck..',
]

/** Alternate scarf rows 7–8 so the tail flutters while running. */
const SCARF_FLUTTER = ['ss.kCCCCCCCk..', 's.kCCCCCCCCk..']

const LEGS = {
  stand: ['...kkkkkkkk...', '....kbk.kbk...', '....kbbkkbbk..'],
  stride: ['...kkkkkkkk...', '..kbk....kbk..', '.kbbk....kbbk.'],
  pass: ['...kkkkkkkk...', '.....kbkbk....', '.....kbbbbk...'],
  strideB: ['...kkkkkkkk...', '...kbk..kbk...', '..kbbk...kbbk.'],
  tuck: ['...kkkkkkkk...', '....kbbkbbk...', BLANK],
  dangle: ['...kkkkkkkk...', '...kbk...kbk..', '...kbk...kbk..'],
}

function frame(legs: string[], flutter: boolean, bob: boolean): string[] {
  const top = [...TOP]
  if (flutter) {
    top[7] = SCARF_FLUTTER[0]
    top[8] = SCARF_FLUTTER[1]
  }
  if (bob) {
    return [BLANK, ...top.slice(0, 12), ...legs]
  }
  return [...top, ...legs]
}

const FRAMES = [
  frame(LEGS.stand, false, false),
  frame(LEGS.stand, false, true),
  frame(LEGS.stride, true, false),
  frame(LEGS.pass, false, true),
  frame(LEGS.strideB, true, false),
  frame(LEGS.tuck, false, false),
  frame(LEGS.dangle, true, false),
]

export const HERO_ANIMS = {
  idle: { key: 'hero-idle', frames: [0, 1], frameRate: 2.5 },
  run: { key: 'hero-run', frames: [2, 3, 4, 3], frameRate: 12 },
  jump: { key: 'hero-jump', frames: [5], frameRate: 1 },
  fall: { key: 'hero-fall', frames: [6], frameRate: 1 },
} as const

export function createHero(scene: Phaser.Scene): void {
  makeSheet(scene, HERO_KEY, HERO_FRAME.width, HERO_FRAME.height, FRAMES.length, (p, i) =>
    paintGrid(p, FRAMES[i], PALETTE),
  )
  for (const anim of Object.values(HERO_ANIMS)) {
    if (scene.anims.exists(anim.key)) {
      continue
    }
    scene.anims.create({
      key: anim.key,
      frames: scene.anims.generateFrameNumbers(HERO_KEY, { frames: [...anim.frames] }),
      frameRate: anim.frameRate,
      repeat: -1,
    })
  }
}
