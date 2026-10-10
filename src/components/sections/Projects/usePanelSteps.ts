import type Lenis from 'lenis'
import { useEffect, type RefObject } from 'react'
import { gsap, MOTION, type ScrollTrigger } from '@/lib/gsap'

/** The pinned track's resting points, as page-scroll positions (first = pin start, last = pin end). */
export type PanelSteps = {
  trigger: ScrollTrigger
  stops: () => number[]
}

/** Wheel distance (px) a gesture must cover before it moves the track — filters trackpad jitter. */
const THRESHOLD = 40
/** A pause this long (ms) between wheel events ends a gesture. */
const GESTURE_GAP = 160
/** Tolerance (px) when comparing scroll positions. */
const EPS = 2

/**
 * Wheel/trackpad paging for the pinned Featured Work track: while it is pinned, one
 * deliberate gesture moves the track one panel (intro → each project), eased, instead of
 * the scroll mapping 1:1 onto the track (dozens of wheel notches per project).
 *
 * The wheel is taken over only inside the pin (and on the event that enters it, which
 * settles on its first or last panel). A gesture moves at most one panel — the rest of it,
 * including a trackpad's inertia, is absorbed — so leaving takes a fresh gesture: forward
 * from the last panel, back from the intro; Lenis then scrolls normally again.
 * Keyboard, scrollbar and touch are untouched (still scrubbed); so is everything outside.
 */
export function usePanelSteps(lenis: Lenis | undefined, stepsRef: RefObject<PanelSteps | null>) {
  useEffect(() => {
    if (!lenis) return
    const easeStep = gsap.parseEase(MOTION.ease.inOut)
    const easeSettle = gsap.parseEase(MOTION.ease.out)

    let lastTime = -Infinity
    let lastSize = 0
    let sum = 0
    let spent = false // this gesture already moved the track
    let busyUntil = 0

    const go = (target: number, settle: boolean, now: number) => {
      const duration = settle ? 0.8 : MOTION.duration.slow
      spent = true
      busyUntil = now + duration * 1000
      lenis.scrollTo(target, { duration, easing: settle ? easeSettle : easeStep, lock: true })
    }

    const onWheel = (event: WheelEvent) => {
      const steps = stepsRef.current
      if (!steps || event.ctrlKey || lenis.isStopped) return

      const scale = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? innerHeight : 1
      const now = event.timeStamp
      const size = Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY)) * scale
      // A new gesture: after a pause, a fresh push while the last one's inertia was fading,
      // or a wheel kept spinning well past the last step.
      if (now - lastTime > GESTURE_GAP || size > lastSize * 1.6 + 4 || (spent && now > busyUntil + 1200)) {
        sum = 0
        spent = false
      }
      lastTime = now
      lastSize = size

      const consume = () => {
        event.preventDefault()
        event.stopPropagation()
      }
      // Mid-step, or the remainder of a gesture that already stepped: absorb it.
      if (now < busyUntil || spent) return consume()

      const { start, end } = steps.trigger
      const y = lenis.targetScroll
      const inside = y > start - EPS && y < end + EPS
      // Inside, a sideways trackpad swipe pages too; elsewhere only vertical scroll counts.
      const delta =
        (inside && Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * scale
      if (delta === 0) return
      const forward = delta > 0

      // Arriving: the event that would carry the scroll into the pin settles on its edge panel.
      if (forward && y < start - EPS && y + delta > start - EPS) return consume(), go(start, true, now)
      if (!forward && y > end + EPS && y + delta < end + EPS) return consume(), go(end, true, now)

      // Leaving: forward from the last panel, back from the intro — normal scroll resumes.
      if (!inside || (forward && y >= end - EPS) || (!forward && y <= start + EPS)) return

      consume()
      sum = Math.sign(sum) === Math.sign(delta) ? sum + delta : delta
      if (Math.abs(sum) < THRESHOLD) return

      const stops = steps.stops()
      const target = forward ? stops.find((stop) => stop > y + EPS) : stops.findLast((stop) => stop < y - EPS)
      if (target !== undefined) go(target, false, now)
    }

    window.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => window.removeEventListener('wheel', onWheel, { capture: true })
  }, [lenis, stepsRef])
}
