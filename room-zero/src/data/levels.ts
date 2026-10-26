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
 * Room 5 — one memory slot. Two 216px pits.
 * Solution: fall through the right rune only, die, cross to the door.
 * Trap: the left rune fills the only slot with a bridge to a dead end. F forgets it.
 */
const room5: LevelData = {
  id: 'room-05',
  name: 'One Memory',
  intro: 'The room remembers only one bridge.',
  memorySlots: 1,
  spawn: { x: 480, y: 360 },
  platforms: [floor(0, 120), floor(336, 288), floor(840, 120)],
  pits: [pit(120, 216), pit(624, 216)],
  spikes: [spikes(120, 216), spikes(624, 216)],
  hazards: [hazard(120, 216), hazard(624, 216)],
  triggers: [
    { id: 'decoy', kind: 'rune', rect: { x: 130, y: 420, width: 190, height: 70 }, builds: ['decoy-span'] },
    { id: 'true', kind: 'rune', rect: { x: 634, y: 420, width: 190, height: 70 }, builds: ['exit-span'] },
  ],
  blocks: [
    {
      id: 'decoy-span',
      name: 'dead end',
      rect: { x: 120, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
    {
      id: 'exit-span',
      name: 'exit bridge',
      rect: { x: 624, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
  ],
  exit: door(880, 384),
  torches: [
    { x: 420, y: 246 },
    { x: 560, y: 246 },
  ],
}

/**
 * Room 6 — conflict. The gap to the island is 120px (jumpable). The door ledge is
 * 96px up, so the island cannot reach it. The rune in the island shaft remembers a
 * 48px step in between. Solution: jump the gap, fall through the rune, die, jump
 * back, hop the shaft, hop to the step, hop to the door.
 * Trap: the left lever remembers a 90px wall across the gap. F forgets it.
 */
const room6: LevelData = {
  id: 'room-06',
  name: 'The Trade',
  intro: 'The island remembers a step. The left lever seals the gap.',
  spawn: { x: 190, y: 360 },
  platforms: [floor(0, 340), floor(460, 100), floor(630, 70), floor(880, 80, 288)],
  pits: [pit(340, 120), pit(560, 70)],
  spikes: [spikes(340, 120), spikes(560, 70)],
  hazards: [hazard(340, 120), hazard(560, 70)],
  triggers: [
    { id: 'seal', kind: 'lever', rect: { x: 36, y: 348, width: 36, height: 36 }, builds: ['wall'] },
    { id: 'rune', kind: 'rune', rect: { x: 566, y: 420, width: 58, height: 70 }, builds: ['step'] },
  ],
  blocks: [
    {
      id: 'wall',
      name: 'sealing wall',
      rect: { x: 340, y: 294, width: 120, height: 90 },
      style: 'wall',
      persistence: 'remembered',
    },
    {
      id: 'step',
      name: 'step',
      // Sits in the gap between the island (ends 700) and the door ledge (starts 880).
      rect: { x: 760, y: 336, width: 80, height: 48 },
      style: 'step',
      persistence: 'remembered',
    },
  ],
  exit: door(900, 288),
  torches: [
    { x: 230, y: 246 },
    { x: 800, y: 150 },
  ],
}

/**
 * Room 7 — two remembered spans, then one amber span on the final attempt.
 * Three 216px gaps. The lever is on the left and is forgotten when you die.
 * Solution: fall for the first span, die, fall for the second, die, pull the lever, cross.
 * Trap: pulling the lever early wastes it. Death forgets the amber span only.
 */
const room7: LevelData = {
  id: 'room-07',
  name: 'Three Spans',
  intro: 'Remember two spans, then raise the amber one.',
  spawn: { x: 100, y: 360 },
  platforms: [floor(0, 140), floor(788, 172)],
  pits: [pit(140, 216), pit(356, 216), pit(572, 216)],
  spikes: [spikes(140, 216), spikes(356, 216), spikes(572, 216)],
  hazards: [hazard(140, 216), hazard(356, 216), hazard(572, 216)],
  triggers: [
    { id: 'lever', kind: 'lever', rect: { x: 24, y: 348, width: 36, height: 36 }, builds: ['span-c'] },
    { id: 'rune-a', kind: 'rune', rect: { x: 150, y: 420, width: 190, height: 70 }, builds: ['span-a'] },
    { id: 'rune-b', kind: 'rune', rect: { x: 366, y: 420, width: 190, height: 70 }, builds: ['span-b'] },
  ],
  blocks: [
    {
      id: 'span-a',
      name: 'first span',
      rect: { x: 140, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
    {
      id: 'span-b',
      name: 'second span',
      rect: { x: 356, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
    {
      id: 'span-c',
      name: 'last span',
      rect: { x: 572, y: 384, width: 216, height: 24 },
      style: 'planks',
      persistence: 'attempt',
    },
  ],
  exit: door(860, 384),
  torches: [
    { x: 110, y: 246 },
    { x: 900, y: 246 },
  ],
}

/**
 * Room 8 — order trap plus a one-slot budget. Pit is 432px, two unjumpable halves.
 * Solution: ignore the floating rune, fall through the true rune (left half of the pit),
 * die, pull the lever, cross both halves.
 * Trap: the floating rune fills the only memory. The lever's planks hide the true rune
 * until you restart. F clears a bad memory.
 */
const room8: LevelData = {
  id: 'room-08',
  name: 'The Last Room',
  intro: 'One memory. The planks hide the true rune.',
  memorySlots: 1,
  spawn: { x: 200, y: 360 },
  platforms: [floor(0, 288), floor(720, 240)],
  pits: [pit(288, 432)],
  spikes: [spikes(288, 432)],
  hazards: [hazard(288, 432)],
  triggers: [
    { id: 'decoy', kind: 'rune', rect: { x: 16, y: 312, width: 48, height: 72 }, builds: ['decoy'] },
    { id: 'lever', kind: 'lever', rect: { x: 78, y: 348, width: 36, height: 36 }, builds: ['planks'] },
    { id: 'true', kind: 'rune', rect: { x: 300, y: 424, width: 180, height: 68 }, builds: ['exit-span'] },
  ],
  blocks: [
    {
      id: 'decoy',
      name: 'decoy',
      rect: { x: 20, y: 312, width: 72, height: 24 },
      style: 'runestone',
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
      rect: { x: 504, y: 384, width: 216, height: 24 },
      style: 'runestone',
      persistence: 'remembered',
    },
  ],
  exit: door(860, 384),
  torches: [
    { x: 140, y: 246 },
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
