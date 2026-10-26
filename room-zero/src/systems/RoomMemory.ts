import type { Persistence } from '../data/level'

export class RoomMemory {
  private readonly remembered = new Set<string>()
  private readonly attempt = new Set<string>()

  constructor(private readonly slots?: number) {}

  /**
   * Activates every entry, or none of them.
   * Returns `full` when a new remembered id would exceed the room's slot count.
   */
  tryActivate(entries: { id: string; persistence: Persistence }[]): 'ok' | 'full' {
    const freshRemembered = entries.filter(
      (entry) => entry.persistence === 'remembered' && !this.isActive(entry.id),
    )
    if (this.slots !== undefined && this.remembered.size + freshRemembered.length > this.slots) {
      return 'full'
    }
    for (const entry of entries) {
      if (this.isActive(entry.id)) {
        continue
      }
      if (entry.persistence === 'remembered') {
        this.remembered.add(entry.id)
      } else {
        this.attempt.add(entry.id)
      }
    }
    return 'ok'
  }

  isActive(id: string): boolean {
    return this.remembered.has(id) || this.attempt.has(id)
  }

  rememberedIds(): string[] {
    return [...this.remembered]
  }

  slotsUsed(): number {
    return this.remembered.size
  }

  /** Drops one attempt block and leaves everything else in place. */
  releaseAttempt(id: string): boolean {
    return this.attempt.delete(id)
  }

  attemptIds(): string[] {
    return [...this.attempt]
  }

  /** Clears attempt-scoped changes and returns the ids that were forgotten. */
  startAttempt(): string[] {
    const forgotten = [...this.attempt]
    this.attempt.clear()
    return forgotten
  }

  /** Clears everything and returns the ids that were forgotten. */
  forget(): string[] {
    const forgotten = [...this.remembered, ...this.attempt]
    this.remembered.clear()
    this.attempt.clear()
    return forgotten
  }
}
