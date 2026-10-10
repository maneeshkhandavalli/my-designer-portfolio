import { useLenis } from 'lenis/react'
import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { gsap, MOTION, useGSAP } from '@/lib/gsap'
import { INTRO_HANDOFF, isIntroOpen, markIntroOpen, markIntroReady } from '@/lib/intro'

/** The counter never runs 0 → 100 faster than this (s), however quickly the page is ready. */
const MIN_RUN = 0.8
/** The page is shown after this (ms) regardless; reduced motion holds no longer than REDUCED_WAIT. */
const MAX_WAIT = 3500
const REDUCED_WAIT = 1200
/** How tightly the counter and bar follow real progress (per second ≈ a 0.1 lerp per frame at 60 fps). */
const FOLLOW = 6.3
/** Motion blur on a rolling digit column: px per digit-step of lag, capped. */
const BLUR_PER_STEP = 0.1
const BLUR_MAX = 1.5
/** Curtain: shrink to SCALE, then the bottom edge rises; the crimson layer trails the lift by TRAIL. */
const SCALE = 0.8
const LIFT_AT = 0.3
const OPEN = 1
const TRAIL = 0.025
/** Into the opening, when the frame line (still white over black) starts turning to the page's ink: its colour transition is halfway as the curtain's edge uncovers it. */
const CHROME_AT = 0.13
/**
 * Gap between the counter going out and the curtain starting to open (s): chosen so the
 * rising edge clears the viewport centre (halfway through the symmetric lift) exactly when
 * the Hero's entrance starts, INTRO_HANDOFF after the handoff.
 */
const HOLD = INTRO_HANDOFF - LIFT_AT - OPEN / 2

/** Digit column strips — hundreds, tens, ones — long enough to roll straight through to 100. */
const COLUMNS = [2, 11, 101].map((length) => Array.from({ length }, (_, i) => i % 10))

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** What the first screen needs: each typeface the Hero and navigation use, and the page's own load. */
function readinessTasks(): Promise<unknown>[] {
  const fonts = ['400 1em Imbue', '600 1em Imbue', '1em "Old English Text MT"'].map((font) =>
    document.fonts.load(font).catch(() => undefined),
  )
  const page =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }))
  return [...fonts, page]
}

/**
 * Initial loading sequence, inside the persistent frame (which sits above it):
 *   1. black screen; a small rolling counter over a thin bar at the centre — both
 *      follow real readiness (the fonts, the page's load), never faster than MIN_RUN
 *   2. at 100 the counter fades and the bar retracts to its right end
 *   3. the black curtain shrinks towards the centre, then its bottom edge lifts
 *      away upwards, revealing the Hero; a crimson layer beneath trails the lift
 *      by a few frames, so the rising edge carries a thin accent line
 * One surface, one motion. markIntroReady() (Hero + nav entrance) fires as the
 * counter goes out, still covered; markIntroOpen() just after the curtain starts to open.
 * Reduced motion: a static count until ready (capped), then a short fade.
 */
export function Loader() {
  const [done, setDone] = useState(isIntroOpen)
  return done ? null : <LoaderScreen onDone={() => setDone(true)} />
}

function LoaderScreen({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const lenis = useLenis()

  useEffect(() => {
    lenis?.stop()
    return () => lenis?.start()
  }, [lenis])

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current
      if (!root || !contextSafe) return
      // Hundreds, tens, ones: each column rolls to its own place value (value / 100, / 10, / 1).
      const columns = Array.from(root.querySelectorAll<HTMLElement>('[data-loader-column]'), (mask, i) => ({
        mask,
        strip: mask.firstElementChild as HTMLElement,
        place: 10 ** (COLUMNS.length - 1 - i),
        position: 0,
      }))
      const bar = root.querySelector<HTMLElement>('[data-loader-bar]')
      if (!bar || columns.length !== COLUMNS.length) return

      let cancelled = false
      let settled = 0
      const tasks = readinessTasks()
      tasks.forEach((task) => void task.then(() => !cancelled && settled++))

      const renderColumns = (value: number, follow: number) => {
        for (const column of columns) {
          const lag = Math.floor(value / column.place) - column.position
          column.position += lag * follow
          column.strip.style.transform = `translate3d(0, ${-column.position}em, 0)`
          column.mask.style.filter = follow < 1 ? `blur(${Math.min(Math.abs(lag) * BLUR_PER_STEP, BLUR_MAX)}px)` : ''
        }
      }

      if (reducedMotion) {
        tasks.forEach(
          (task) => void task.then(() => !cancelled && renderColumns(Math.round((settled / tasks.length) * 100), 1)),
        )
        void Promise.race([Promise.all(tasks), wait(REDUCED_WAIT)]).then(
          contextSafe(() => {
            if (cancelled) return
            renderColumns(100, 1)
            markIntroOpen()
            gsap.to(root, { autoAlpha: 0, duration: 0.35, ease: 'power1.out', delay: 0.1, onComplete: onDone })
          }),
        )
        return () => {
          cancelled = true
        }
      }

      let ready = false
      void Promise.race([Promise.all(tasks), wait(MAX_WAIT)]).then(() => {
        ready = true
      })

      const curtain = contextSafe(() => {
        markIntroReady()
        // Created at the handoff, so it shares the Hero entrance's clock (the Hero hides its
        // content for its entrance from this moment): they stay in step across dropped frames.
        const open = { duration: OPEN, ease: MOTION.ease.inOut }
        gsap
          .timeline({
            delay: HOLD,
            onStart: () => gsap.ticker.remove(tick), // the counter has faded: stop rolling it
            onComplete: onDone,
          })
          .to('[data-loader-layer]', { scale: SCALE, ...open }, 0)
          .to('[data-loader-layer]', { clipPath: 'inset(0% 0% 100% 0%)', ...open, stagger: { each: TRAIL, from: 'end' } }, LIFT_AT)
          .call(markIntroOpen, undefined, CHROME_AT)
      })

      const finish = contextSafe(() => {
        gsap
          .timeline({ onStart: curtain })
          .to('[data-loader-count]', { autoAlpha: 0, duration: 0.3, ease: 'power1.out' }, 0)
          .set(bar, { transformOrigin: 'right center' }, 0)
          .to(bar, { scaleX: 0, duration: 0.6, ease: MOTION.ease.inOut }, 0)
      })

      gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' })
      gsap.set('[data-loader-layer]', { clipPath: 'inset(0% 0% 0% 0%)' })

      // Digits and bar both follow the (time-capped) real progress; the bar completing ends the
      // count — the last digits are still rolling home as the counter fades.
      const run = { bar: 0, elapsed: 0, finished: false }
      const tick = (_time: number, deltaMs: number) => {
        // The ticker runs without lag smoothing (SmoothScroll): clamp a stalled frame's delta.
        const dt = Math.min(deltaMs, 100) / 1000
        run.elapsed += dt
        const progress = ready ? 100 : (settled / tasks.length) * 100
        const target = Math.round(Math.min(progress, (100 * run.elapsed) / MIN_RUN))
        const follow = 1 - Math.exp(-FOLLOW * dt)
        renderColumns(target, follow)
        run.bar += (target / 100 - run.bar) * follow
        if (target === 100 && run.bar > 0.995) run.bar = 1
        gsap.set(bar, { scaleX: run.bar })

        if (run.bar === 1 && !run.finished) {
          run.finished = true
          finish()
        }
      }
      gsap.ticker.add(tick)

      return () => {
        cancelled = true
        gsap.ticker.remove(tick)
      }
    },
    { scope: rootRef, dependencies: [reducedMotion], revertOnUpdate: true },
  )

  return (
    <div ref={rootRef} role="status" aria-label="Loading" className="fixed inset-0 z-48">
      {/* The curtain: crimson beneath, black on top — one surface whose trailing edge shows red. */}
      <div data-loader-layer aria-hidden="true" className="absolute inset-0 bg-accent" />
      <div data-loader-layer aria-hidden="true" className="absolute inset-0 bg-background" />

      <div
        data-loader-count
        aria-hidden="true"
        className="label absolute inset-x-0 bottom-[calc(50%+0.75rem)] flex justify-center text-[0.8125rem] leading-none text-foreground tabular-nums"
      >
        {COLUMNS.map((digits, column) => (
          <span key={column} data-loader-column className="block h-[1em] overflow-hidden">
            <span className="flex flex-col">
              {digits.map((digit, i) => (
                <span key={i} className="block h-[1em] leading-none">
                  {digit}
                </span>
              ))}
            </span>
          </span>
        ))}
      </div>
      <div
        data-loader-bar
        aria-hidden="true"
        className="absolute top-1/2 left-[calc(50%-3.125rem)] h-px w-[6.25rem] bg-foreground"
      />
    </div>
  )
}
