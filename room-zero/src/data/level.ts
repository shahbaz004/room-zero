export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** `attempt` changes vanish on death or restart. `remembered` changes survive until a full reset. */
export type Persistence = 'attempt' | 'remembered'

export type BlockStyle = 'planks' | 'runestone' | 'wall' | 'step'

export interface BlockDef {
  id: string
  name: string
  rect: Rect
  style: BlockStyle
  persistence: Persistence
}

export interface TriggerDef {
  id: string
  kind: 'lever' | 'rune' | 'plate'
  /** Overlap area that activates the trigger. */
  rect: Rect
  builds: string[]
}

export interface LevelData {
  id: string
  name: string
  /** Shown on the first attempt. */
  intro: string
  /** When set, the room refuses further remembered changes until F. */
  memorySlots?: number
  /** Player sprite center. */
  spawn: { x: number; y: number }
  platforms: Rect[]
  /** Dark pits drawn behind the action. */
  pits: Rect[]
  spikes: Rect[]
  hazards: Rect[]
  triggers: TriggerDef[]
  blocks: BlockDef[]
  exit: Rect
  torches: { x: number; y: number }[]
}

export function blockById(level: LevelData, id: string): BlockDef {
  const block = level.blocks.find((entry) => entry.id === id)
  if (!block) {
    throw new Error(`Unknown block ${id} in ${level.id}`)
  }
  return block
}
