import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { EndingScene } from './scenes/EndingScene'
import { GameScene } from './scenes/GameScene'
import { LevelSelectScene } from './scenes/LevelSelectScene'
import { MenuScene } from './scenes/MenuScene'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#0b0912',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1400 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene, EndingScene],
})

if (import.meta.env.DEV) {
  window.__ROOM_ZERO__ = game
}

game.canvas.tabIndex = 0
game.canvas.focus()
