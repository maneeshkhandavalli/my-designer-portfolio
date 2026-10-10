import { Fragment, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { gsap } from '@/lib/gsap'
import { FluidField } from './fluidField'

/**
 * Site-wide fluid disturbance — the page is the surface, the pointer stirs it.
 * There is no cursor object: what you see is the real, live page (text, Hero
 * canvas, the 3D star) displaced by a simulated flow, with a thin RGB fringe.
 *
 * Two halves:
 *  - the flow is a real fluid (`FluidField`: advection, pressure projection,
 *    vorticity confinement, dissipation) on a 16px grid over the viewport. A
 *    lagged pointer paints its velocity along its path, so the wake trails it,
 *    swirls, keeps drifting after the pointer stops, then settles.
 *  - the page is displaced by the browser, not by WebGL: WebGL cannot read the
 *    rendered DOM, so a canvas shader could only paint *over* the page. Instead
 *    `backdrop-filter: url(#svg-filter)` re-samples the live backdrop: the flow is
 *    encoded as a small displacement image (R = x, G = y) and the live page is
 *    sampled three times — R, G, B at slightly different strengths — so edges pick
 *    up a restrained prismatic fringe.
 *
 * Cost model (measured on integrated graphics): every filter primitive is a full-
 * resolution GPU pass over the region, and Chromium evaluates the filter as a *tree*
 * — a result read by three branches is computed three times. So the filter is kept to
 * its minimum (per channel: one <feImage>, one displacement; then the channel mix) and
 * everything else is done on the CPU into the map: bilinear upsampling (8px), the soft
 * floor and cap, and the fine liquid ripple. An in-filter blur + noise ripple read by
 * the three samples cost ~3× their single price and halved the frame rate.
 *
 * The <feImage> map is a data URL decoded before it is swapped in (an undecoded
 * href renders nothing for a frame). The filter region follows the disturbed area
 * only; at rest the filter is removed and nothing is simulated (zero cost).
 * Chromium only (the only engine with `backdrop-filter: url()`); disabled for
 * touch / coarse pointers and reduced motion. The native cursor stays visible.
 */

const CELL = 16 // px — fluid grid cell
const FOLLOW = 9 // 1/s — how quickly the stirring point catches up with the pointer (the lag)
const RADIUS = 46 // px — width of the stirred stroke …
const RADIUS_SPEED = 0.018 // … widened by pointer speed (px per px/s)
const RADIUS_MAX = 84
const BLEND = 0.42 // how far one pass pulls the flow towards the pointer's velocity
const VORTICITY = 9 // swirl feedback
const DISSIPATION = 1.6 // 1/s — the wake settles over ~1s
const ITERATIONS = 6 // pressure solve — few on purpose: keeps the swirl local to the stroke
const STILL = 12 // px/s — flow below this (≈0.2px of shift) is treated as still
const GAIN = 0.018 // s — displacement (px) per unit of flow (px/s)
const MAX_SHIFT = 24 // px — displacement cap (small text stays legible as the wake passes)
const SCALE = 60 // px — feDisplacementMap scale (covers ±MAX_SHIFT with headroom)
const CHROMA = 0.08 // R / B strength offset vs G → fringe ≈ 2·CHROMA·shift (≤ ~4px)
const FRINGE = 0.6 // share of the split image; the rest is the centre sample (keeps text legible)
const SUB = 2 // map pixels per fluid cell (8px): the ripple's grain lives in the map, not in the filter
const RIPPLE = 6 // px — fine liquid ripple riding on the flow, at full strength
const RIPPLE_CELL = 22 // px — ripple grain (noise lattice spacing)
const RIPPLE_DRIFT = [11, -7] as const // px/s — the ripple slides slowly, so it reads as liquid
const FLOOR = 0.6 // px — drift below this is dropped (no far-field shimmer) …
const FLOOR_SOFT = 1.6 // px — … and eased back in up to this
const REST = 0.35 // px — below this everywhere, the field is at rest
const MARGIN = 64 // px — filter region beyond the disturbed area (no seam where filtering stops)
const CHANNELS = [
  ['R', 1 + CHROMA],
  ['G', 1],
  ['B', 1 - CHROMA],
] as const

function supportsBackdropSvgFilter(): boolean {
  const ua = navigator.userAgent
  if ((/Safari/.test(ua) && !/Chrome/.test(ua)) || /Firefox/.test(ua)) return false
  return CSS.supports('backdrop-filter', 'url(#a)')
}

type FluidCursorProps = {
  /** While true (e.g. the menu covers the page) the surface is left still. */
  paused?: boolean
}

export function FluidCursor({ paused = false }: FluidCursorProps) {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const reducedMotion = usePrefersReducedMotion()
  const [supported] = useState(supportsBackdropSvgFilter)
  return finePointer && !reducedMotion && supported ? <Field paused={paused} /> : null
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Smooth value noise on a wrapping 64² lattice, two independent channels in [−1, 1]. */
const LATTICE = 64
const lattice = Float32Array.from({ length: LATTICE * LATTICE * 2 }, () => Math.random() * 2 - 1)
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

type Axis = { gi: Int32Array; gf: Float32Array; ni: Int32Array; nf: Float32Array }
const makeAxis = (n: number): Axis => ({
  gi: new Int32Array(n),
  gf: new Float32Array(n),
  ni: new Int32Array(n),
  nf: new Float32Array(n),
})

function Field({ paused }: { paused: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  const filterRef = useRef<SVGFilterElement>(null)
  const mapRefs = useRef<(SVGFEImageElement | null)[]>([])
  const filterId = 'fluid-field'

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const box = boxRef.current
    const filter = filterRef.current
    const maps = mapRefs.current.filter((el): el is SVGFEImageElement => el !== null)
    if (!box || !filter || maps.length !== CHANNELS.length) return

    const field = new FluidField(innerWidth, innerHeight, CELL)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    let image: ImageData | null = null // the map, cropped to the disturbed window
    let cols = makeAxis(0) // per-column sampling tables (reused while the size holds) …
    let rows = makeAxis(0) // … and per row

    const pointer = { x: 0, y: 0 }
    const stir = { x: 0, y: 0 } // lagged point that actually pushes the fluid
    let started = false
    let simulating = false
    let active = false
    let decoding = false
    let alive = true
    // Bumped whenever the surface is stopped or reset: a map still decoding from before must
    // not switch the filter back on afterwards (it would freeze a stale distortion on screen).
    let generation = 0
    let time = 0

    const setActive = (on: boolean) => {
      if (!on) generation++
      if (on === active) return
      active = on
      box.style.backdropFilter = on ? `url(#${filterId})` : 'none'
      box.style.visibility = on ? 'visible' : 'hidden'
    }

    const resize = () => {
      field.resize(innerWidth, innerHeight)
      setActive(false)
      simulating = false
    }
    resize()

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      if (pausedRef.current) {
        started = false // resume from wherever the pointer is then, without a streak
        return
      }
      pointer.x = event.clientX
      pointer.y = event.clientY
      if (!started) {
        started = true
        stir.x = pointer.x
        stir.y = pointer.y
      }
      simulating = true
    }

    // Decode the map, then swap it in together with the region it covers (an undecoded
    // href renders nothing for a frame). One map in flight at a time.
    const pushMap = (pixels: ImageData, region: { x: number; y: number; w: number; h: number }) => {
      if (decoding) return
      if (canvas.width !== pixels.width || canvas.height !== pixels.height) {
        canvas.width = pixels.width
        canvas.height = pixels.height
      }
      ctx.putImageData(pixels, 0, 0)
      const url = canvas.toDataURL('image/png')
      const decoder = new Image()
      decoder.src = url
      decoding = true
      const issued = generation
      void decoder
        .decode()
        .catch(() => undefined)
        .then(() => {
          decoding = false
          if (!alive || pausedRef.current || issued !== generation) return
          // Each sample reads its own copy of the map (a cheap texture draw), so nothing
          // upstream of the displacement is shared — and recomputed — across branches.
          for (const el of [...maps, filter]) {
            if (el !== filter) el.setAttribute('href', url)
            el.setAttribute('x', String(region.x))
            el.setAttribute('y', String(region.y))
            el.setAttribute('width', String(region.w))
            el.setAttribute('height', String(region.h))
          }
          setActive(true)
        })
    }

    const tick = (_time: number, deltaMs: number) => {
      if (!simulating) return
      if (pausedRef.current) {
        // Still surface: drop the flow; the next stroke starts where the pointer then is.
        setActive(false)
        field.clear()
        simulating = false
        started = false
        return
      }
      const dt = Math.min(deltaMs, 50) / 1000

      // The stirring point trails the pointer; its own velocity is what it paints.
      const k = 1 - Math.exp(-FOLLOW * dt)
      const px = stir.x
      const py = stir.y
      stir.x += (pointer.x - stir.x) * k
      stir.y += (pointer.y - stir.y) * k
      const mx = stir.x - px
      const my = stir.y - py
      const dist = Math.hypot(mx, my)
      if (dist > 0.05 && dt > 0) {
        const vx = mx / dt
        const vy = my / dt
        const radius = Math.min(RADIUS_MAX, RADIUS + Math.hypot(vx, vy) * RADIUS_SPEED)
        // Paint the whole segment, so a fast stroke leaves a continuous wake.
        const steps = Math.max(1, Math.ceil(dist / (radius * 0.4)))
        for (let s = 1; s <= steps; s++) {
          const t = s / steps
          field.splat(px + mx * t, py + my * t, vx, vy, radius, BLEND)
        }
      }

      field.step(dt, VORTICITY, DISSIPATION, ITERATIONS, STILL)
      time += dt

      // At rest: drop the filter, stop simulating until the next move.
      const rest = () => {
        setActive(false)
        if (Math.hypot(pointer.x - stir.x, pointer.y - stir.y) < 0.5) {
          simulating = false
          field.clear()
        }
      }
      const win = field.window
      if (!win) return rest()

      // Displacement map (R = x, G = y around 128) for the flow's window plus a margin,
      // quantised so the buffer is rarely reallocated; SUB map pixels per fluid cell.
      const { cols: gridCols, rows: gridRows, u, v } = field
      const pad = Math.ceil(MARGIN / CELL)
      const ci0 = Math.max(0, Math.floor((win.i0 - pad) / 4) * 4)
      const cj0 = Math.max(0, Math.floor((win.j0 - pad) / 4) * 4)
      const ci1 = Math.min(gridCols - 1, Math.ceil((win.i1 + pad + 1) / 4) * 4 - 1)
      const cj1 = Math.min(gridRows - 1, Math.ceil((win.j1 + pad + 1) / 4) * 4 - 1)
      const cw = ci1 - ci0 + 1
      const ch = cj1 - cj0 + 1
      const mw = cw * SUB
      const mh = ch * SUB
      if (!image || image.width !== mw || image.height !== mh) {
        image = new ImageData(mw, mh)
        cols = makeAxis(mw)
        rows = makeAxis(mh)
      }
      // Per column / per row: the grid cell + bilinear weight, and the ripple lattice + fade.
      const step = CELL / SUB
      const prepare = (out: Axis, n: number, origin: number, cells: number, drift: number) => {
        for (let a = 0; a < n; a++) {
          const screen = origin * CELL + (a + 0.5) * step
          const g = screen / CELL - 0.5
          const gi = clamp(Math.floor(g), 0, cells - 2)
          out.gi[a] = gi
          out.gf[a] = clamp(g - gi, 0, 1)
          const r = (screen + drift) / RIPPLE_CELL
          const ri = Math.floor(r)
          out.ni[a] = ri
          out.nf[a] = fade(r - ri)
        }
      }
      prepare(cols, mw, ci0, gridCols, time * RIPPLE_DRIFT[0])
      prepare(rows, mh, cj0, gridRows, time * RIPPLE_DRIFT[1])
      const M = LATTICE - 1
      const data = image.data
      let peak = 0
      let o = 0
      for (let y = 0; y < mh; y++) {
        const row = rows.gi[y]! * gridCols
        const fy = rows.gf[y]!
        const ny0 = (rows.ni[y]! & M) * LATTICE
        const ny1 = ((rows.ni[y]! + 1) & M) * LATTICE
        const nfy = rows.nf[y]!
        for (let x = 0; x < mw; x++, o += 4) {
          // Bilinear flow (feImage upscales the map bilinearly too: no in-filter blur needed).
          const c = row + cols.gi[x]!
          const fx = cols.gf[x]!
          const ut = u[c]! + (u[c + 1]! - u[c]!) * fx
          const ub = u[c + gridCols]! + (u[c + gridCols + 1]! - u[c + gridCols]!) * fx
          const vt = v[c]! + (v[c + 1]! - v[c]!) * fx
          const vb = v[c + gridCols]! + (v[c + gridCols + 1]! - v[c + gridCols]!) * fx
          // Sample from behind the flow → the content is carried along with it.
          let sx = -(ut + (ub - ut) * fy) * GAIN
          let sy = -(vt + (vb - vt) * fy) * GAIN
          const raw = Math.sqrt(sx * sx + sy * sy) // (Math.hypot is several times slower in this loop)
          if (raw <= FLOOR) {
            // Below the floor: no shift, no ripple (most of the window).
            data[o] = 128
            data[o + 1] = 128
            data[o + 2] = 0
            data[o + 3] = 255
            continue
          }
          // Soft floor (smoothstep) — the faint far-field of the pressure solve stays still —
          // and a hard cap on the core.
          const t = Math.min(1, (raw - FLOOR) / (FLOOR_SOFT - FLOOR))
          const keep = (t * t * (3 - 2 * t) * Math.min(raw, MAX_SHIFT)) / raw
          const mag = raw * keep
          if (mag > peak) peak = mag
          sx *= keep
          sy *= keep
          {
            // Fine liquid ripple riding on the flow, scaled by its strength.
            const nx0 = cols.ni[x]! & M
            const nx1 = (cols.ni[x]! + 1) & M
            const nfx = cols.nf[x]!
            const a = (ny0 + nx0) * 2
            const b = (ny0 + nx1) * 2
            const d = (ny1 + nx0) * 2
            const e = (ny1 + nx1) * 2
            const topX = lattice[a]! + (lattice[b]! - lattice[a]!) * nfx
            const bottomX = lattice[d]! + (lattice[e]! - lattice[d]!) * nfx
            const topY = lattice[a + 1]! + (lattice[b + 1]! - lattice[a + 1]!) * nfx
            const bottomY = lattice[d + 1]! + (lattice[e + 1]! - lattice[d + 1]!) * nfx
            const ripple = (RIPPLE * mag) / MAX_SHIFT
            sx += (topX + (bottomX - topX) * nfy) * ripple
            sy += (topY + (bottomY - topY) * nfy) * ripple
          }
          data[o] = clamp(Math.round(128 + (sx / SCALE) * 255), 0, 255)
          data[o + 1] = clamp(Math.round(128 + (sy / SCALE) * 255), 0, 255)
          data[o + 2] = 0
          data[o + 3] = 255
        }
      }
      if (peak < REST) return rest()
      pushMap(image, { x: ci0 * CELL, y: cj0 * CELL, w: cw * CELL, h: ch * CELL })
    }

    // Hidden tab: the ticker stops; on return the stirring point jumps rather than streaks.
    const onVisibility = () => {
      if (document.hidden) return
      stir.x = pointer.x
      stir.y = pointer.y
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    gsap.ticker.add(tick)
    return () => {
      alive = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      gsap.ticker.remove(tick)
    }
  }, [])

  const strength = (factor: number) => (SCALE * factor).toFixed(2)

  return (
    // Layering is the boundary: a backdrop-filter only bends what is painted *beneath* it.
    // At z-44 the field sits above all content (and the menu overlay, z-40) but below the
    // navbar (z-45) and the frame (z-50), so the outer architecture stays crisp on top —
    // no mask, no edge: content under the transparent navbar still flows behind it.
    <div
      ref={boxRef}
      aria-hidden="true"
      className="pointer-events-none invisible fixed inset-0 z-44"
    >
      <svg width="0" height="0" className="absolute">
        <filter
          ref={filterRef}
          id={filterId}
          x="0"
          y="0"
          width="0"
          height="0"
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          {/* Per channel: its own copy of the map → one sample of the live page (red a touch
              further, blue a touch shorter). No primitive is read by more than one branch. */}
          {CHANNELS.map(([channel, factor], index) => (
            <Fragment key={channel}>
              <feImage
                ref={(el) => {
                  mapRefs.current[index] = el
                }}
                x="0"
                y="0"
                preserveAspectRatio="none"
                result={`map${channel}`}
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2={`map${channel}`}
                scale={strength(factor)}
                xChannelSelector="R"
                yChannelSelector="G"
                result={`d${channel}`}
              />
            </Fragment>
          ))}
          {/* Fringe, not three copies: each channel keeps part of the centre sample, so glyph
              shapes hold (small text included) and the colour reads as an edge bleed. */}
          <feColorMatrix in="dR" type="matrix" values={`${FRINGE} 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0`} result="xR" />
          <feColorMatrix in="dG" type="matrix" values={`${1 - FRINGE} 0 0 0 0  0 1 0 0 0  0 0 ${1 - FRINGE} 0 0  0 0 0 1 0`} result="xG" />
          <feColorMatrix in="dB" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 ${FRINGE} 0 0  0 0 0 1 0`} result="xB" />
          <feComposite in="xR" in2="xG" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="xRG" />
          <feComposite in="xRG" in2="xB" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
        </filter>
      </svg>
    </div>
  )
}
