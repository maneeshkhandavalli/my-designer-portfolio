import { useEffect, useRef } from 'react'
import { FluidField } from '@/components/effects/FluidCursor/fluidField'
import { useInView } from '@/hooks/useInView'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { holdFluidCursor } from '@/lib/fluidHold'
import { gsap } from '@/lib/gsap'

/**
 * Fluid Surface, inside a box. The site-wide cursor (effects/FluidCursor) is bound to
 * the viewport — a fixed layer, a viewport-sized field, a window pointer listener and a
 * single SVG filter — so it is not reused here; a second copy of its filter would also
 * bend this panel twice. While the pointer is on the panel the site-wide field is held
 * still (lib/fluidHold → FluidCursor's `paused`), so only this one moves here. What is reused is its solver, `FluidField`, on a grid the size
 * of this panel (walls at its edges), drawn directly with Canvas 2D: a lattice of short
 * marks that lean, stretch and drift with the flow; the fastest turn crimson.
 *
 * Cost: nothing runs at rest. The pointer (or one short scripted stroke when the panel
 * first comes into view) starts the GSAP ticker; once the flow has settled the last
 * frame stays on the canvas and the ticker is released. ~1.5k marks in four batched
 * strokes per frame. Reduced motion: the still lattice only, no interaction.
 */

const CELL = 16 // px — fluid grid cell (as site-wide)
const PITCH = 22 // px — spacing of the marks
const FOLLOW = 9 // 1/s — the stirring point trails the pointer
const RADIUS = 38 // px — stirred stroke width …
const RADIUS_SPEED = 0.014 // … widened by speed (px per px/s)
const RADIUS_MAX = 70
const BLEND = 0.42
const VORTICITY = 9
const DISSIPATION = 1.6 // 1/s — settles over ~1s
const ITERATIONS = 6
const STILL = 12 // px/s — below this a cell is still
const MARK = 7 // px — a mark's length at rest …
const STRETCH = 0.018 // … plus this per px/s of flow
const MARK_MAX = 34
const CARRY = 0.012 // s — marks drift with the flow (px per px/s) …
const CARRY_MAX = 14 // … up to this
const TURN = 220 // px/s — flow at which a mark has fully turned into it
const BUCKETS = [30, 200, 560] as const // px/s — colour steps: line → muted → white → crimson
const DPR_MAX = 1.5
const DEMO = 1.2 // s — the scripted stroke

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function FluidSurfacePreview() {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const demoRef = useRef<(() => void) | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const inView = useInView(boxRef, '-20% 0px')

  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!box || !canvas || !ctx) return

    const root = getComputedStyle(document.documentElement)
    const colours = ['--color-line', '--color-muted', '--color-foreground', '--color-accent'].map(
      (name) => root.getPropertyValue(name).trim() || '#888',
    )

    let width = 0
    let height = 0
    let dpr = 1
    const field = new FluidField(1, 1, CELL)
    const pointer = { x: 0, y: 0 }
    const stir = { x: 0, y: 0 }
    let started = false
    let running = false
    let demo = -1 // seconds into the scripted stroke; < 0 when none

    const draw = () => {
      const { cols, rows, u, v } = field
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const paths = colours.map(() => new Path2D())
      const nx = Math.floor(width / PITCH)
      const ny = Math.floor(height / PITCH)
      const ox = (width - (nx - 1) * PITCH) / 2
      const oy = (height - (ny - 1) * PITCH) / 2
      for (let b = 0; b < ny; b++) {
        const y = oy + b * PITCH
        const gy = y / CELL - 0.5
        const j = clamp(Math.floor(gy), 0, rows - 2)
        const fy = clamp(gy - j, 0, 1)
        for (let a = 0; a < nx; a++) {
          const x = ox + a * PITCH
          // Bilinear flow under the mark.
          const gx = x / CELL - 0.5
          const i = clamp(Math.floor(gx), 0, cols - 2)
          const fx = clamp(gx - i, 0, 1)
          const k = i + j * cols
          const ut = u[k]! + (u[k + 1]! - u[k]!) * fx
          const ub = u[k + cols]! + (u[k + cols + 1]! - u[k + cols]!) * fx
          const vt = v[k]! + (v[k + 1]! - v[k]!) * fx
          const vb = v[k + cols]! + (v[k + cols + 1]! - v[k + cols]!) * fx
          const fu = ut + (ub - ut) * fy
          const fv = vt + (vb - vt) * fy
          const speed = Math.sqrt(fu * fu + fv * fv)

          // A mark is a line, not an arrow: lean from horizontal into the flow's axis.
          let dx = 1
          let dy = 0
          let cx = x
          let cy = y
          let len = MARK
          if (speed > 1) {
            const sign = fu < 0 ? -1 : 1
            const t = Math.min(1, speed / TURN)
            dx = 1 + ((fu / speed) * sign - 1) * t
            dy = ((fv / speed) * sign) * t
            const n = Math.sqrt(dx * dx + dy * dy) || 1
            dx /= n
            dy /= n
            len = Math.min(MARK_MAX, MARK + speed * STRETCH)
            const carry = Math.min(CARRY_MAX, speed * CARRY) / speed
            cx += fu * carry
            cy += fv * carry
          }
          const bucket = speed < BUCKETS[0] ? 0 : speed < BUCKETS[1] ? 1 : speed < BUCKETS[2] ? 2 : 3
          const path = paths[bucket]!
          path.moveTo(cx - (dx * len) / 2, cy - (dy * len) / 2)
          path.lineTo(cx + (dx * len) / 2, cy + (dy * len) / 2)
        }
      }
      ctx.lineWidth = 1
      paths.forEach((path, index) => {
        ctx.strokeStyle = colours[index]!
        ctx.stroke(path)
      })
    }

    const stop = () => {
      if (!running) return
      running = false
      gsap.ticker.remove(tick)
    }

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000
      if (dt <= 0) return
      if (demo >= 0) {
        // One unhurried S-stroke across the middle, then the flow coasts and settles.
        demo += dt
        const p = Math.min(1, demo / DEMO)
        const e = p * p * (3 - 2 * p)
        pointer.x = width * (0.14 + 0.72 * e)
        pointer.y = height * (0.5 + 0.18 * Math.sin(e * Math.PI * 2))
        if (p >= 1) demo = -1
      }

      const k = 1 - Math.exp(-FOLLOW * dt)
      const px = stir.x
      const py = stir.y
      stir.x += (pointer.x - stir.x) * k
      stir.y += (pointer.y - stir.y) * k
      const mx = stir.x - px
      const my = stir.y - py
      const dist = Math.hypot(mx, my)
      if (dist > 0.05) {
        const vx = mx / dt
        const vy = my / dt
        const radius = Math.min(RADIUS_MAX, RADIUS + Math.hypot(vx, vy) * RADIUS_SPEED)
        const steps = Math.max(1, Math.ceil(dist / (radius * 0.4)))
        for (let s = 1; s <= steps; s++) {
          const t = s / steps
          field.splat(px + mx * t, py + my * t, vx, vy, radius, BLEND)
        }
      }
      field.step(dt, VORTICITY, DISSIPATION, ITERATIONS, STILL)
      draw()

      // Settled: keep the last (still) frame, release the ticker.
      if (demo < 0 && !field.moving && Math.hypot(pointer.x - stir.x, pointer.y - stir.y) < 0.5) {
        field.clear()
        draw()
        stop()
      }
    }

    const start = () => {
      if (running) return
      running = true
      gsap.ticker.add(tick)
    }

    const resize = () => {
      const rect = box.getBoundingClientRect()
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      dpr = Math.min(devicePixelRatio || 1, DPR_MAX)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      field.resize(width, height)
      field.clear()
      started = false
      demo = -1
      stop()
      draw()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    resize()

    if (reducedMotion) {
      demoRef.current = null
      return () => observer.disconnect()
    }

    const onMove = (event: PointerEvent) => {
      const rect = box.getBoundingClientRect()
      pointer.x = clamp(event.clientX - rect.left, 0, width)
      pointer.y = clamp(event.clientY - rect.top, 0, height)
      demo = -1
      if (!started) {
        started = true
        stir.x = pointer.x
        stir.y = pointer.y
      }
      start()
    }
    // A new touch (or re-entry) starts where it lands, without a streak from the last point.
    // While the pointer is on the panel the site-wide field rests: the two never stack.
    const onEnter = (event: PointerEvent) => {
      started = false
      if (event.pointerType === 'mouse') holdFluidCursor(true)
    }
    const onLeave = () => holdFluidCursor(false)

    demoRef.current = () => {
      pointer.x = width * 0.14
      pointer.y = height * 0.5
      stir.x = pointer.x
      stir.y = pointer.y
      started = true
      demo = 0
      start()
    }

    box.addEventListener('pointermove', onMove, { passive: true })
    box.addEventListener('pointerdown', onEnter)
    box.addEventListener('pointerenter', onEnter)
    box.addEventListener('pointerleave', onLeave)
    return () => {
      demoRef.current = null
      observer.disconnect()
      box.removeEventListener('pointermove', onMove)
      box.removeEventListener('pointerdown', onEnter)
      box.removeEventListener('pointerenter', onEnter)
      box.removeEventListener('pointerleave', onLeave)
      holdFluidCursor(false)
      stop()
    }
  }, [reducedMotion])

  // The first time the panel is properly in view, one scripted stroke shows it is alive.
  const demoed = useRef(false)
  useEffect(() => {
    if (!inView || demoed.current || reducedMotion) return
    demoed.current = true
    demoRef.current?.()
  }, [inView, reducedMotion])

  const hint = reducedMotion
    ? 'Motion is reduced — the surface stays still'
    : finePointer
      ? 'Move across the panel to stir it'
      : 'Drag sideways across the panel to stir it'

  return (
    <div ref={boxRef} className="absolute inset-0 touch-pan-y select-none">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <div className="label pointer-events-none absolute inset-x-[5%] top-[5%] flex justify-between gap-6 text-muted">
        <span>Fluid Surface</span>
        <span>16 px grid · Canvas 2D</span>
      </div>
      <p className="label pointer-events-none absolute bottom-[5%] left-[5%] text-foreground">{hint}</p>
    </div>
  )
}
