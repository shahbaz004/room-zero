import Phaser from 'phaser'
import { createSharedArt } from '../art/environment'
import { createHero } from '../art/hero'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    createHero(this)
    createSharedArt(this)
    this.scene.start('Menu')
  }
}
