# Reference: art recipes and code

All snippets assume `templates/pixel.ts` (`makeCanvasTexture`, `makeSheet`, `paintGrid`, `createRng`, `pick`, `Painter`). The full working versions are in `room-zero/src/art/environment.ts` and `room-zero/src/scenes/GameScene.ts`.

## Palette (dark castle, used in ROOM ZERO)

| Role | Colors |
|---|---|
| outline | `#16121f` |
| wall bricks | `#241d38 #272040 #211b33 #2a2245`, mortar `#17121f`, highlight `#2f2850` |
| ground bricks | `#3a3157 #352c50 #3f355e`, top edge `#8b80b8`/`#5b5185`, moss `#5f8f6a #7fb08a` |
| night sky | `#1c2a50 → #243762 → #2d4676`, stars `#9fb7e8`, moon `#eef4ff` |
| hero cloak | light `#8a74d0`, dark `#5a4796`, scarf `#f0a63a`, eyes `#8ff6ff` |
| fire | `#fff2a8 #ffb347 #e8582c` |
| "remembered" / magic | `#8ff6ff` (glow `#4fc3d6`) |
| "temporary" / wood | `#f0a63a`, planks `#8a5a32 #c08850 #5c3a20` |

## Bricks (walls, ground, pit)

```ts
function drawBricks(p: Painter, rng: () => number, area: {x:number;y:number;width:number;height:number},
  brick: {width:number;height:number}, colors: readonly string[], mortar: string, highlight?: string) {
  p.rect(area.x, area.y, area.width, area.height, mortar)
  for (let row = 0; row * brick.height < area.height; row++) {
    const offset = row % 2 === 0 ? 0 : brick.width / 2
    for (let bx = -offset; bx < area.width; bx += brick.width) {
      const x0 = Math.max(0, bx), x1 = Math.min(area.width, bx + brick.width - 1)
      const y0 = row * brick.height, y1 = Math.min(area.height, y0 + brick.height - 1)
      if (x1 <= x0 || y1 <= y0) continue
      p.rect(area.x + x0, area.y + y0, x1 - x0, y1 - y0, pick(rng, colors))
      if (highlight && rng() < 0.5) p.rect(area.x + x0, area.y + y0, x1 - x0, 1, highlight)
    }
  }
}
```

Tiles that repeat (16x16) must use brick sizes that divide 16 (8x4) so seams line up. Ground top tile = bricks + 2 bright top rows + random moss pixels.

## Background (one 320x180 canvas, shown at PX=3)

Draw in this order:
1. Full-screen bricks (16x8).
2. Ceiling shadow: 40 rows of `#07050b` with alpha fading from 0.55 to 0.
3. Arched windows: for each pixel, inside if `y >= bodyTop ? |x-cx| <= r : hypot(x-cx, y-bodyTop) <= r`. Sky gradient in 3 bands, random stars, a crescent moon (circle minus offset circle), a cross of window bars, and a 2px stone frame.
4. Light shafts: a trapezoid from the window bottom to the floor, `globalAlpha 0.07`, `#a9c8ff`.
5. Pillars (12px wide, light left edge, dark right edge, capital band), hanging chains (alternating 3x2 / 1x3 links).
6. Pit backdrop: smaller darker bricks + a per-row black overlay with alpha increasing with depth.

Vignette: separate 320x180 canvas, radial gradient `rgba(5,3,10,0)` → `rgba(5,3,10,0.7)`, depth above the world and below the HUD.

## Props

- **Spikes 16x8**: two triangles; `half = floor((y-1)*3/5)` for y in 1..6. Left side light, center mid, right dark, white tip pixel, dark base row.
- **Planks 16x8**: wood body, bright top row, dark bottom + shadow row, seams at x=0 and 8, grain dots, nail pixels.
- **Rune stone 16x8**: blue stone, bright top rows, dark bottom, a small cyan glyph in the middle.
- **Lever 12x12, 2 frames**: `p.line` stick from pivot (6,8) to tip (2,2) off / (9,2) on, 2x2 knob red/cyan, stone base box.
- **Floating crystal 9x13**: diamond `half = round((y<=6 ? y : 12-y) * 4/6)`, light left half, darker right, edge color, 2 white specular pixels. Bob it with a yoyo tween and pair it with an additive glow.
- **Door 16x24**: arch (circle r=8 above y=8, rect below), inner opening (r=5 / x 3..12) with warm gradient toward the bottom, stone seams, center seam, gold knob. Put a pulsing additive glow behind it.
- **Torch 8x14, 3 frames**: per-row flame half-widths per frame, tip leaning by `frame-1`, color by distance from center (core/mid/outer); metal cup + handle. Anim frames `[0,1,2,1]` @ 8fps, plus ember particles and a flickering glow (alpha 0.22↔0.36, 150–300ms yoyo).
- **Glow 128x128**: radial white gradient (1 → 0.45 at 35% → 0). Tint + `BlendModes.ADD` for torches, door, rune, player rim light.
- **Pixel 1x1 white**: the only particle texture you need.

## Controller

```ts
private handleMovement(time: number): void {
  const k = this.keys, JustDown = Phaser.Input.Keyboard.JustDown
  const body = this.player.body as Phaser.Physics.Arcade.Body
  const left = k.left.isDown || k.a.isDown || !!this.touch?.left
  const right = k.right.isDown || k.d.isDown || !!this.touch?.right
  const jumpPressed = JustDown(k.up) || JustDown(k.space) || JustDown(k.w) || !!this.touch?.consume('jump')
  const jumpHeld = k.up.isDown || k.space.isDown || k.w.isDown || !!this.touch?.jumpHeld
  const onFloor = body.blocked.down || body.touching.down

  const vx = left && !right ? -MOVE_SPEED : right && !left ? MOVE_SPEED : 0
  this.player.setVelocityX(vx)
  if (vx !== 0) this.player.setFlipX(vx < 0)

  if (onFloor) {
    this.lastGroundedAt = time
    if (!this.wasOnFloor && this.airSpeed > 300) this.dust.explode(8, this.player.x, body.bottom)
  } else this.airSpeed = body.velocity.y
  this.wasOnFloor = onFloor

  if (jumpPressed) this.jumpBufferedAt = time
  if (time - this.jumpBufferedAt <= JUMP_BUFFER_MS && time - this.lastGroundedAt <= COYOTE_MS) {
    this.player.setVelocityY(JUMP_VELOCITY)
    this.jumpBufferedAt = this.lastGroundedAt = -Infinity
    this.jumpCut = false
  }
  if (!jumpHeld && !this.jumpCut && body.velocity.y < 0) {
    this.player.setVelocityY(body.velocity.y * JUMP_CUT)
    this.jumpCut = true
  }

  this.player.play(!onFloor ? (body.velocity.y < 0 ? 'hero-jump' : 'hero-fall')
    : vx !== 0 ? 'hero-run' : 'hero-idle', true)
}
```

Call it from `update(time)` only while not dying/completed. Handle restart keys before that check so restart works mid-death.

## Touch controls

```ts
export class TouchControls {
  left = false; right = false; jumpHeld = false
  private readonly pressed = new Set<'jump' | 'restart'>()
  static isSupported(scene: Phaser.Scene) { return scene.sys.game.device.input.touch }
  constructor(scene: Phaser.Scene) {
    scene.input.addPointer(2)
    this.button(scene, 78, 466, 46, '◀', (d) => (this.left = d))
    this.button(scene, 188, 466, 46, '▶', (d) => (this.right = d))
    this.button(scene, 880, 466, 52, '▲', (d) => { this.jumpHeld = d; if (d) this.pressed.add('jump') })
    this.button(scene, 770, 486, 30, '↻', (d) => { if (d) this.pressed.add('restart') })
  }
  consume(a: 'jump' | 'restart') { return this.pressed.delete(a) }
  private button(scene: Phaser.Scene, x: number, y: number, r: number, label: string, on: (d: boolean) => void) {
    const c = scene.add.circle(x, y, r, 0xffffff, 0.1).setStrokeStyle(3, 0xffffff, 0.35).setDepth(20).setInteractive()
    scene.add.text(x, y, label, { fontFamily: 'monospace', fontSize: `${r * 0.8}px` }).setOrigin(0.5).setAlpha(0.7).setDepth(21)
    const up = () => { on(false); c.setFillStyle(0xffffff, 0.1) }
    c.on('pointerdown', () => { on(true); c.setFillStyle(0xffffff, 0.28) })
    c.on('pointerup', up); c.on('pointerout', up)
  }
}
```

## Debug hook

Expose `getDebugState()` on the GameScene (position, grounded, game-specific state, attempts, completed, dying, message). Automated playtests read it through `window.__GAME__.scene.getScene('Game')`.
