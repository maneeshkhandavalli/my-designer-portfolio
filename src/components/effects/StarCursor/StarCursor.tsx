import { useEffect, useRef } from 'react'
import { StarMark } from '@/components/navigation/StarMark'
import { useIntroReady } from '@/hooks/useIntroReady'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { gsap } from '@/lib/gsap'

/**
 * The navbar star, detached: when the mouse starts moving, the logo star (`[data-star-home]`
 * in SiteNav) lifts off, flies to the pointer and follows it; when the pointer rests, leaves
 * the window or the page is covered (menu, a contained fluid experiment), it flies back and
 * docks on the logo's *current* position. The logo keeps its place in the layout throughout —
 * it is only hidden (visibility) while its double is out.
 *
 * Motion is one damped spring per property (position, rotation, scale) on the shared GSAP
 * ticker, so any change of target — takeoff, follow, return, moving again mid-return —
 * keeps the current velocity: nothing snaps. Position eases in from rest (critically
 * damped, no bounce); it starts slack for the flight and tightens as it follows. Each
 * takeoff and return turns the star 60° — one sixth of a turn, so it lands on exactly the
 * logo's silhouette — plus a slight lean into horizontal motion. A crimson echo, a second
 * copy that lags behind, shows only at speed (short, no particles, no glow).
 *
 * Two small fixed SVGs, transform-only, pointer-events: none (never blocks a click, hover
 * or text selection). Above the fluid layer (z-44) and the navbar (z-45), below the frame
 * (z-50), so it stays crisp and the frame's matte still clips it. Tone: the logo's ink
 * (`--color-chrome`), switched to ink over light sections (`section.bg-canvas`, footer) and
 * to white over dark ones when the two meet in the viewport.
 *
 * The ticker runs only while the star is away from the logo; at home it costs nothing.
 * Mouse only, wide screens only (fine hover pointer, ≥ 48rem); off with reduced motion.
 */

const FOLLOW_SCALE = 0.62 // size while following, relative to the logo (keeps what's under the pointer readable)
const IDLE = 1400 // ms without pointer movement before the star flies home
const TAKEOFF_MIN = 4 // px of real movement before it lifts off
const OMEGA_FLIGHT = 10 // rad/s — position spring at takeoff: a ~0.4s flight …
const OMEGA_FOLLOW = 24 // … tightening to this while following (responsive, still a touch of inertia)
const OMEGA_TIGHTEN = 3 // 1/s — how quickly it tightens
const OMEGA_RETURN = 9 // rad/s — the flight home (critically damped: lands without overshoot)
const OMEGA_TURN = 9 // rad/s — rotation spring
const OMEGA_SCALE = 12 // rad/s — scale spring
const LEAN = 0.005 // deg of lean per px/s of horizontal speed …
const LEAN_MAX = 12 // … capped (deg)
const TURN = 60 // deg per takeoff / return: the star's symmetry, so every landing matches the logo
const ECHO_FOLLOW = 16 // 1/s — how closely the echo trails the star
const ECHO_SPEED = [700, 4200] as const // px/s — the echo fades in across this speed range …
const ECHO_OPACITY = 0.5 // … up to this
const HOME_HIT = 10 // px around the logo that count as "on the logo" (the star docks there)
const MAX_DT = 1 / 30 // s — longer frames are clamped (tab switches, hitches)
const SUBSTEP = 1 / 120 // s — integration step, stable at the stiffest spring

type Spring = { value: number; velocity: number }
const spring = (value = 0): Spring => ({ value, velocity: 0 })

/** Damped spring towards `target` (semi-implicit Euler, fixed substeps). ζ = 1: no overshoot. */
function stepSpring(s: Spring, target: number, omega: number, dt: number) {
  for (let left = dt; left > 1e-6; left -= SUBSTEP) {
    const h = Math.min(SUBSTEP, left)
    s.velocity += (omega * omega * (target - s.value) - 2 * omega * s.velocity) * h
    s.value += s.velocity * h
  }
}

export function StarCursor({ paused = false }: { paused?: boolean }) {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine) and (min-width: 48rem)')
  const reducedMotion = usePrefersReducedMotion()
  const introReady = useIntroReady()
  return finePointer && !reducedMotion && introReady ? <Flyer paused={paused} /> : null
}

function Flyer({ paused }: { paused: boolean }) {
  const starRef = useRef<SVGSVGElement>(null)
  const echoRef = useRef<SVGSVGElement>(null)
  const pausedRef = useRef(paused)
  const recallRef = useRef<() => void>(() => {})

  useEffect(() => {
    pausedRef.current = paused
    if (paused) recallRef.current()
  }, [paused])

  useEffect(() => {
    const star = starRef.current
    const echo = echoRef.current
    const home = document.querySelector<SVGSVGElement>('[data-star-home]')
    const header = home?.closest('header')
    if (!star || !echo || !home || !header) return
    const homeBox = home.parentElement ?? home // unrotated box (the logo turns on hover)
    const lightSurfaces = () => document.querySelectorAll<HTMLElement>('section.bg-canvas, footer.bg-canvas')

    type Mode = 'home' | 'out' | 'returning'
    let mode: Mode = 'home'
    let running = false
    const pointer = { x: 0, y: 0, seen: false, moved: 0, last: 0 }
    const x = spring()
    const y = spring()
    const turn = spring()
    const scale = spring(1)
    const echoPos = { x: 0, y: 0 }
    let turns = 0
    let omega = OMEGA_FLIGHT
    let size = { w: 0, h: 0 }
    let tone = ''

    const measureHome = () => {
      const box = homeBox.getBoundingClientRect()
      return { x: box.left + box.width / 2, y: box.top + box.height / 2, w: box.width, h: box.height }
    }

    const setSize = (w: number, h: number) => {
      if (Math.abs(w - size.w) < 0.1 && Math.abs(h - size.h) < 0.1) return
      size = { w, h }
      for (const el of [star, echo]) {
        el.style.width = `${w}px`
        el.style.height = `${h}px`
      }
    }

    const chromeTone = () => (document.documentElement.dataset.chrome === 'light' ? 'ink' : 'light')
    // Ink over a light section, white over a dark one; elsewhere the logo's own tone.
    const toneAt = (px: number, py: number) => {
      let lightInView = false
      for (const surface of lightSurfaces()) {
        const box = surface.getBoundingClientRect()
        if (box.bottom <= 0 || box.top >= innerHeight) continue
        if (py >= box.top && py < box.bottom && px >= box.left && px < box.right) return 'ink'
        lightInView = true
      }
      return lightInView ? 'light' : chromeTone()
    }
    const setTone = (next: string) => {
      if (next === tone) return
      tone = next
      star.dataset.tone = next
    }

    const show = (on: boolean) => {
      star.style.visibility = on ? 'visible' : 'hidden'
      echo.style.visibility = on ? 'visible' : 'hidden'
      home.style.visibility = on ? 'hidden' : ''
    }

    const render = () => {
      const lean = gsap.utils.clamp(-LEAN_MAX, LEAN_MAX, x.velocity * LEAN)
      const s = scale.value
      star.style.transform = `translate3d(${x.value - size.w / 2}px, ${y.value - size.h / 2}px, 0) rotate(${turn.value + lean}deg) scale(${s})`
      const speed = Math.hypot(x.velocity, y.velocity)
      const t = gsap.utils.clamp(0, 1, (speed - ECHO_SPEED[0]) / (ECHO_SPEED[1] - ECHO_SPEED[0]))
      echo.style.opacity = (t * ECHO_OPACITY).toFixed(3)
      echo.style.transform = `translate3d(${echoPos.x - size.w / 2}px, ${echoPos.y - size.h / 2}px, 0) rotate(${turn.value}deg) scale(${s * 0.92})`
    }

    const start = () => {
      if (running) return
      running = true
      gsap.ticker.add(tick)
    }
    const stop = () => {
      if (!running) return
      running = false
      gsap.ticker.remove(tick)
    }

    const dock = () => {
      stop()
      mode = 'home'
      x.velocity = y.velocity = turn.velocity = scale.velocity = 0
      show(false)
      star.style.opacity = ''
    }

    const takeoff = () => {
      const target = measureHome()
      if (mode === 'home') {
        // Lift off from exactly where the logo is, at its size and tone.
        setSize(target.w, target.h)
        x.value = echoPos.x = target.x
        y.value = echoPos.y = target.y
        x.velocity = y.velocity = turn.velocity = scale.velocity = 0
        turn.value = turns * TURN
        scale.value = 1
        setTone(chromeTone())
        render()
        show(true)
        omega = OMEGA_FLIGHT
      }
      // From a return in progress, the springs simply change target (no reset: no snap).
      if (mode !== 'out') turns += 1
      mode = 'out'
      start()
    }

    const recall = () => {
      if (mode !== 'out') return
      mode = 'returning'
      turns += 1
      setTone(chromeTone())
    }
    recallRef.current = recall

    const overHome = (px: number, py: number) => {
      const box = homeBox.getBoundingClientRect()
      return (
        px >= box.left - HOME_HIT && px <= box.right + HOME_HIT && py >= box.top - HOME_HIT && py <= box.bottom + HOME_HIT
      )
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        recall()
        return
      }
      const px = event.clientX
      const py = event.clientY
      // Only real movement counts (scrolling fires pointer events without moving the mouse).
      if (pointer.seen) pointer.moved += Math.hypot(px - pointer.x, py - pointer.y)
      pointer.x = px
      pointer.y = py
      pointer.seen = true
      if (pointer.moved < TAKEOFF_MIN) return
      pointer.moved = 0
      pointer.last = performance.now()
      if (pausedRef.current || gsap.isTweening(homeBox) || overHome(px, py)) {
        recall()
        return
      }
      if (mode !== 'out') takeoff()
    }

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, MAX_DT)
      if (dt <= 0) return
      const target = measureHome()
      // The logo follows the viewport width (fluid size): keep the double matched.
      setSize(target.w, target.h)

      if (mode === 'out') {
        if (performance.now() - pointer.last > IDLE || overHome(pointer.x, pointer.y)) recall()
        else setTone(toneAt(pointer.x, pointer.y))
      }

      if (mode === 'out') {
        omega += (OMEGA_FOLLOW - omega) * (1 - Math.exp(-OMEGA_TIGHTEN * dt))
        stepSpring(x, pointer.x, omega, dt)
        stepSpring(y, pointer.y, omega, dt)
        stepSpring(scale, FOLLOW_SCALE, OMEGA_SCALE, dt)
      } else {
        omega = OMEGA_FLIGHT // the next takeoff starts slack again
        stepSpring(x, target.x, OMEGA_RETURN, dt)
        stepSpring(y, target.y, OMEGA_RETURN, dt)
        stepSpring(scale, 1, OMEGA_SCALE, dt)
      }
      stepSpring(turn, turns * TURN, OMEGA_TURN, dt)
      const k = 1 - Math.exp(-ECHO_FOLLOW * dt)
      echoPos.x += (x.value - echoPos.x) * k
      echoPos.y += (y.value - echoPos.y) * k

      if (mode === 'returning') {
        // Landing into a navbar that is hidden (scrolling down) fades with it.
        const distance = Math.hypot(x.value - target.x, y.value - target.y)
        const near = 1 - gsap.utils.clamp(0, 1, distance / 240)
        const headerOpacity = Number(getComputedStyle(header).opacity)
        star.style.opacity = String(1 - near * (1 - headerOpacity))
        const settled =
          distance < 0.5 &&
          Math.hypot(x.velocity, y.velocity) < 20 &&
          Math.abs(turn.value - turns * TURN) < 0.5 &&
          Math.abs(scale.value - 1) < 0.005
        if (settled) return dock()
      } else if (star.style.opacity) {
        star.style.opacity = ''
      }
      render()
    }

    // Pointer leaves the window, the window loses focus: fly home.
    const onLeave = (event: PointerEvent) => {
      if (!event.relatedTarget) recall()
    }
    // Hidden tab: the ticker stops, so dock at once (no frozen star mid-flight on return).
    const onVisibility = () => {
      if (document.hidden && mode !== 'home') dock()
      pointer.seen = false
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerout', onLeave, { passive: true })
    window.addEventListener('blur', recall)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onLeave)
      window.removeEventListener('blur', recall)
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
      recallRef.current = () => {}
      home.style.visibility = ''
    }
  }, [])

  const layer = 'pointer-events-none invisible fixed top-0 left-0 z-46 size-0 origin-center select-none'
  return (
    <>
      <StarMark ref={echoRef} className={`${layer} text-accent`} />
      <StarMark
        ref={starRef}
        className={`${layer} text-foreground transition-colors duration-300 data-[tone=ink]:text-ink`}
      />
    </>
  )
}
