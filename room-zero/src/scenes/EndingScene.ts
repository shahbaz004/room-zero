import Phaser from 'phaser'
import { ART } from '../art/environment'
import { PX } from '../art/pixel'
import { INK, labelStyle } from '../ui/theme'

export class EndingScene extends Phaser.Scene {
  private enter!: Phaser.Input.Keyboard.Key

  constructor() {
    super('Ending')
  }

  create(): void {
    this.add.image(0, 0, ART.background).setOrigin(0).setScale(PX)
    this.add.image(0, 0, ART.vignette).setOrigin(0).setScale(PX)
    this.add.rectangle(480, 270, 640, 280, 0x0b0912, 0.82).setStrokeStyle(3, 0xffd27a)

    this.add.text(480, 180, 'THE CASTLE LETS YOU GO', labelStyle(32, INK.gold)).setOrigin(0.5).setShadow(3, 3, '#000', 0)
    this.add
      .text(480, 250, 'Eight rooms remember what you taught them.\nAmber faded. Cyan stayed.', {
        ...labelStyle(16, INK.text),
        align: 'center',
      })
      .setOrigin(0.5)
    const again = this.add
      .text(480, 340, 'Enter  ·  return to the rooms', labelStyle(18, INK.remembered))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    again.on('pointerdown', () => this.scene.start('LevelSelect'))

    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable')
    }
    this.enter = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.game.canvas.focus()
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.enter)) {
      this.scene.start('LevelSelect')
    }
  }
}
