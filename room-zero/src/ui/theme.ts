import type Phaser from 'phaser'

export const INK = {
  text: '#ece8ff',
  dim: '#8d86ad',
  remembered: '#8ff6ff',
  attempt: '#f0a63a',
  gold: '#ffd27a',
} as const

export function labelStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: 'monospace', fontSize: `${size}px`, fontStyle: 'bold', color }
}
