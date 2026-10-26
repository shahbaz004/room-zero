import { LEVELS } from '../data/levels'

const KEY = 'room-zero-progress'

interface SaveData {
  cleared: string[]
}

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      return { cleared: [] }
    }
    const parsed = JSON.parse(raw) as SaveData
    const cleared = Array.isArray(parsed.cleared)
      ? parsed.cleared.filter((id) => LEVELS.some((level) => level.id === id))
      : []
    return { cleared }
  } catch {
    return { cleared: [] }
  }
}

function write(data: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export const SaveSystem = {
  isCleared(id: string): boolean {
    return read().cleared.includes(id)
  },

  markCleared(id: string): void {
    const data = read()
    if (!data.cleared.includes(id)) {
      data.cleared.push(id)
      write(data)
    }
  },

  /** Room 1 is always open. Later rooms open when the previous one has been cleared. */
  isUnlocked(index: number): boolean {
    if (index <= 0) {
      return true
    }
    return this.isCleared(LEVELS[index - 1].id)
  },

  /** First uncleared room, or the last room when the castle is finished. */
  continueId(): string {
    const next = LEVELS.find((level) => !this.isCleared(level.id))
    return (next ?? LEVELS[LEVELS.length - 1]).id
  },

  hasProgress(): boolean {
    return read().cleared.length > 0
  },

  allCleared(): boolean {
    return LEVELS.every((level) => this.isCleared(level.id))
  },

  reset(): void {
    localStorage.removeItem(KEY)
  },
}
