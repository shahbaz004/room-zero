// Paste this whole file as the `expression` of a CDP Runtime.evaluate call (returnByValue: true).
// Installs window.__sim on a Phaser game exposed as window.__GAME__ (or window.__ROOM_ZERO__).
// Two modes:
//   manual (tab hidden, rAF frozen):  __sim.step(n), __sim.hold('right', frames)
//   real-time (rAF running):          await __sim.holdMs('right', ms), await __sim.wait(ms)
// Never call step() while the real loop is running; the two would fight over game time.
(() => {
  const game = window.__GAME__ || window.__ROOM_ZERO__
  if (!game) return 'no game global: expose the Phaser.Game as window.__GAME__ in dev'
  const codes = { left: 37, up: 38, right: 39, down: 40, space: 32, a: 65, d: 68, w: 87, r: 82, f: 70, e: 69, enter: 13 }
  const send = (type, name) => {
    const e = new KeyboardEvent(type, { bubbles: true, cancelable: true })
    Object.defineProperty(e, 'keyCode', { get: () => codes[name] })
    Object.defineProperty(e, 'which', { get: () => codes[name] })
    window.dispatchEvent(e)
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  let t = performance.now()
  window.__sim = {
    send,
    wait,
    step(n) {
      for (let i = 0; i < n; i++) {
        t += 1000 / 60
        game.step(t, 1000 / 60)
      }
    },
    hold(name, frames) {
      send('keydown', name)
      this.step(frames)
      send('keyup', name)
      this.step(1)
    },
    async holdMs(name, ms) {
      send('keydown', name)
      await wait(ms)
      send('keyup', name)
      await wait(80)
    },
    scene(key = 'Game') {
      return game.scene.getScene(key)
    },
    state(key = 'Game') {
      const s = this.scene(key)
      return s && s.getDebugState ? s.getDebugState() : null
    },
    async loopRunning() {
      const f0 = game.loop.frame
      await wait(300)
      return game.loop.frame !== f0
    },
    // In manual mode, step first so the WebGL buffer holds a fresh frame.
    shot(manual = true) {
      if (manual) this.step(1)
      return game.canvas.toDataURL('image/png')
    },
  }
  return JSON.stringify({
    installed: true,
    activeScenes: game.scene.getScenes(true).map((s) => s.sys.settings.key),
    frame: game.loop.frame,
  })
})()
