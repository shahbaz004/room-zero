/// <reference types="vite/client" />

interface Window {
  __ROOM_ZERO__?: import('phaser').Game
  __ROOM_ZERO_LEVEL__?: (levelId: string) => void
}
