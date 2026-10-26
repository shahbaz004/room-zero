import Phaser from 'phaser'
import { ART } from '../art/environment'
import { PX } from '../art/pixel'
import { LEVELS } from '../data/levels'
import { SaveSystem } from '../systems/SaveSystem'
import { INK, labelStyle } from '../ui/theme'

const COLS = 4
const ORIGIN_X = 78
const ORIGIN_Y = 220
const CELL_W = 210
const CELL_H = 124

export class LevelSelectScene extends Phaser.Scene {
  private index = 0
  private highlight!: Phaser.GameObjects.Rectangle
  private keys!: Record<'left' | 'right' | 'up' | 'down' | 'enter' | 'esc', Phaser.Input.Keyboard.Key>

  constructor() {
    super('LevelSelect')
  }

  create(): void {
    this.add.image(0, 0, ART.background).setOrigin(0).setScale(PX)
    this.add.image(0, 0, ART.vignette).setOrigin(0).setScale(PX)
    this.add.text(480, 36, 'CHOOSE A ROOM', labelStyle(28, INK.text)).setOrigin(0.5).setShadow(2, 2, '#000', 0)
    this.add
      .text(480, 68, 'Cyan rooms are cleared. Later rooms open one at a time.', labelStyle(13, INK.dim))
      .setOrigin(0.5)

    this.highlight = this.add
      .rectangle(0, 0, 196, 116)
      .setStrokeStyle(3, 0xffd27a)
      .setFillStyle(0xffd27a, 0.08)

    LEVELS.forEach((level, index) => {
      const x = ORIGIN_X + (index % COLS) * CELL_W + CELL_W / 2
      const y = ORIGIN_Y + Math.floor(index / COLS) * CELL_H + CELL_H / 2
      const unlocked = SaveSystem.isUnlocked(index)
      const cleared = unlocked && SaveSystem.isCleared(level.id)
      const card = this.add
        .rectangle(x, y, 190, 108, 0x0b0912, unlocked ? 0.94 : 0.72)
        .setStrokeStyle(2, cleared ? 0x8ff6ff : 0x3d3560)
      if (unlocked) {
        card.setInteractive({ useHandCursor: true })
        card.on('pointerdown', () => {
          this.index = index
          this.placeHighlight()
          this.launch()
        })
      }
      this.add
        .text(x - 78, y - 40, `${index + 1}`, labelStyle(20, unlocked ? INK.gold : INK.dim))
        .setAlpha(unlocked ? 1 : 0.45)
      this.add
        .text(x - 78, y - 16, level.name, { ...labelStyle(14, unlocked ? INK.text : INK.dim), wordWrap: { width: 160 } })
        .setAlpha(unlocked ? 1 : 0.45)
      const status = !unlocked ? 'locked' : cleared ? '◆ cleared' : 'open'
      const statusColor = cleared ? INK.remembered : INK.dim
      this.add.text(x - 78, y + 34, status, labelStyle(13, statusColor)).setAlpha(unlocked ? 1 : 0.45)
    })

    this.placeHighlight()

    this.add.text(360, 508, 'Esc menu     Enter play', labelStyle(13, INK.dim)).setOrigin(1, 0.5)
    const reset = this.add
      .text(600, 508, 'Reset progress', labelStyle(13, INK.attempt))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    reset.on('pointerdown', () => {
      SaveSystem.reset()
      this.scene.restart()
    })

    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable')
    }
    const K = Phaser.Input.Keyboard.KeyCodes
    this.keys = {
      left: keyboard.addKey(K.LEFT),
      right: keyboard.addKey(K.RIGHT),
      up: keyboard.addKey(K.UP),
      down: keyboard.addKey(K.DOWN),
      enter: keyboard.addKey(K.ENTER),
      esc: keyboard.addKey(K.ESC),
    }
    this.game.canvas.focus()
  }

  update(): void {
    const JustDown = Phaser.Input.Keyboard.JustDown
    if (JustDown(this.keys.esc)) {
      this.scene.start('Menu')
      return
    }
    if (JustDown(this.keys.enter)) {
      this.launch()
      return
    }
    const next =
      JustDown(this.keys.right) ? this.index + 1
      : JustDown(this.keys.left) ? this.index - 1
      : JustDown(this.keys.down) ? this.index + COLS
      : JustDown(this.keys.up) ? this.index - COLS
      : this.index
    this.index = Phaser.Math.Clamp(next, 0, LEVELS.length - 1)
    this.placeHighlight()
  }

  private placeHighlight(): void {
    const x = ORIGIN_X + (this.index % COLS) * CELL_W + CELL_W / 2
    const y = ORIGIN_Y + Math.floor(this.index / COLS) * CELL_H + CELL_H / 2
    this.highlight.setPosition(x, y)
  }

  private launch(): void {
    if (!SaveSystem.isUnlocked(this.index)) {
      return
    }
    this.scene.start('Game', { levelId: LEVELS[this.index].id })
  }
}
