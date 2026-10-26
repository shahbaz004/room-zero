import Phaser from 'phaser'

type Action = 'jump' | 'restart'

export class TouchControls {
  left = false
  right = false
  jumpHeld = false
  private readonly pressed = new Set<Action>()

  static isSupported(scene: Phaser.Scene): boolean {
    return scene.sys.game.device.input.touch
  }

  constructor(scene: Phaser.Scene) {
    scene.input.addPointer(2)
    this.button(scene, 78, 466, 46, '◀', (down) => (this.left = down))
    this.button(scene, 188, 466, 46, '▶', (down) => (this.right = down))
    this.button(scene, 880, 466, 52, '▲', (down) => {
      this.jumpHeld = down
      if (down) {
        this.pressed.add('jump')
      }
    })
    this.button(scene, 770, 486, 30, '↻', (down) => {
      if (down) {
        this.pressed.add('restart')
      }
    })
  }

  /** Returns true once per tap. */
  consume(action: Action): boolean {
    return this.pressed.delete(action)
  }

  private button(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    label: string,
    onChange: (down: boolean) => void,
  ): void {
    const circle = scene.add
      .circle(x, y, radius, 0xffffff, 0.1)
      .setStrokeStyle(3, 0xffffff, 0.35)
      .setDepth(20)
      .setInteractive()
    scene.add
      .text(x, y, label, { fontFamily: 'monospace', fontSize: `${radius * 0.8}px`, color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0.7)
      .setDepth(21)
    const release = (): void => {
      onChange(false)
      circle.setFillStyle(0xffffff, 0.1)
    }
    circle.on('pointerdown', () => {
      onChange(true)
      circle.setFillStyle(0xffffff, 0.28)
    })
    circle.on('pointerup', release)
    circle.on('pointerout', release)
  }
}
