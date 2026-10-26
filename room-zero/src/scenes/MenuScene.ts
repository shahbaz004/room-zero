import Phaser from 'phaser'
import { ART } from '../art/environment'
import { PX } from '../art/pixel'
import { levelIndex } from '../data/levels'
import { SaveSystem } from '../systems/SaveSystem'
import { INK, labelStyle } from '../ui/theme'

export class MenuScene extends Phaser.Scene {
  private enter!: Phaser.Input.Keyboard.Key
  private choose!: Phaser.Input.Keyboard.Key

  constructor() {
    super('Menu')
  }

  create(): void {
    this.add.image(0, 0, ART.background).setOrigin(0).setScale(PX)
    this.add.image(0, 0, ART.vignette).setOrigin(0).setScale(PX)
    this.add.rectangle(480, 270, 560, 300, 0x0b0912, 0.78).setStrokeStyle(3, 0x3d3560)

    this.add.text(480, 170, 'ROOM ZERO', labelStyle(54, INK.text)).setOrigin(0.5).setShadow(3, 3, '#000', 0)
    this.add
      .text(480, 230, 'The World That Remembers', labelStyle(18, INK.remembered))
      .setOrigin(0.5)

    const progress = SaveSystem.allCleared()
      ? 'All eight rooms remember you.'
      : SaveSystem.hasProgress()
        ? `Continue · room ${levelIndex(SaveSystem.continueId()) + 1}`
        : 'Eight rooms. The castle keeps what matters.'
    this.add.text(480, 280, progress, labelStyle(16, INK.dim)).setOrigin(0.5)

    this.button(480, 340, 'Enter  ·  play', () => this.play())
    this.button(480, 400, 'C  ·  choose a room', () => this.scene.start('LevelSelect'))

    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable')
    }
    this.enter = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.choose = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)
    this.game.canvas.focus()
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.enter)) {
      this.play()
    }
    if (Phaser.Input.Keyboard.JustDown(this.choose)) {
      this.scene.start('LevelSelect')
    }
  }

  private play(): void {
    if (SaveSystem.allCleared()) {
      this.scene.start('LevelSelect')
      return
    }
    this.scene.start('Game', { levelId: SaveSystem.continueId() })
  }

  private button(x: number, y: number, text: string, onClick: () => void): void {
    const label = this.add
      .text(x, y, text, labelStyle(20, INK.gold))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    label.on('pointerover', () => label.setColor('#ffffff'))
    label.on('pointerout', () => label.setColor(INK.gold))
    label.on('pointerdown', onClick)
  }
}
