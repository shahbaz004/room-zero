---
name: persistence-puzzle-design
description: Design and validate puzzle-platformer rooms where some changes survive death/restart and others do not (ROOM ZERO-style "the room remembers" mechanics). Covers state model, puzzle patterns that make restarting necessary, jump-distance math for unjumpable gaps, visual language for remembered vs temporary changes, and a solvability/softlock checklist. Use when designing levels, persistence or retry mechanics, time-loop/memory puzzles, or reviewing whether a level's solution actually requires the mechanic.
---

# Persistence puzzle design

## Core rule

Persistence only matters if **restarting is part of the solution**. If a player can trigger the persistent change and finish in the same attempt, the persistence is just a checkpoint and the puzzle is fake. Every room must answer: *why must the player die or restart at least once?*

## State model (implement exactly these three)

| Category | Lifetime | Examples |
|---|---|---|
| Attempt state | cleared on death, restart (R) and full reset | player position, lever-built planks, temporary switches |
| Remembered state | survives death and restart; cleared only by full reset (F) | rune bridges, repaired platforms, routed power |
| Progress state | survives everything (localStorage) | rooms cleared, unlocks |

Implementation pattern (`RoomMemory`): two `Set<string>` keyed by the object id the trigger affects; `activate(id, persistence)`, `isActive(id)`, `startAttempt(): string[]` (clears and returns attempt ids so the scene can animate them away), `forget(): string[]`. A restart rebuilds the room as **level definition + remembered set**. Persistence belongs on the affected object (bridge), not on the trigger.

## Patterns that force a restart

1. **Unreachable-alive trigger**: the persistent trigger is only reachable by a lethal path (a rune floating above spikes; a plate at the bottom of a shaft). Dying is how you "press" it.
2. **Covered trigger / order trap**: a temporary change physically blocks the persistent trigger (planks laid over the rune). Doing things in the "obvious" order traps you, and the fix is to restart, which clears the temporary change.
3. **Split requirement**: the goal needs N changes at once, but one attempt can only make some of them (two half-bridges, each alone unjumpable).
4. **Budget**: the room can remember at most K changes; choosing which K is the puzzle.
5. **Conflict**: a remembered change helps one route and blocks another; the player must pick, or full-reset.

The ROOM ZERO room 1 solution combines 1+2+3: fall past the rune (dies, rune bridge remembered), pull the lever (planks, temporary), walk across both.

## Jump math (make "impossible" actually impossible)

```
airtime      = 2 * |JUMP_VELOCITY| / GRAVITY
jumpDistance = MOVE_SPEED * airtime            (+ MOVE_SPEED * COYOTE_MS/1000)
effectiveGap = gap - playerBodyWidth            (the body can overhang both edges)
unjumpable  if effectiveGap > jumpDistance + coyote + 20px margin
comfortable if gap <= 0.8 * jumpDistance
```

With gravity 1400, jump -480, speed 220, coyote 70ms, body 24px: distance ≈ 151 + 15 = 166 px, so a gap must be ≥ 210 px to be safely unjumpable. ROOM ZERO uses 216 px halves. Recompute whenever movement constants change, and check jumping from *every* surface that can exist (each bridge end too).

## Trigger placement checks

- A sensor must catch every way the player can enter it (walking off an edge at full speed, stopping at the edge, jump arcs). Size it from where the body can actually fall: an edge-drop has body center ≥ edge + bodyWidth/2.
- If a trigger sits above a hazard, its sensor must be hit before the hazard sensor.
- Triggers are idempotent and ignore input while the room is completed.

## Communicate what survives

- One color per persistence class everywhere: **cyan = remembered**, **amber = this attempt only**. Use it on the object, its glow, a world label ("◆ remembered" / "▪ forgets on restart"), and the HUD memory panel.
- On respawn: pulse/sparkle the remembered objects and say it: "You fell, but the room remembered the rune bridge." Name what was forgotten too.
- Forgotten objects visibly fall away; remembered ones visibly persist. Never silently change state.
- Restart should take under ~0.7s. Always offer R (restart attempt) and F (forget everything).

## Level data shape

```ts
type Persistence = 'attempt' | 'remembered'
interface BridgeDef { id: string; name: string; rect: Rect; style: string; persistence: Persistence }
interface TriggerDef { id: string; kind: 'lever' | 'rune' | 'plate'; rect: Rect; builds: string }
interface LevelData { id; name; spawn; ground: Rect[]; pit: Rect; hazard: Rect;
  triggers: TriggerDef[]; bridges: BridgeDef[]; exit: Rect }
```

Write the intended solution and the main trap as a comment on the level, along with the gap math.

## Validation checklist (per room)

```
- [ ] Intended solution written down, and it requires ≥1 death/restart
- [ ] No single-attempt solution exists (try: every trigger order, every jump from every surface)
- [ ] Every "unjumpable" gap passes the jump math with margin
- [ ] Every reachable remembered-state combination is still solvable, or F recovers it (no softlock)
- [ ] Each trap is escapable with R alone
- [ ] Every trigger sensor is reachable along all realistic entry paths
- [ ] Remembered vs temporary is distinguishable by color, label, HUD and message
- [ ] Scripted playthrough of the solution reaches `completed: true` (phaser-browser-playtest skill)
- [ ] Scripted playthrough of the main trap behaves as designed
```

## Progression guidance

Teach one idea per room: (1) die-to-remember, (2) order trap, (3) split requirement, (4) budget, (5) conflict/trade-off, then combinations. Introduce new trigger kinds only after the player has learned the cyan/amber language.
