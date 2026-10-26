---
name: phaser-browser-playtest
description: Playtest a Phaser (or any canvas) browser game from an agent. Drives the game with synthetic keys, steps frames manually when a background tab freezes requestAnimationFrame, reads game state via a debug hook, and captures the canvas to PNG for visual review. Use when verifying a web game works, scripting a level playthrough, taking game screenshots, or when a game in the agent browser seems frozen or screenshots time out.
---

# Phaser browser playtest

Never claim a game works from a successful build alone. Play it and look at it.

## Prerequisites in the game

- Dev build exposes the game: `if (import.meta.env.DEV) window.__GAME__ = game`.
- The GameScene has `getDebugState()` returning plain JSON (position, grounded, game-specific state, attempts, `completed`, `dying`, `message`).

## Workflow

```
- [ ] 1. Start the dev server where the browser can reach it
- [ ] 2. Open the page, install the harness (scripts/harness.js)
- [ ] 3. Detect mode: real loop running, or frozen (manual stepping)
- [ ] 4. Script the intended solution; assert on getDebugState()
- [ ] 5. Script the main trap / failure paths; assert expected state
- [ ] 6. Capture screenshots at key moments and actually look at them
- [ ] 7. Fix what you see (readability, overlaps), rebuild, re-run
```

### 1. Dev server

Start Vite in the background: `./node_modules/.bin/vite --host 127.0.0.1 --port 5199 --strictPort`. In a sandboxed agent shell the browser may get `ERR_CONNECTION_REFUSED`. If so, re-run the server **outside the sandbox** (Cursor: `required_permissions: ["all"]`) and verify with `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5199/`.

### 2. Install harness

Navigate the browser tab to the URL, then call CDP `Runtime.evaluate` with `expression` = contents of `scripts/harness.js` and `returnByValue: true`. It returns the active scenes. If a scene error is suspected, evaluate `__sim.state()`. A `TypeError` in `getDebugState` means the GameScene never finished `create()`.

### 3. Detect mode

```js
(async () => { const g = window.__GAME__; const f = g.loop.frame; await new Promise(r => setTimeout(r, 500)); return g.loop.frame - f })()
```
(`awaitPromise: true`). If it returns `0`, the tab is hidden and rAF is frozen, so use **manual mode**: `__sim.step(n)` and `__sim.hold('right', frames)` (60 frames = 1s). If it's > 0, use **real-time mode**: `await __sim.holdMs('right', ms)`. Never mix modes. The loop can start mid-session if the user opens the tab; re-check when state jumps unexpectedly. If the user may be interacting, lock the browser tab during scripted runs and unlock afterwards.

### 4–5. Script and assert

Log state after each action in one evaluate call and return the log:

```js
(() => { const log = []; const snap = l => { const s = __sim.state(); log.push([l, Math.round(s.x), Math.round(s.y), s.completed, s.dying]) };
  __sim.step(30); snap('start')
  __sim.send('keydown', 'right'); for (let i = 0; i < 12; i++) { __sim.step(5); snap('r' + i) } __sim.send('keyup', 'right')
  __sim.step(45); snap('after')
  return JSON.stringify(log) })()
```

Real-time movement drifts by a few pixels per run, so add slack (walk a bit longer than needed, then check). Test the solution and every designed trap; a trap that doesn't trap is a level bug.

### 6. Screenshots

- Real loop running: the browser screenshot tool works.
- Manual mode (screenshots time out): evaluate `__sim.shot()`. The response is too large to inline and gets saved to a JSON file. Convert it:
  `python3 scripts/save_canvas.py <cdp-response.json> screenshots/NN-name.png`, then open the PNG with the image reader.
- Capture: opening scene, the key mechanic moment (e.g., right after the persistent change), the win state.

Review each image for: hero contrast against the background, HUD/text overlapping hazards or the play path, text wrapping into banners, and whether the important state is visible without reading.

## Pitfalls

- Do not regenerate textures from the console to debug. Animations keep references to the old frames and crash with `reading 'sourceSize'`. Reload the page instead.
- Synthetic `KeyboardEvent`s need `keyCode`/`which` defined via `Object.defineProperty`; Phaser reads `keyCode`.
- `JustDown` keys pressed while the player is dead fire on respawn. Expect it in scripted sequences.
- Reload the page between independent test runs; harness state does not survive navigation.
