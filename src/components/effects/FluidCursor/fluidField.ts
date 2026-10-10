/**
 * A small "stable fluids" solver (Stam) on a coarse grid laid over the viewport.
 * Velocities are in CSS px/s, positions in CSS px. Each step:
 *   vorticity confinement → semi-Lagrangian advection → pressure projection
 *   (Jacobi) → dissipation.
 * The projection keeps the flow incompressible, so a push sheds swirls along its
 * edges instead of a plain blob; advection carries the wake on after the pointer
 * stops; dissipation lets it settle. Cheap enough for the CPU at ~5k cells, and
 * only stepped while something is moving.
 */
export type Window = { i0: number; i1: number; j0: number; j1: number }

export class FluidField {
  cols = 0
  rows = 0
  /** Velocity, px/s (row-major, `i + j * cols`). */
  u = new Float32Array(0)
  v = new Float32Array(0)
  private u0 = new Float32Array(0)
  private v0 = new Float32Array(0)
  private p = new Float32Array(0)
  private div = new Float32Array(0)
  private curl = new Float32Array(0)
  /** Cell window that holds any flow (inclusive); empty when i1 < i0. Only it is stepped. */
  private bounds = { i0: 1, i1: 0, j0: 1, j1: 0 }

  width = 0
  height = 0
  readonly cell: number

  constructor(width: number, height: number, cell: number) {
    this.cell = cell
    this.resize(width, height)
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.cols = Math.max(4, Math.ceil(width / this.cell))
    this.rows = Math.max(4, Math.ceil(height / this.cell))
    const n = this.cols * this.rows
    for (const key of ['u', 'v', 'u0', 'v0', 'p', 'div', 'curl'] as const) this[key] = new Float32Array(n)
  }

  clear() {
    this.u.fill(0)
    this.v.fill(0)
    this.p.fill(0)
    this.bounds = { i0: 1, i1: 0, j0: 1, j1: 0 }
  }

  /** True while any cell still carries flow. */
  get moving() {
    return this.bounds.i1 >= this.bounds.i0
  }

  /** The cell window holding all the flow (inclusive), or null at rest. */
  get window(): Readonly<Window> | null {
    return this.moving ? this.bounds : null
  }

  /**
   * Push the flow along a velocity around a point (px), Gaussian falloff of
   * `radius` px: each pass raises the flow's speed *along that direction* towards
   * the given speed, never beyond it (circling or lingering cannot build up) and
   * never brakes it — a slowing pointer leaves the wake it made to coast on.
   */
  splat(x: number, y: number, vx: number, vy: number, radius: number, blend: number) {
    const { cell, cols, rows, u, v } = this
    const reach = radius * 2
    const i0 = Math.max(1, Math.floor((x - reach) / cell))
    const i1 = Math.min(cols - 2, Math.ceil((x + reach) / cell))
    const j0 = Math.max(1, Math.floor((y - reach) / cell))
    const j1 = Math.min(rows - 2, Math.ceil((y + reach) / cell))
    const inv = 1 / (radius * radius)
    const speed = Math.hypot(vx, vy)
    if (speed < 1e-3) return
    const dx0 = vx / speed
    const dy0 = vy / speed
    this.include(i0, i1, j0, j1)
    for (let j = j0; j <= j1; j++) {
      const dy = (j + 0.5) * cell - y
      for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * cell - x
        const k = i + j * cols
        const along = u[k]! * dx0 + v[k]! * dy0
        if (along >= speed) continue
        const push = (speed - along) * Math.exp(-(dx * dx + dy * dy) * inv) * blend
        u[k] = u[k]! + dx0 * push
        v[k] = v[k]! + dy0 * push
      }
    }
  }

  /** `rest`: speed (px/s) below which a cell is treated as still and zeroed — keeps the window tight. */
  step(dt: number, vorticity: number, dissipation: number, iterations: number, rest: number) {
    if (!this.moving) return
    // Work on the flow's window plus a margin it can spread into this step.
    const pad = 3 + iterations
    const { cols, rows } = this
    const w = {
      i0: Math.max(1, this.bounds.i0 - pad),
      i1: Math.min(cols - 2, this.bounds.i1 + pad),
      j0: Math.max(1, this.bounds.j0 - pad),
      j1: Math.min(rows - 2, this.bounds.j1 + pad),
    }
    this.confine(dt, vorticity, w)
    this.advect(dt, w)
    this.project(iterations, w)

    // Dissipate, and shrink the window to what still moves.
    const fade = Math.exp(-dt * dissipation)
    const { u, v } = this
    this.bounds = { i0: cols, i1: -1, j0: rows, j1: -1 }
    for (let j = w.j0; j <= w.j1; j++) {
      for (let i = w.i0; i <= w.i1; i++) {
        const k = i + j * cols
        const a = u[k]! * fade
        const b = v[k]! * fade
        if (Math.abs(a) + Math.abs(b) < rest) {
          u[k] = v[k] = 0
          continue
        }
        u[k] = a
        v[k] = b
        this.include(i, i, j, j)
      }
    }
  }

  private include(i0: number, i1: number, j0: number, j1: number) {
    const b = this.bounds
    if (b.i1 < b.i0) {
      this.bounds = { i0, i1, j0, j1 }
      return
    }
    b.i0 = Math.min(b.i0, i0)
    b.i1 = Math.max(b.i1, i1)
    b.j0 = Math.min(b.j0, j0)
    b.j1 = Math.max(b.j1, j1)
  }

  /** Vorticity confinement: feeds the swirls back so they survive the coarse grid. */
  private confine(dt: number, strength: number, w: Window) {
    const { cols, rows, u, v, curl, cell } = this
    const h2 = 1 / (2 * cell)
    for (let j = w.j0; j <= w.j1; j++) {
      for (let i = w.i0; i <= w.i1; i++) {
        const k = i + j * cols
        curl[k] = (v[k + 1]! - v[k - 1]! - u[k + cols]! + u[k - cols]!) * h2
      }
    }
    // One cell inside the window: the gradient below reads curl only where it was just computed.
    for (let j = Math.max(2, w.j0 + 1); j <= Math.min(rows - 3, w.j1 - 1); j++) {
      for (let i = Math.max(2, w.i0 + 1); i <= Math.min(cols - 3, w.i1 - 1); i++) {
        const k = i + j * cols
        const nx = (Math.abs(curl[k + 1]!) - Math.abs(curl[k - 1]!)) * h2
        const ny = (Math.abs(curl[k + cols]!) - Math.abs(curl[k - cols]!)) * h2
        const len = Math.sqrt(nx * nx + ny * ny) + 1e-5
        const vort = curl[k]!
        u[k] = u[k]! + (ny / len) * vort * strength * cell * dt
        v[k] = v[k]! - (nx / len) * vort * strength * cell * dt
      }
    }
  }

  /** Semi-Lagrangian advection of the velocity by itself (bilinear back-trace). */
  private advect(dt: number, w: Window) {
    const { cols, rows, cell } = this
    this.u0.set(this.u)
    this.v0.set(this.v)
    const { u, v, u0, v0 } = this
    const scale = dt / cell
    for (let j = w.j0; j <= w.j1; j++) {
      for (let i = w.i0; i <= w.i1; i++) {
        const k = i + j * cols
        const x = Math.min(cols - 1.501, Math.max(0.5, i - u0[k]! * scale))
        const y = Math.min(rows - 1.501, Math.max(0.5, j - v0[k]! * scale))
        const xi = x | 0
        const yi = y | 0
        const fx = x - xi
        const fy = y - yi
        const a = xi + yi * cols
        const b = a + cols
        u[k] =
          (u0[a]! * (1 - fx) + u0[a + 1]! * fx) * (1 - fy) +
          (u0[b]! * (1 - fx) + u0[b + 1]! * fx) * fy
        v[k] =
          (v0[a]! * (1 - fx) + v0[a + 1]! * fx) * (1 - fy) +
          (v0[b]! * (1 - fx) + v0[b + 1]! * fx) * fy
      }
    }
    this.closeBoundary()
  }

  /** Remove divergence: solve ∇²p = ∇·u (Jacobi), then u −= ∇p. */
  private project(iterations: number, w: Window) {
    const { cols, u, v, p, div, cell } = this
    const h2 = 1 / (2 * cell)
    for (let j = w.j0; j <= w.j1; j++) {
      for (let i = w.i0; i <= w.i1; i++) {
        const k = i + j * cols
        div[k] = (u[k + 1]! - u[k - 1]! + v[k + cols]! - v[k - cols]!) * h2
      }
    }
    const c2 = cell * cell
    p.fill(0)
    for (let it = 0; it < iterations; it++) {
      for (let j = w.j0; j <= w.j1; j++) {
        for (let i = w.i0; i <= w.i1; i++) {
          const k = i + j * cols
          p[k] = (p[k - 1]! + p[k + 1]! + p[k - cols]! + p[k + cols]! - div[k]! * c2) * 0.25
        }
      }
    }
    for (let j = w.j0; j <= w.j1; j++) {
      for (let i = w.i0; i <= w.i1; i++) {
        const k = i + j * cols
        u[k] = u[k]! - (p[k + 1]! - p[k - 1]!) * h2
        v[k] = v[k]! - (p[k + cols]! - p[k - cols]!) * h2
      }
    }
    this.closeBoundary()
  }

  /** The viewport edge is a wall: no flow through it. */
  private closeBoundary() {
    const { cols, rows, u, v } = this
    for (let i = 0; i < cols; i++) {
      u[i] = v[i] = 0
      u[i + (rows - 1) * cols] = v[i + (rows - 1) * cols] = 0
    }
    for (let j = 0; j < rows; j++) {
      u[j * cols] = v[j * cols] = 0
      u[cols - 1 + j * cols] = v[cols - 1 + j * cols] = 0
    }
  }
}
