import Phaser from 'phaser'
import { ART, TORCH_ANIM } from '../art/environment'
import { HERO_ANIMS, HERO_KEY } from '../art/hero'
import { PX } from '../art/pixel'
import { blockById, type BlockDef, type BlockStyle, type LevelData, type Rect, type TriggerDef } from '../data/level'
import { LEVELS, levelById, levelIndex, nextLevel } from '../data/levels'
import { RoomMemory } from '../systems/RoomMemory'
import { SaveSystem } from '../systems/SaveSystem'
import { INK, labelStyle } from '../ui/theme'
import { TouchControls } from '../ui/TouchControls'

const MOVE_SPEED = 220
const JUMP_VELOCITY = -480
const JUMP_CUT = 0.45
const COYOTE_MS = 70
const JUMP_BUFFER_MS = 110
const RESPAWN_MS = 650
const FALL_Y = 560

const TINT = {
  remembered: 0x8ff6ff,
  attempt: 0xf0a63a,
  ember: 0xffb347,
  door: 0xffd27a,
  cloak: [0x8a74d0, 0x5a4796, 0xf0a63a, 0x8ff6ff],
}

type AttemptReason = 'first' | 'death' | 'restart' | 'forget'

type BlockVisual = Phaser.GameObjects.TileSprite | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text

interface BlockRuntime {
  def: BlockDef
  solid: Phaser.GameObjects.Zone
  visuals: BlockVisual[]
  tag: Phaser.GameObjects.Text
}

interface TriggerRuntime {
  def: TriggerDef
  sprite: Phaser.GameObjects.Sprite
  glow: Phaser.GameObjects.Image
}

export class GameScene extends Phaser.Scene {
  private level!: LevelData
  private player!: Phaser.Physics.Arcade.Sprite
  private playerLight!: Phaser.GameObjects.Image
  private solids!: Phaser.Physics.Arcade.StaticGroup
  private memory!: RoomMemory
  private readonly blocks = new Map<string, BlockRuntime>()
  private readonly triggers = new Map<string, TriggerRuntime>()
  private touch?: TouchControls
  private keys!: Record<
    'left' | 'right' | 'up' | 'space' | 'a' | 'd' | 'w' | 'r' | 'f' | 'esc' | 'enter',
    Phaser.Input.Keyboard.Key
  >

  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter
  private doorGlow!: Phaser.GameObjects.Image

  private hud!: {
    attempts: Phaser.GameObjects.Text
    memoryTitle: Phaser.GameObjects.Text
    remembered: Phaser.GameObjects.Text
    attempt: Phaser.GameObjects.Text
    message: Phaser.GameObjects.Text
    messageBg: Phaser.GameObjects.Rectangle
    banner: Phaser.GameObjects.Container
  }

  private dying = false
  private completed = false
  private attempts = 0
  private fullNotice = false
  private message = ''
  private readonly expiryAt = new Map<string, number>()
  private readonly shaking = new Set<string>()
  private readonly triggerHeld = new Set<string>()
  private respawnTimer?: Phaser.Time.TimerEvent
  private lastGroundedAt = -Infinity
  private jumpBufferedAt = -Infinity
  private jumpCut = false
  private wasOnFloor = false
  private airSpeed = 0

  constructor() {
    super('Game')
  }

  init(data: { levelId?: string } = {}): void {
    this.level = levelById(data.levelId ?? LEVELS[0].id)
    this.memory = new RoomMemory(this.level.memorySlots)
    this.attempts = 0
    this.fullNotice = false
    this.dying = false
    this.completed = false
    this.blocks.clear()
    this.triggers.clear()
    this.expiryAt.clear()
    this.shaking.clear()
    this.triggerHeld.clear()
    this.respawnTimer?.remove()
    this.respawnTimer = undefined
  }

  create(): void {
    this.add.image(0, 0, ART.background).setOrigin(0).setScale(PX).setDepth(0)
    this.createTorches()
    this.createAmbientDust()
    this.createPits()

    this.solids = this.physics.add.staticGroup()
    this.level.platforms.forEach((rect) => this.createGround(rect))
    this.createDoor()
    this.createPlayer()
    this.physics.add.collider(this.player, this.solids)

    this.createFx()
    this.level.triggers.forEach((def) => this.createTrigger(def))
    this.level.hazards.forEach((rect) => this.addSensor(rect, () => this.kill()))
    this.addSensor(this.level.exit, () => this.reachExit())

    this.add.image(0, 0, ART.vignette).setOrigin(0).setScale(PX).setDepth(8)
    this.createHud()
    this.bindInput()
    if (TouchControls.isSupported(this)) {
      this.touch = new TouchControls(this)
    }

    this.startAttempt('first')
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.respawnTimer?.remove())
    this.input.on('pointerdown', () => this.game.canvas.focus())

    if (import.meta.env.DEV) {
      window.__ROOM_ZERO_LEVEL__ = (levelId: string) => this.scene.start('Game', { levelId })
    }
  }

  update(time: number): void {
    this.playerLight
      .setPosition(this.player.x, this.player.y)
      .setVisible(this.player.visible)
      .setAlpha(this.player.alpha * 0.22)
    this.releaseTriggers()
    this.tickExpiry(time)
    this.handleResetInput()
    if (this.dying || this.completed) {
      return
    }
    if (this.player.y > FALL_Y) {
      this.kill()
      return
    }
    this.handleMovement(time)
  }

  getDebugState(): {
    levelId: string
    x: number
    y: number
    onFloor: boolean
    remembered: string[]
    attempt: string[]
    attempts: number
    completed: boolean
    dying: boolean
    message: string
  } {
    return {
      levelId: this.level.id,
      x: this.player.x,
      y: this.player.y,
      onFloor: this.isOnFloor(),
      remembered: this.memory.rememberedIds(),
      attempt: this.memory.attemptIds(),
      attempts: this.attempts,
      completed: this.completed,
      dying: this.dying,
      message: this.message,
    }
  }

  // ---------------------------------------------------------------- world

  private createGround(rect: Rect): void {
    const tile = 16 * PX
    const cap = Math.min(tile, rect.height)
    this.add.tileSprite(rect.x, rect.y, rect.width, cap, ART.groundTop).setOrigin(0).setTileScale(PX).setDepth(5)
    if (rect.height > cap) {
      this.add
        .tileSprite(rect.x, rect.y + cap, rect.width, rect.height - cap, ART.groundFill)
        .setOrigin(0)
        .setTileScale(PX)
        .setDepth(5)
    }
    this.addSolid(rect)
  }

  private createPits(): void {
    for (const pit of this.level.pits) {
      const shade = this.add.graphics().setDepth(1)
      const steps = 8
      for (let i = 0; i < steps; i++) {
        shade.fillStyle(0x050308, 0.18 + (i / steps) * 0.55)
        const y = pit.y + (pit.height * i) / steps
        shade.fillRect(pit.x, y, pit.width, pit.height / steps + 1)
      }
      if (pit.width >= 48) {
        this.add.rectangle(pit.x, pit.y, 6, pit.height, 0x07050b, 0.55).setOrigin(0).setDepth(2)
        this.add.rectangle(pit.x + pit.width - 6, pit.y, 6, pit.height, 0x07050b, 0.55).setOrigin(0).setDepth(2)
      }
    }
    for (const spike of this.level.spikes) {
      this.add
        .tileSprite(spike.x, spike.y, spike.width, spike.height, ART.spikes)
        .setOrigin(0)
        .setTileScale(PX)
        .setDepth(4)
      this.add
        .image(spike.x + spike.width / 2, spike.y + 10, ART.glow)
        .setDisplaySize(spike.width * 1.05, 56)
        .setTint(0xb02a3a)
        .setAlpha(0.22)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3)
    }
  }

  private createTorches(): void {
    for (const { x, y } of this.level.torches) {
      const glow = this.add
        .image(x, y + 6, ART.glow)
        .setScale(2.4)
        .setTint(TINT.ember)
        .setAlpha(0.3)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(1)
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.22, to: 0.36 },
        scale: { from: 2.3, to: 2.55 },
        duration: 180 + Math.random() * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
      this.add.sprite(x, y, ART.torch).setScale(PX).setDepth(2).play(TORCH_ANIM)
      this.add
        .particles(x, y - 18, ART.pixel, {
          lifespan: { min: 500, max: 1000 },
          speedX: { min: -8, max: 8 },
          speedY: { min: -60, max: -25 },
          scale: { start: PX, end: 0 },
          tint: [0xfff2a8, 0xffb347, 0xe8582c],
          frequency: 140,
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(2)
    }
  }

  private createAmbientDust(): void {
    this.add
      .particles(0, 0, ART.pixel, {
        x: { min: 0, max: 960 },
        y: { min: 60, max: 520 },
        lifespan: 7000,
        speedX: { min: -6, max: 6 },
        speedY: { min: -10, max: -2 },
        scale: { min: 2, max: 3 },
        alpha: { start: 0.35, end: 0 },
        tint: 0xc7bff0,
        frequency: 260,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(3)
  }

  private createDoor(): void {
    const { exit } = this.level
    const cx = exit.x + exit.width / 2
    this.doorGlow = this.add
      .image(cx, exit.y + exit.height * 0.65, ART.glow)
      .setScale(1.4)
      .setTint(TINT.door)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4)
    this.tweens.add({
      targets: this.doorGlow,
      alpha: { from: 0.25, to: 0.45 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    this.add.image(cx, exit.y + exit.height, ART.door).setOrigin(0.5, 1).setScale(PX).setDepth(5)
    const fake = this.level.decoyDoor
    if (fake) {
      this.add
        .image(fake.x + fake.width / 2, fake.y + fake.height, ART.door)
        .setOrigin(0.5, 1)
        .setScale(PX)
        .setDepth(5)
        .setAlpha(0.9)
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(this.level.spawn.x, this.level.spawn.y, HERO_KEY, 0)
    this.player.setScale(PX).setDepth(7)
    this.player.setSize(8, 14).setOffset(3, 2)
    this.player.setCollideWorldBounds(true)
    this.player.play(HERO_ANIMS.idle.key)
    this.playerLight = this.add
      .image(this.player.x, this.player.y, ART.glow)
      .setScale(1.1)
      .setTint(0xb8a8ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6)
  }

  private createFx(): void {
    this.sparkle = this.add
      .particles(0, 0, ART.pixel, {
        lifespan: { min: 400, max: 900 },
        speed: { min: 20, max: 90 },
        angle: { min: 200, max: 340 },
        gravityY: 60,
        scale: { start: PX, end: 0 },
        tint: TINT.remembered,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(9)
    this.burst = this.add
      .particles(0, 0, ART.pixel, {
        lifespan: { min: 350, max: 750 },
        speed: { min: 80, max: 260 },
        gravityY: 700,
        scale: { start: PX + 1, end: 1 },
        tint: TINT.cloak,
        emitting: false,
      })
      .setDepth(9)
    this.dust = this.add
      .particles(0, 0, ART.pixel, {
        lifespan: 380,
        speedX: { min: -70, max: 70 },
        speedY: { min: -40, max: -5 },
        scale: { start: PX, end: 0 },
        tint: 0x9a90c0,
        alpha: { start: 0.8, end: 0 },
        emitting: false,
      })
      .setDepth(8)
  }

  // ------------------------------------------------------------- triggers

  private createTrigger(def: TriggerDef): void {
    const cx = def.rect.x + def.rect.width / 2
    const bottom = def.rect.y + def.rect.height
    let sprite: Phaser.GameObjects.Sprite
    let glow: Phaser.GameObjects.Image
    if (def.kind === 'rune') {
      const cy = def.rect.y + Math.min(30, def.rect.height / 2)
      sprite = this.add.sprite(cx, cy, ART.rune).setScale(PX).setDepth(6)
      glow = this.add.image(cx, cy, ART.glow).setScale(0.9).setTint(TINT.remembered).setBlendMode(Phaser.BlendModes.ADD).setDepth(5)
      this.tweens.add({
        targets: [sprite, glow],
        y: cy - 6,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    } else {
      const texture = def.kind === 'plate' ? ART.plate : ART.lever
      sprite = this.add.sprite(cx, bottom, texture, 0).setOrigin(0.5, 1).setScale(PX).setDepth(6)
      glow = this.add
        .image(cx, bottom - 10, ART.glow)
        .setScale(def.kind === 'plate' ? 0.7 : 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(5)
    }
    this.triggers.set(def.id, { def, sprite, glow })
    this.addSensor(def.rect, () => this.activateTrigger(def))
    this.syncTrigger(def.id)
  }

  private syncTrigger(id: string): void {
    const runtime = this.triggers.get(id)
    if (!runtime) {
      return
    }
    const active = runtime.def.builds.every((blockId) => this.memory.isActive(blockId))
    const remembered = this.block(runtime.def.builds[0]).persistence === 'remembered'
    if (runtime.def.kind === 'rune') {
      runtime.sprite.setAlpha(active ? 1 : 0.75).setTint(active ? 0xffffff : 0x9fd8e0)
      runtime.glow.setAlpha(active ? 0.6 : 0.25)
      return
    }
    runtime.sprite.setFrame(active ? 1 : 0)
    runtime.glow.setTint(active ? (remembered ? TINT.remembered : TINT.attempt) : 0xe85d4c).setAlpha(active ? 0.45 : 0.25)
  }

  private releaseTriggers(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null
    if (!body) {
      return
    }
    for (const id of this.triggerHeld) {
      const runtime = this.triggers.get(id)
      if (!runtime) {
        this.triggerHeld.delete(id)
        continue
      }
      const { rect } = runtime.def
      const overlapping =
        body.right > rect.x &&
        body.left < rect.x + rect.width &&
        body.bottom > rect.y &&
        body.top < rect.y + rect.height
      if (!overlapping) {
        this.triggerHeld.delete(id)
      }
    }
  }

  private activateTrigger(def: TriggerDef): void {
    if (this.completed || this.triggerHeld.has(def.id)) {
      return
    }
    if (def.builds.every((id) => this.memory.isActive(id))) {
      this.triggerHeld.add(def.id)
      return
    }
    const built = def.builds.map((id) => this.block(id))
    const result = this.memory.tryActivate(built.map((block) => ({ id: block.id, persistence: block.persistence })))
    if (result === 'full') {
      if (!this.fullNotice) {
        this.fullNotice = true
        const slots = this.level.memorySlots ?? 1
        this.setMessage(`The room can only remember ${slots} ${slots === 1 ? 'thing' : 'things'}. Press F to forget.`)
      }
      return
    }
    for (const block of built) {
      this.buildBlock(block, true)
    }
    this.triggerHeld.add(def.id)
    this.syncTrigger(def.id)

    const runtime = this.triggers.get(def.id)
    const remembered = built.some((block) => block.persistence === 'remembered')
    const color = remembered ? TINT.remembered : TINT.attempt
    if (runtime) {
      this.sparkle.setParticleTint(color)
      this.sparkle.explode(18, runtime.sprite.x, runtime.sprite.y)
    }
    const names = built.map((block) => block.name).join(' and ')
    this.setMessage(
      remembered
        ? `The room will remember the ${names}.`
        : `The ${names} will be forgotten when you restart.`,
    )
    if (remembered) {
      this.cameras.main.flash(160, 60, 160, 180)
    }
  }

  // --------------------------------------------------------------- blocks

  private buildBlock(def: BlockDef, animate: boolean): void {
    if (this.blocks.has(def.id)) {
      return
    }
    const { rect } = def
    const remembered = def.persistence === 'remembered'
    const tile = this.add
      .tileSprite(rect.x, rect.y, rect.width, rect.height, textureFor(def.style))
      .setOrigin(0)
      .setTileScale(PX)
      .setDepth(6)
    if (def.style === 'wall') {
      tile.setTint(0xd5e4ff)
    }
    const visuals: BlockVisual[] = [tile]

    const glowLine = this.add
      .rectangle(rect.x, rect.y + rect.height, rect.width, 4, remembered ? TINT.remembered : TINT.attempt, 0.35)
      .setOrigin(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6)
    visuals.push(glowLine)
    if (remembered) {
      this.tweens.add({
        targets: glowLine,
        alpha: { from: 0.2, to: 0.6 },
        delay: 300,
        duration: 900,
        yoyo: true,
        repeat: -1,
      })
    }

    const tagStyle = labelStyle(13, remembered ? INK.remembered : INK.attempt)
    const timed = !remembered && def.attemptSeconds !== undefined
    const tagText = remembered ? '◆ remembered' : timed ? '▪ falls away' : '▪ forgets on restart'
    const tag =
      def.style === 'wall' || def.style === 'step'
        ? this.add.text(rect.x + rect.width / 2, rect.y - 6, tagText, tagStyle).setOrigin(0.5, 1).setDepth(6)
        : this.add.text(rect.x + rect.width / 2, rect.y + rect.height + 8, tagText, tagStyle).setOrigin(0.5, 0).setDepth(6)
    visuals.push(tag)

    const solid = this.addSolid(rect)
    this.blocks.set(def.id, { def, solid, visuals, tag })
    this.armExpiry(def)

    if (animate) {
      for (const visual of visuals) {
        const finalY = visual.y
        visual.setAlpha(0).setY(finalY + 14)
        this.tweens.add({ targets: visual, alpha: 1, y: finalY, duration: 260, ease: 'Back.easeOut' })
      }
      this.sparkle.setParticleTint(remembered ? TINT.remembered : TINT.attempt)
      const marks = Math.max(2, Math.round(rect.width / 48))
      for (let i = 0; i <= marks; i++) {
        this.sparkle.explode(3, rect.x + (rect.width * i) / marks, rect.y)
      }
    }
    this.refreshHud()
  }

  private removeBlock(id: string, animate: boolean): void {
    const runtime = this.blocks.get(id)
    if (!runtime) {
      return
    }
    this.blocks.delete(id)
    runtime.solid.destroy()
    for (const visual of runtime.visuals) {
      this.tweens.killTweensOf(visual)
      if (!animate) {
        visual.destroy()
        continue
      }
      this.tweens.add({
        targets: visual,
        y: visual.y + 80,
        alpha: 0,
        angle: runtime.def.style === 'planks' ? Phaser.Math.Between(-12, 12) : 0,
        duration: 420,
        ease: 'Quad.easeIn',
        onComplete: () => visual.destroy(),
      })
    }
  }

  private pulseRemembered(): void {
    for (const runtime of this.blocks.values()) {
      if (runtime.def.persistence !== 'remembered') {
        continue
      }
      const { rect } = runtime.def
      this.sparkle.setParticleTint(TINT.remembered)
      const marks = Math.max(2, Math.round(rect.width / 60))
      for (let i = 0; i <= marks; i++) {
        this.sparkle.explode(2, rect.x + (rect.width * i) / marks, rect.y)
      }
      this.tweens.add({ targets: runtime.tag, scale: { from: 1.35, to: 1 }, duration: 380, ease: 'Back.easeOut' })
    }
  }

  // ---------------------------------------------------------------- flow

  private armExpiry(def: BlockDef): void {
    if (def.persistence !== 'attempt' || def.attemptSeconds === undefined) {
      return
    }
    this.expiryAt.set(def.id, this.time.now + def.attemptSeconds * 1000)
  }

  private tickExpiry(time: number): void {
    for (const [id, at] of this.expiryAt) {
      if (time >= at) {
        this.collapseBlock(id)
        continue
      }
      const runtime = this.blocks.get(id)
      if (runtime) {
        const seconds = Math.max(1, Math.ceil((at - time) / 1000))
        runtime.tag.setText(`▪ ${seconds}s`)
      }
      if (at - time <= 1000) {
        this.shakeBlock(id)
      }
    }
    if (this.expiryAt.size > 0) {
      this.refreshHud()
    }
  }

  private shakeBlock(id: string): void {
    if (this.shaking.has(id)) {
      return
    }
    const runtime = this.blocks.get(id)
    if (!runtime) {
      return
    }
    this.shaking.add(id)
    this.tweens.add({
      targets: runtime.visuals,
      x: '+=2',
      duration: 70,
      yoyo: true,
      repeat: 6,
    })
  }

  private collapseBlock(id: string): void {
    this.expiryAt.delete(id)
    this.shaking.delete(id)
    if (!this.memory.releaseAttempt(id)) {
      return
    }
    const name = this.block(id).name
    this.removeBlock(id, true)
    this.triggers.forEach((_, triggerId) => this.syncTrigger(triggerId))
    const kept = this.memory.rememberedIds().map((keptId) => this.block(keptId).name)
    this.setMessage(
      kept.length > 0
        ? `The ${name} fell away. The room still remembers the ${kept.join(' and ')}.`
        : `The ${name} fell away.`,
    )
    this.refreshHud()
  }

  private startAttempt(reason: AttemptReason): void {
    this.respawnTimer?.remove()
    this.respawnTimer = undefined
    this.expiryAt.clear()
    this.shaking.clear()
    this.triggerHeld.clear()
    const forgotten = reason === 'forget' ? this.memory.forget() : this.memory.startAttempt()
    forgotten.forEach((id) => this.removeBlock(id, reason !== 'first'))
    this.triggers.forEach((_, id) => this.syncTrigger(id))

    this.dying = false
    this.completed = false
    this.fullNotice = false
    this.attempts += 1
    this.lastGroundedAt = -Infinity
    this.jumpBufferedAt = -Infinity
    this.wasOnFloor = false
    this.hud.banner.setVisible(false)

    this.player.enableBody(true, this.level.spawn.x, this.level.spawn.y, true, true)
    this.player.setVelocity(0, 0).setFlipX(false).setAlpha(0)
    this.player.play(HERO_ANIMS.idle.key)
    this.tweens.add({ targets: this.player, alpha: 1, duration: 160 })
    this.sparkle.setParticleTint(0xffffff)
    this.sparkle.explode(10, this.level.spawn.x, this.level.spawn.y + 10)

    const kept = this.memory.rememberedIds().map((id) => this.block(id).name)
    const lost = forgotten.map((id) => this.block(id).name)
    if (kept.length > 0 && reason !== 'first') {
      this.pulseRemembered()
    }
    this.setMessage(this.attemptMessage(reason, kept, lost))
    this.refreshHud()
  }

  private attemptMessage(reason: AttemptReason, kept: string[], lost: string[]): string {
    const lostLine = lost.length > 0 ? ` Forgotten: ${lost.join(' and ')}.` : ''
    switch (reason) {
      case 'first':
        return this.level.intro
      case 'forget':
        return 'The room forgot everything.'
      case 'restart':
        return kept.length > 0
          ? `Restarted. The room still remembers the ${kept.join(' and ')}.${lostLine}`
          : `Restarted.${lostLine}`
      case 'death':
        return kept.length > 0
          ? `You fell, but the room remembered the ${kept.join(' and ')}.${lostLine}`
          : `You fell. The room has nothing to remember yet.${lostLine}`
    }
  }

  private kill(): void {
    if (this.dying || this.completed) {
      return
    }
    this.dying = true
    const { x, y } = this.player
    this.player.disableBody(false, true)
    this.burst.explode(26, x, y)
    this.cameras.main.shake(160, 0.006)
    this.respawnTimer = this.time.delayedCall(RESPAWN_MS, () => this.startAttempt('death'))
  }

  private reachExit(): void {
    if (this.completed || this.dying) {
      return
    }
    this.completed = true
    SaveSystem.markCleared(this.level.id)
    const { exit } = this.level
    this.player.disableBody(false, false)
    this.tweens.add({
      targets: this.player,
      x: exit.x + exit.width / 2,
      alpha: 0,
      duration: 380,
      ease: 'Quad.easeIn',
    })
    this.tweens.add({ targets: this.doorGlow, scale: 3, alpha: 0.8, duration: 300, yoyo: true })
    this.sparkle.setParticleTint(TINT.door)
    this.sparkle.explode(40, exit.x + exit.width / 2, exit.y + exit.height / 2)

    const last = !nextLevel(this.level.id)
    const banner = this.hud.banner
    const subtitle = banner.getAt(2) as Phaser.GameObjects.Text
    subtitle.setText(last ? `Escaped on attempt ${this.attempts}` : `Escaped on attempt ${this.attempts}`)
    banner.setVisible(true).setAlpha(0).setScale(0.9)
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' })
    this.setMessage(last ? 'Enter leaves the castle · Esc returns to the map' : 'Enter opens the next room · Esc returns to the map')
  }

  private advance(): void {
    if (!this.completed) {
      return
    }
    const next = nextLevel(this.level.id)
    if (!next) {
      this.scene.start('Ending')
      return
    }
    this.scene.start('Game', { levelId: next.id })
  }

  private leave(): void {
    this.scene.start('LevelSelect')
  }

  // ---------------------------------------------------------------- input

  private bindInput(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable')
    }
    const K = Phaser.Input.Keyboard.KeyCodes
    this.keys = {
      left: keyboard.addKey(K.LEFT),
      right: keyboard.addKey(K.RIGHT),
      up: keyboard.addKey(K.UP),
      space: keyboard.addKey(K.SPACE),
      a: keyboard.addKey(K.A),
      d: keyboard.addKey(K.D),
      w: keyboard.addKey(K.W),
      r: keyboard.addKey(K.R),
      f: keyboard.addKey(K.F),
      esc: keyboard.addKey(K.ESC),
      enter: keyboard.addKey(K.ENTER),
    }
    keyboard.addCapture([K.LEFT, K.RIGHT, K.UP, K.SPACE, K.A, K.D, K.W, K.R, K.F, K.ESC, K.ENTER])
  }

  private handleResetInput(): void {
    const JustDown = Phaser.Input.Keyboard.JustDown
    if (JustDown(this.keys.esc)) {
      this.leave()
      return
    }
    if (JustDown(this.keys.enter) && this.completed) {
      this.advance()
      return
    }
    if (JustDown(this.keys.r) || this.touch?.consume('restart')) {
      this.startAttempt('restart')
    }
    if (JustDown(this.keys.f)) {
      this.startAttempt('forget')
    }
  }

  private isOnFloor(): boolean {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    return body.blocked.down || body.touching.down
  }

  private handleMovement(time: number): void {
    const k = this.keys
    const JustDown = Phaser.Input.Keyboard.JustDown
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const left = k.left.isDown || k.a.isDown || !!this.touch?.left
    const right = k.right.isDown || k.d.isDown || !!this.touch?.right
    const jumpPressed = JustDown(k.up) || JustDown(k.space) || JustDown(k.w) || !!this.touch?.consume('jump')
    const jumpHeld = k.up.isDown || k.space.isDown || k.w.isDown || !!this.touch?.jumpHeld
    const onFloor = this.isOnFloor()

    const vx = left && !right ? -MOVE_SPEED : right && !left ? MOVE_SPEED : 0
    this.player.setVelocityX(vx)
    if (vx !== 0) {
      this.player.setFlipX(vx < 0)
    }

    if (onFloor) {
      this.lastGroundedAt = time
      if (!this.wasOnFloor && this.airSpeed > 300) {
        this.dust.explode(8, this.player.x, body.bottom)
      }
    } else {
      this.airSpeed = body.velocity.y
    }
    this.wasOnFloor = onFloor

    if (jumpPressed) {
      this.jumpBufferedAt = time
    }
    if (time - this.jumpBufferedAt <= JUMP_BUFFER_MS && time - this.lastGroundedAt <= COYOTE_MS) {
      this.player.setVelocityY(JUMP_VELOCITY)
      this.jumpBufferedAt = -Infinity
      this.lastGroundedAt = -Infinity
      this.jumpCut = false
      this.dust.explode(5, this.player.x, body.bottom)
    }
    if (!jumpHeld && !this.jumpCut && body.velocity.y < 0) {
      this.player.setVelocityY(body.velocity.y * JUMP_CUT)
      this.jumpCut = true
    }

    const anim = !onFloor
      ? body.velocity.y < 0
        ? HERO_ANIMS.jump.key
        : HERO_ANIMS.fall.key
      : vx !== 0
        ? HERO_ANIMS.run.key
        : HERO_ANIMS.idle.key
    this.player.play(anim, true)
  }

  // ------------------------------------------------------------------ hud

  private createHud(): void {
    const depth = 10
    const roomNo = levelIndex(this.level.id) + 1
    this.add.text(20, 16, 'ROOM ZERO', labelStyle(22, INK.text)).setShadow(2, 2, '#000', 0).setDepth(depth)
    this.add.text(20, 44, `Room ${roomNo} of ${LEVELS.length} · ${this.level.name}`, labelStyle(13, INK.dim)).setDepth(depth)
    const attempts = this.add.text(20, 62, '', labelStyle(13, INK.dim)).setDepth(depth)

    const panelX = 700
    this.add.rectangle(panelX, 14, 244, 124, 0x0b0912, 0.72).setOrigin(0).setStrokeStyle(2, 0x3d3560).setDepth(depth)
    const memoryTitle = this.add.text(panelX + 12, 22, 'ROOM MEMORY', labelStyle(12, INK.dim)).setDepth(depth)
    const remembered = this.add
      .text(panelX + 12, 40, '', { ...labelStyle(13, INK.remembered), wordWrap: { width: 220 } })
      .setDepth(depth)
    this.add.text(panelX + 12, 82, 'THIS ATTEMPT ONLY', labelStyle(12, INK.dim)).setDepth(depth)
    const attempt = this.add
      .text(panelX + 12, 100, '', { ...labelStyle(13, INK.attempt), wordWrap: { width: 220 } })
      .setDepth(depth)

    const messageBg = this.add.rectangle(480, 164, 10, 10, 0x0b0912, 0.72).setDepth(depth).setVisible(false)
    const message = this.add
      .text(480, 152, '', { ...labelStyle(15, INK.text), align: 'center', wordWrap: { width: 640 } })
      .setOrigin(0.5, 0)
      .setShadow(2, 2, '#000', 0)
      .setDepth(depth)

    if (!TouchControls.isSupported(this)) {
      this.add
        .text(20, 84, '←/→ move   Space jump\nR restart   F forget   Esc map', { ...labelStyle(12, INK.dim), lineSpacing: 4 })
        .setDepth(depth)
    } else {
      const map = this.add.text(20, 84, 'map', labelStyle(14, INK.dim)).setDepth(depth).setInteractive({ useHandCursor: true })
      map.on('pointerdown', () => this.leave())
    }

    const banner = this.add
      .container(480, 248, [
        this.add.rectangle(0, 0, 460, 110, 0x0b0912, 0.85).setStrokeStyle(3, 0xffd27a),
        this.add.text(0, -18, 'ROOM CLEARED', labelStyle(36, INK.gold)).setOrigin(0.5).setShadow(3, 3, '#000', 0),
        this.add.text(0, 26, '', labelStyle(15, INK.text)).setOrigin(0.5),
      ])
      .setDepth(depth + 1)
      .setVisible(false)
    const plate = banner.getAt(0) as Phaser.GameObjects.Rectangle
    plate.setInteractive({ useHandCursor: true })
    plate.on('pointerdown', () => this.advance())

    this.hud = { attempts, memoryTitle, remembered, attempt, message, messageBg, banner }
  }

  private refreshHud(): void {
    this.hud.attempts.setText(`Attempt ${this.attempts}`)
    const slots = this.level.memorySlots
    this.hud.memoryTitle.setText(slots ? `ROOM MEMORY · ${this.memory.slotsUsed()}/${slots}` : 'ROOM MEMORY')
    const remembered = this.memory.rememberedIds().map((id) => `◆ ${this.block(id).name}`)
    const attempt = this.memory.attemptIds().map((id) => {
      const at = this.expiryAt.get(id)
      if (at === undefined) {
        return `▪ ${this.block(id).name}`
      }
      const seconds = Math.max(1, Math.ceil((at - this.time.now) / 1000))
      return `▪ ${this.block(id).name} ${seconds}s`
    })
    this.hud.remembered.setText(remembered.join('  ') || '· nothing yet').setColor(remembered.length ? INK.remembered : INK.dim)
    this.hud.attempt.setText(attempt.join('  ') || '· nothing').setColor(attempt.length ? INK.attempt : INK.dim)
  }

  private setMessage(text: string): void {
    this.message = text
    this.hud.message.setText(text).setAlpha(0)
    this.hud.messageBg
      .setPosition(480, this.hud.message.y + this.hud.message.height / 2)
      .setSize(this.hud.message.width + 28, this.hud.message.height + 10)
      .setVisible(true)
      .setAlpha(0)
    this.tweens.add({ targets: [this.hud.message, this.hud.messageBg], alpha: 1, duration: 220 })
  }

  private block(id: string): BlockDef {
    return blockById(this.level, id)
  }

  // -------------------------------------------------------------- physics

  private addSolid(rect: Rect): Phaser.GameObjects.Zone {
    const zone = this.add.zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height)
    this.physics.add.existing(zone, true)
    this.solids.add(zone)
    return zone
  }

  private addSensor(rect: Rect, onOverlap: () => void): void {
    const zone = this.add.zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height)
    this.physics.add.existing(zone, true)
    this.physics.add.overlap(this.player, zone, () => onOverlap())
  }
}

function textureFor(style: BlockStyle): string {
  switch (style) {
    case 'planks':
      return ART.planks
    case 'runestone':
      return ART.runestone
    case 'step':
      return ART.step
    case 'wall':
      return ART.step
  }
}
