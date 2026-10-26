# ROOM ZERO — Game Development Plan

**Working title:** ROOM ZERO: The World That Remembers  
**Genre:** 2D puzzle-platformer  
**Platform:** Web browser, targeting Poki  
**Engine:** Phaser 3 + TypeScript + Vite (proposed)  
**Game mode:** Single-player  
**Initial target:** A polished prototype followed by a complete, handcrafted level-based game.

## 1. Game Vision

ROOM ZERO is a 2D puzzle-platformer in which the player must reach an exit by manipulating the environment across multiple attempts.

Unlike a conventional platformer, restarting a level does not necessarily restore every object to its original state. Certain changes made by the player persist, creating new possibilities for subsequent attempts.

The player's main challenge is to understand the room's rules, choose which mechanisms to activate, and determine the sequence of actions needed to escape.

**Design principle:** Every level should have a logical solution that players can discover through experimentation and planning.

The title and mechanic are provisional until originality research is complete.

## 2. Core Gameplay Loop

1. Enter a new room and inspect its platforms, switches, obstacles, and exit.
2. Experiment with movement and environmental mechanisms.
3. Activate a mechanism that changes the room.
4. Attempt to reach the exit.
5. If unsuccessful, restart the level.
6. Retain specifically designated changes from previous attempts.
7. Use the altered environment to overcome obstacles that were previously impossible.
8. Reach the exit and unlock the next level.

Restarts should be quick, and the game should clearly communicate which environmental changes persist.

## 3. Unique Gameplay Mechanic

### Persistent environmental changes

The central mechanic is that the room remembers selected player actions across attempts.

Examples of potential mechanics:

- **Bridge restoration:** Activating a switch repairs part of a broken bridge.
- **Permanent platform movement:** A platform remains in a new position after restarting.
- **Power routing:** Activating a generator enables a mechanism in another part of the room.
- **Gravity configuration:** A switch changes the direction of gravity for designated objects.
- **Limited modifications:** Players can activate only a limited number of mechanisms before solving a room.

These are candidate mechanics, not finalized features. We should test them individually and retain only those that create interesting, understandable puzzles.

### Important rules

- Persistence must be intentional and consistent.
- Players must understand what survives a restart.
- Death must not erase progress needed to solve the puzzle.
- A level must never require an irreversible action that makes completion impossible.
- A reset-to-original-state option should be available when needed.

## 4. Originality Validation

Before committing to the full game, investigate existing Poki games and other relevant puzzle-platformers.

Research should compare:

- Core gameplay loop.
- Persistent changes across retries.
- Switches that permanently modify room geometry.
- Puzzle progression and reset behavior.
- Similar mechanics presented under different themes or names.

Record comparable games, their core mechanics, and the differences in our design.

**Acceptance criterion:** Identify a clearly differentiated gameplay experience, not merely a different character, art style, or title.

No claim of uniqueness should be made until the relevant comparisons have been reviewed. Even then, absolute originality across every existing game cannot be guaranteed.

## 5. Technical Architecture

### Proposed technology stack

- **Phaser 3:** 2D rendering, scenes, input, animation, and camera.
- **TypeScript:** Game logic and strongly typed level definitions.
- **Vite:** Development server and production builds.
- **Tiled or a custom level editor:** Creating and editing handcrafted levels.
- **Local storage:** Saving unlocked levels and other non-sensitive local progress.
- **Web Audio API or Phaser audio:** Sound effects and music.

Avoid introducing a backend unless a later requirement genuinely needs one.

### Suggested project structure

```text
room-zero/
├── public/
│   ├── assets/
│   │   ├── sprites/
│   │   ├── tilesets/
│   │   ├── audio/
│   │   └── backgrounds/
│   └── levels/
├── src/
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── LevelSelectScene.ts
│   │   └── GameScene.ts
│   ├── entities/
│   │   ├── Player.ts
│   │   └── Interactable.ts
│   ├── systems/
│   │   ├── PhysicsSystem.ts
│   │   ├── PersistenceSystem.ts
│   │   ├── LevelManager.ts
│   │   └── SaveSystem.ts
│   ├── data/
│   │   └── levels/
│   ├── ui/
│   └── main.ts
├── tests/
├── index.html
├── package.json
└── vite.config.ts
```

This is a proposed structure; adjust it to avoid unnecessary abstraction as the prototype evolves.

## 6. Level and Persistence System

Each level should be defined as data rather than hardcoded into its scene.

A level definition should include:

- Level ID and display name.
- Player spawn position.
- Exit location and completion conditions.
- Static platforms and collision geometry.
- Hazards and interactive mechanisms.
- Mechanism dependencies and effects.
- State that resets on death.
- State that persists across attempts.
- Optional hints and solution metadata for testing.

The persistence system should distinguish between three categories:

1. **Attempt state:** Player position, velocity, temporary switches, and transient effects.
2. **Level-persistent state:** Repairs, moved platforms, activated generators, and other intentional changes.
3. **Progress state:** Completed levels and unlocked content.

Restarting should reconstruct the room from its initial definition plus the saved level-persistent state. Completing a level or selecting a full reset should follow explicitly defined rules.

## 7. Development Phases

### Phase 1 — Research and concept validation

- Review Poki's platform and puzzle-game catalog.
- Identify games with related mechanics.
- Define what makes ROOM ZERO meaningfully different.
- Write the game design document.
- Establish the target audience and intended difficulty.

**Deliverable:** Validated concept and a documented list of originality risks.

### Phase 2 — Playable prototype

Build one complete test room containing:

- Basic movement and jumping.
- Solid platforms and gap collision.
- One interactive switch.
- One persistent environmental change.
- Death and instant restart.
- A working exit and completion state.

Test whether retaining a change across attempts is understandable and satisfying.

**Deliverable:** A playable browser prototype.

### Phase 3 — Core systems

- Implement reusable level loading.
- Implement the persistent-state system.
- Add interactive objects and hazard types.
- Add checkpoints only if they improve the puzzle design.
- Implement level restart, full reset, and progression.
- Add automated tests for state restoration and completion conditions.

**Deliverable:** A reusable engine capable of running data-driven levels.

### Phase 4 — Vertical slice

Create a small group of polished levels that demonstrate the complete experience.

Include:

- A tutorial level.
- A simple persistence puzzle.
- A puzzle requiring two changes.
- A puzzle with a meaningful trade-off.
- A more difficult combination puzzle.

Add temporary or final art, audio, menus, hints, and basic progression.

**Deliverable:** A representative build suitable for internal playtesting.

### Phase 5 — Full level production

Expand the level set based on playtest results.

A tentative planning target is 30–60 handcrafted levels, but the final quantity should depend on puzzle quality, development capacity, and Poki's current submission expectations.

Introduce mechanics gradually, reuse systems in new combinations, and ensure every level has a tested solution.

**Deliverable:** Complete level content with a difficulty curve.

### Phase 6 — Polish and quality assurance

- Improve player movement and responsiveness.
- Add clear feedback when a persistent change occurs.
- Optimize restart time and loading.
- Add sound effects, music, and accessible UI.
- Test keyboard controls and relevant mobile or touch input.
- Test multiple screen sizes and browser conditions.
- Check performance, asset loading, and save-data recovery.
- Verify that every level can be completed from its intended starting state.

**Deliverable:** Release candidate.

### Phase 7 — Poki integration and submission

- Review Poki's current developer documentation and submission requirements.
- Confirm any required SDK, advertising, analytics, input, and lifecycle integration.
- Verify that the production build complies with applicable technical and content requirements.
- Prepare the game description, thumbnail, screenshots, and other requested materials.
- Submit for review and address feedback.

**Deliverable:** Submission-ready web build. Acceptance and publication remain subject to Poki's review.

## 8. Quality Criteria

The game is ready for release consideration when:

- Every published level has a verified solution.
- Restarts preserve exactly the intended state.
- Players can distinguish temporary changes from persistent changes.
- No level can become unwinnable through an unintended action.
- Controls work reliably and consistently.
- The game loads and runs smoothly on supported target devices.
- Progress saving and resetting behave predictably.
- The opening levels teach the core mechanic without excessive explanation.
- Playtesters can explain why their actions helped or hindered progress.
- The game offers a differentiated experience compared with identified competitors.

## 9. Scope Control

The initial release should prioritize a strong single-player puzzle experience.

Exclude from the first release unless testing demonstrates a clear need:

- Multiplayer.
- User accounts and cloud synchronization.
- Procedural level generation.
- Online leaderboards.
- Complex physics simulation.
- A level editor for end users.
- Unnecessary backend services.

These features increase complexity without proving the core mechanic is fun.

## 10. Immediate Next Steps

1. Research similar games on Poki and document overlapping mechanics.
2. Finalize the exact rules for persistence, death, restart, and full reset.
3. Design three candidate puzzle levels on paper.
4. Build the smallest playable prototype.
5. Playtest the prototype before expanding the level count.
6. Revise the design based on observed player behavior.
7. Begin full production only after the core loop is validated.

**Final objective:** Build a polished, original-feeling, level-based browser game with a memorable mechanic, satisfying puzzle progression, and a technically reliable implementation suitable for Poki submission.
