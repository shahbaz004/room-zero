import type { LevelData } from './level'

/**
 * Eight rooms. A full jump covers ~166px and rises ~82px, so a gap of 216px is
 * unjumpable and a 48px step is jumpable. Every solution needs at least one death
 * or restart. Cyan blocks are remembered. Amber blocks are forgotten on restart.
 *
 * Floor tops sit at y=384 unless noted. The player center stands at y=360.
 */

const floor = (x: number, width: number, top = 384): LevelData['platforms'][number] => ({
  x,
  y: top,
  width,
  height: 540 - top,
})

const pit = (x: number, width: number, top = 384): LevelData['pits'][number] => ({
  x,
  y: top,
  width,
  height: 540 - top,
})

const spikes = (x: number, width: number): LevelData['spikes'][number] => ({
  x,
  y: 516,
  width,
  height: 24,
})

const hazard = (x: number, width: number): LevelData['hazards'][number] => ({
  x,
  y: 500,
  width,
  height: 40,
})

const door = (x: number, floorTop: number): LevelData['exit'] => ({
  x,
  y: floorTop - 72,
  width: 48,
  height: 72,
})

const slab = (x: number, width: number, top: number): LevelData['platforms'][number] => ({
  x,
  y: top,
  width,
  height: 36,
})

/**
 * Room 1 — die to remember.
 * Solution: walk into the 216px pit, touch the rune, die, cross the remembered bridge.
 * Trap: none. The gap cannot be jumped.
 */
const room1: LevelData = {
  id: 'room-01',
  name: 'First Fall',
  intro: 'The gap is too wide. Fall past the rune.',
  spawn: { x: 140, y: 360 },
  platforms: [floor(0, 300), floor(516, 444)],
  pits: [pit(300, 216)],
  spikes: [spikes(300, 216)],
  hazards: [hazard(300, 216)],
  triggers: [
    { id: 'rune', kind: 'rune', rect: { x: 310, y: 420, width: 180, height: 70 }, builds: ['span'] },
  ],
  blocks: [
    {
      id: 'span',
      name: 'rune bridge',
      rect: { x: 300, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
  ],
  exit: door(860, 384),
  torches: [
    { x: 220, y: 246 },
    { x: 760, y: 246 },
  ],
}

/**
 * Room 2 — order trap. The current prototype room.
 * Solution: fall to the rune first (right half, remembered), die, then pull the lever
 * (left half, forgotten on restart) and cross both.
 * Trap: the lever's planks cover the rune. Restart drops them.
 * Each half is 216px, so one half is never enough.
 */
const room2: LevelData = {
  id: 'room-02',
  name: 'The Forgetful Bridge',
  intro: 'Amber is forgotten on restart. The planks hide the rune.',
  spawn: { x: 168, y: 360 },
  platforms: [floor(0, 288), floor(720, 240)],
  pits: [pit(288, 432)],
  spikes: [spikes(288, 432)],
  hazards: [hazard(288, 432)],
  triggers: [
    { id: 'lever', kind: 'lever', rect: { x: 54, y: 348, width: 36, height: 36 }, builds: ['planks'] },
    { id: 'rune', kind: 'rune', rect: { x: 300, y: 420, width: 168, height: 80 }, builds: ['runes'] },
  ],
  blocks: [
    {
      id: 'planks',
      name: 'plank bridge',
      rect: { x: 288, y: 384, width: 216, height: 24 },
      style: 'planks',
      persistence: 'attempt',
    },
    {
      id: 'runes',
      name: 'rune bridge',
      rect: { x: 504, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
  ],
  exit: door(852, 384),
  torches: [
    { x: 216, y: 246 },
    { x: 816, y: 246 },
  ],
}

/**
 * Room 3 — memory stacks. Two 216px pits.
 * Solution: fall in the left pit, die, cross, fall in the right pit, die, cross both.
 * Trap: none. Restart keeps both spans.
 */
const room3: LevelData = {
  id: 'room-03',
  name: 'Twice',
  intro: 'Each pit remembers its own span. You will fall twice.',
  spawn: { x: 100, y: 360 },
  platforms: [floor(0, 200), floor(416, 128), floor(760, 200)],
  pits: [pit(200, 216), pit(544, 216)],
  spikes: [spikes(200, 216), spikes(544, 216)],
  hazards: [hazard(200, 216), hazard(544, 216)],
  triggers: [
    { id: 'rune-a', kind: 'rune', rect: { x: 210, y: 420, width: 190, height: 70 }, builds: ['span-a'] },
    { id: 'rune-b', kind: 'rune', rect: { x: 554, y: 420, width: 190, height: 70 }, builds: ['span-b'] },
  ],
  blocks: [
    {
      id: 'span-a',
      name: 'left span',
      rect: { x: 200, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
    {
      id: 'span-b',
      name: 'right span',
      rect: { x: 544, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
  ],
  exit: door(860, 384),
  torches: [
    { x: 150, y: 246 },
    { x: 860, y: 246 },
  ],
}

/**
 * Room 4 — a plate in a lethal shaft remembers a 48px step.
 * The door ledge is 96px up and 260px away. The step leaves a 90px gap after the
 * floor and a 30px gap before the ledge, so the door is two hops.
 * Solution: walk off the left edge, hit the plate, die, hop the step, hop to the door.
 * Trap: none. The shaft has no landing, so jumping left still falls through the plate.
 */
const room4: LevelData = {
  id: 'room-04',
  name: 'The Step',
  intro: 'The door is too high. The left shaft remembers a step.',
  spawn: { x: 240, y: 360 },
  platforms: [floor(100, 280), floor(640, 320, 288)],
  pits: [pit(0, 100)],
  spikes: [spikes(0, 100)],
  hazards: [hazard(0, 100)],
  triggers: [
    { id: 'plate', kind: 'plate', rect: { x: 4, y: 430, width: 92, height: 64 }, builds: ['step'] },
  ],
  blocks: [
    {
      id: 'step',
      name: 'step',
      // 90px past the floor and 30px short of the door ledge, so each hop is 48px up.
      rect: { x: 470, y: 336, width: 140, height: 48 },
      style: 'step',
      persistence: 'remembered',
    },
  ],
  exit: door(860, 288),
  torches: [
    { x: 300, y: 246 },
    { x: 800, y: 150 },
  ],
}

/**
 * Room 5 — one slot, and the near fall is the wrong one.
 * Spawn is 44px from the left lip and 204px from the right lip.
 * The door over the alcove is only a picture. The ledge is not solid, so it cannot be reached.
 * Solution: ignore the lit alcove, fall through the right rune, die, cross.
 * Trap: the left rune fills the only slot with a span under a door you cannot reach. F clears it.
 */
const room5: LevelData = {
  id: 'room-05',
  name: 'One Memory',
  intro: 'The room keeps one change.',
  memorySlots: 1,
  spawn: { x: 480, y: 360 },
  platforms: [floor(0, 220), floor(436, 248), floor(900, 60)],
  pits: [pit(220, 216), pit(684, 216)],
  spikes: [spikes(220, 216), spikes(684, 216)],
  hazards: [hazard(220, 216), hazard(684, 216)],
  triggers: [
    { id: 'decoy', kind: 'rune', rect: { x: 230, y: 420, width: 190, height: 70 }, builds: ['alcove-span'] },
    { id: 'true', kind: 'rune', rect: { x: 694, y: 420, width: 190, height: 70 }, builds: ['far-span'] },
  ],
  blocks: [
    {
      id: 'alcove-span',
      name: 'alcove span',
      rect: { x: 220, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
    {
      id: 'far-span',
      name: 'far span',
      rect: { x: 684, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
  ],
  exit: door(906, 384),
  decoyDoor: door(70, 300),
  torches: [
    { x: 80, y: 168 },
    { x: 150, y: 210 },
    { x: 560, y: 246 },
  ],
}

/**
 * Room 6 — the pit rune remembers a bridge and a 90px wall. The amber step hops the wall
 * and collapses after 5 seconds. A walk off the lip misses the rune; jump into it.
 * Solution: jump to the rune, die, pull the lever, cross and hop before the step falls.
 * Trap: the lever first remembers nothing. F after the rune forgets the bridge with the wall.
 */
const room6: LevelData = {
  id: 'room-06',
  name: 'The Cost',
  intro: 'The amber step does not last.',
  spawn: { x: 150, y: 360 },
  platforms: [floor(0, 240), floor(456, 144), floor(870, 90)],
  pits: [pit(240, 216)],
  spikes: [spikes(240, 216)],
  hazards: [hazard(240, 216)],
  triggers: [
    { id: 'lever', kind: 'lever', rect: { x: 40, y: 348, width: 36, height: 36 }, builds: ['step'] },
    { id: 'rune', kind: 'rune', rect: { x: 310, y: 420, width: 130, height: 70 }, builds: ['bridge', 'wall'] },
  ],
  blocks: [
    {
      id: 'bridge',
      name: 'bridge',
      rect: { x: 240, y: 384, width: 224, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
    {
      id: 'wall',
      name: 'wall',
      rect: { x: 790, y: 294, width: 40, height: 90 },
      style: 'wall',
      persistence: 'remembered',
    },
    {
      id: 'step',
      name: 'step',
      // 50px past the landing and 120px short of the door floor, beside the wall.
      rect: { x: 650, y: 336, width: 100, height: 48 },
      style: 'step',
      persistence: 'attempt',
      attemptSeconds: 5,
    },
  ],
  exit: door(890, 384),
  torches: [
    { x: 120, y: 246 },
    { x: 900, y: 246 },
  ],
}

/**
 * Room 7 — two slots and three remembered choices. The path needs the first two spans.
 * The balcony rune sits above the middle island and only a jump reaches it.
 * The last span is amber, raised from the island beside it, and lasts 4 seconds.
 * Solution: fall for the first span, die, fall for the second, die, pull the lever, cross.
 * Trap: the balcony plus either span fills both slots. F clears them.
 */
const room7: LevelData = {
  id: 'room-07',
  name: 'Two Slots',
  intro: 'The room keeps two changes. The last span does not last.',
  memorySlots: 2,
  spawn: { x: 40, y: 360 },
  platforms: [floor(0, 70), slab(180, 90, 248), floor(286, 110), floor(612, 70), floor(898, 62)],
  pits: [pit(70, 216), pit(396, 216), pit(682, 216)],
  spikes: [spikes(70, 216), spikes(396, 216), spikes(682, 216)],
  hazards: [hazard(70, 216), hazard(396, 216), hazard(682, 216)],
  triggers: [
    { id: 'rune-a', kind: 'rune', rect: { x: 80, y: 420, width: 190, height: 70 }, builds: ['span-a'] },
    { id: 'balcony', kind: 'rune', rect: { x: 300, y: 270, width: 40, height: 60 }, builds: ['balcony'] },
    { id: 'rune-b', kind: 'rune', rect: { x: 406, y: 420, width: 190, height: 70 }, builds: ['span-b'] },
    { id: 'lever', kind: 'lever', rect: { x: 624, y: 348, width: 36, height: 36 }, builds: ['span-c'] },
  ],
  blocks: [
    {
      id: 'span-a',
      name: 'first span',
      rect: { x: 70, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
    {
      id: 'span-b',
      name: 'second span',
      rect: { x: 396, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
    {
      id: 'balcony',
      name: 'balcony',
      // Hangs above the first span. Its underside stays clear of a standing body.
      rect: { x: 200, y: 288, width: 70, height: 32 },
      style: 'step',
      persistence: 'remembered',
    },
    {
      id: 'span-c',
      name: 'last span',
      rect: { x: 682, y: 384, width: 216, height: 24 },
      style: 'planks',
      persistence: 'attempt',
      attemptSeconds: 4,
    },
  ],
  exit: door(904, 384),
  torches: [
    { x: 200, y: 160 },
    { x: 250, y: 160 },
    { x: 930, y: 246 },
  ],
}

/**
 * Room 8 — one slot, an order trap, and a decoy that looks like a way up.
 * The planks do not expire. Waiting must not uncover the rune.
 * Spawn at 220 walks right into the pit without touching the lever or the decoy.
 * The high step sits in the left shaft, 40px short of the floor, under a door that is 88px above it.
 * The true rune starts at x=360, past a straight drop from the lip at 288.
 * Solution: jump into the true rune, die, pull the lever, cross both halves.
 * Trap: jumping at the left door fills the only slot. Planks raised first cover the rune until R.
 */
const room8: LevelData = {
  id: 'room-08',
  name: 'The Last Room',
  intro: 'One change. Amber does not survive the fall.',
  memorySlots: 1,
  spawn: { x: 220, y: 360 },
  platforms: [floor(120, 168), slab(16, 90, 248), floor(720, 240)],
  pits: [pit(0, 120), pit(288, 432)],
  spikes: [spikes(0, 120), spikes(288, 432)],
  hazards: [hazard(0, 120), hazard(288, 432)],
  triggers: [
    { id: 'decoy', kind: 'rune', rect: { x: 24, y: 270, width: 48, height: 60 }, builds: ['high-step'] },
    { id: 'lever', kind: 'lever', rect: { x: 150, y: 348, width: 36, height: 36 }, builds: ['planks'] },
    { id: 'true', kind: 'rune', rect: { x: 360, y: 424, width: 140, height: 64 }, builds: ['exit-span'] },
  ],
  blocks: [
    {
      id: 'high-step',
      name: 'high step',
      rect: { x: 16, y: 336, width: 72, height: 48 },
      style: 'step',
      persistence: 'remembered',
    },
    {
      id: 'planks',
      name: 'planks',
      rect: { x: 288, y: 384, width: 216, height: 24 },
      style: 'planks',
      persistence: 'attempt',
    },
    {
      id: 'exit-span',
      name: 'exit span',
      rect: { x: 504, y: 384, width: 224, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
  ],
  exit: door(860, 384),
  decoyDoor: door(40, 248),
  torches: [
    { x: 50, y: 160 },
    { x: 100, y: 180 },
    { x: 820, y: 246 },
  ],
}

export const LEVELS: LevelData[] = [room1, room2, room3, room4, room5, room6, room7, room8]

export function levelById(id: string): LevelData {
  const level = LEVELS.find((entry) => entry.id === id)
  if (!level) {
    throw new Error(`Unknown room ${id}`)
  }
  return level
}

export function levelIndex(id: string): number {
  const index = LEVELS.findIndex((entry) => entry.id === id)
  if (index < 0) {
    throw new Error(`Unknown room ${id}`)
  }
  return index
}

export function nextLevel(id: string): LevelData | undefined {
  return LEVELS[levelIndex(id) + 1]
}
