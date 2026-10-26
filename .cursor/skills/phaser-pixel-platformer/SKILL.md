---
name: phaser-pixel-platformer
description: Build a browser 2D pixel-art platformer with Phaser 3, TypeScript and Vite, with all character and environment art drawn in code (no image assets). Covers project scaffold, pixel-grid character sprite sheets, procedural tiles and backgrounds, a tight platformer controller, data-driven rooms, and juice. Use when building a web/Poki platformer or puzzle-platformer prototype, or when the user asks for a game "with proper character image and environment" without external art.
---

# Phaser pixel-art platformer

Reference implementation: `room-zero/` next to this skills folder (ROOM ZERO prototype). Read its `src/` when in doubt; it follows this skill exactly.

## Workflow

```
- [ ] 1. Scaffold Phaser 3 + TS + Vite (below)
- [ ] 2. Copy templates/pixel.ts -> src/art/pixel.ts
- [ ] 3. Define the room as data (src/data/level.ts)
- [ ] 4. Draw hero sheet (src/art/hero.ts, start from templates/hero.ts)
- [ ] 5. Draw environment textures (src/art/environment.ts, see reference.md)
- [ ] 6. BootScene generates all textures + anims once, then starts GameScene
- [ ] 7. GameScene: world, player controller, triggers, HUD, juice
- [ ] 8. `npm run build` (tsc + vite) passes
- [ ] 9. Playtest in browser (use the phaser-browser-playtest skill) and look at a screenshot
```

## 1. Scaffold

`package.json` deps: `phaser@^3.88`, dev: `typescript@^5.7`, `vite@^6`. Scripts: `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`. `tsconfig`: `strict`, `noUnusedLocals`, `moduleResolution: "bundler"`, `noEmit`. `vite.config.ts`: `base: './'` (required for Poki/relative hosting).

`src/main.ts` game config essentials:

```ts
new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 960, height: 540,
  pixelArt: true, roundPixels: true,
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1400 } } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GameScene],
})
if (import.meta.env.DEV) window.__GAME__ = game   // needed for automated playtests
```

`index.html`: canvas `image-rendering: pixelated`, body `touch-action: none; overflow: hidden`.

## 2. Pixel scale convention

- Art is authored at native size (hero 14x16, tiles 16x16, background 320x180) and displayed at `PX = 3`.
- Sprites/images: `.setScale(PX)`. Tiled surfaces: `add.tileSprite(x, y, w, h, key).setOrigin(0).setTileScale(PX)`.
- World coordinates are screen pixels; keep level geometry on multiples of `16 * PX = 48` where possible.

## 3. Art in code

- `paintGrid(p, rows, palette)` for characters and small props: one string per row, `.` = transparent. It throws on ragged rows, so typos surface immediately.
- `makeSheet(scene, key, fw, fh, count, drawFrame)` registers numeric frames 0..n-1 for `anims.generateFrameNumbers`.
- Procedural painters (`p.rect`, `p.dot`, `p.line`) + seeded `createRng(seed)` for bricks, planks, spikes, backgrounds, so art is identical every load.
- Build frames by composition (shared top rows + leg variants + bob shift) instead of drawing every frame by hand. See `templates/hero.ts`.
- Recipes for every environment piece (brick walls, arched windows, light shafts, torches, door, spikes, glow, vignette): [reference.md](reference.md).

Art direction that reads well:
- Dark, desaturated background (purple/blue bricks); saturated gameplay objects.
- The hero must be the highest-contrast thing on screen. Use a light cloak, a dark outline and glowing eyes, plus a soft additive glow image following the player.
- Give each gameplay meaning one color and use it everywhere (object, glow, HUD text, world label).

## 4. Generate once in BootScene

Create every texture and animation in `BootScene.create()`, then `this.scene.start('Game')`. Never regenerate a texture while animations reference it, because Phaser crashes with `reading 'sourceSize'`. Guard with `if (!scene.anims.exists(key))`.

## 5. Player controller (tested values)

| Constant | Value | Note |
|---|---|---|
| gravity | 1400 | world config |
| MOVE_SPEED | 220 | instant velocity, no accel, so jump distance is deterministic |
| JUMP_VELOCITY | -480 | full jump ≈ 150px horizontal, ≈ 82px high |
| JUMP_CUT | 0.45 | multiply vy on early release (variable jump) |
| COYOTE_MS | 70 | |
| JUMP_BUFFER_MS | 110 | |

- Body: `sprite.setSize(8, 14).setOffset(3, 2)`. Values are in **source pixels** and are scaled by PX automatically.
- Grounded: `body.blocked.down || body.touching.down`.
- Never tween `scale` on the physics sprite (it resizes the body). Use particles for squash/land feedback.
- Death: `player.disableBody(false, true)`. Respawn: `player.enableBody(true, x, y, true, true)`. Store the respawn `TimerEvent` and `.remove()` it when restarting manually, or a double respawn happens.

Full controller code: [reference.md](reference.md#controller).

## 6. World and triggers

- Solids: `zone = add.zone(cx, cy, w, h); physics.add.existing(zone, true); staticGroup.add(zone)`. Draw visuals separately (tileSprite), so solids can be added or removed at runtime (bridges).
- Sensors: static zones + `physics.add.overlap(player, zone, cb)`. Overlap fires **every frame**, so every callback must be idempotent (check state first).
- If a trigger and a hazard stack vertically (e.g., a rune above spikes), put the trigger sensor above the hazard sensor so it fires first.
- Room layout lives in `src/data/level.ts` as typed rects (top-left origin). The scene never hardcodes coordinates.

## 7. Juice checklist

- Particles from a 1x1 white `pixel` texture with `scale: { start: PX, end: 0 }` and tint. Use `emitting: false` + `explode(n, x, y)` for bursts.
- Death: cloak-colored burst + `cameras.main.shake(160, 0.006)`.
- Building something: objects tween in (`alpha 0→1`, `y +14→0`, `Back.easeOut`) plus sparkles along the span.
- Removing something: falls (`y +80`, random small angle, alpha → 0), then destroy. Call `tweens.killTweensOf(obj)` first.
- Ambient: torch flicker (3-frame anim + additive glow tween), embers, slow dust motes, vignette overlay.

## 8. HUD and touch

- HUD depth above the vignette. Keep text off hazards and off the player's path. Top-left: title/room/attempt/controls. Top-right: state panel.
- Message line with a short fade-in. Keep win messages to one line so they don't collide with the banner.
- Touch: show on-screen buttons only when `scene.sys.game.device.input.touch`; call `input.addPointer(2)` for multi-touch. Template: [reference.md](reference.md#touch-controls).

## Known costs

- Phaser bundle ≈ 1.5 MB (≈ 350 KB gzip). Flag it early if targeting Poki.
