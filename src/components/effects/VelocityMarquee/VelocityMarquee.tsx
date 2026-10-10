import { useLenis } from 'lenis/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { gsap } from '@/lib/gsap'

type VelocityMarqueeProps = {
  /** One repeat unit. It is cloned to fill the viewport and looped seamlessly. */
  children: ReactNode
  /** Idle speed in px per second. */
  baseSpeed?: number
  /** How strongly scroll velocity speeds the loop up. */
  velocityFactor?: number
  className?: string
}

const COPIES = 3

/**
 * Infinite horizontal marquee driven by Lenis scroll velocity:
 * steady drift when idle, faster while scrolling down, reverses on scroll up.
 * Decorative — give the surrounding section a real (sr-only) heading.
 * Static for reduced motion; the loop only ticks while on screen.
 */
export function VelocityMarquee({ children, baseSpeed = 70, velocityFactor = 0.5, className = '' }: VelocityMarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const unitRef = useRef<HTMLDivElement>(null)
  const velocity = useRef(0)
  const state = useRef({ x: 0, direction: 1, boost: 0 })
  const reducedMotion = usePrefersReducedMotion()
  const inView = useInView(rootRef, '10% 0px')

  useLenis((lenis) => {
    velocity.current = lenis.velocity
  })

  useEffect(() => {
    const track = trackRef.current
    const unit = unitRef.current
    if (reducedMotion || !inView || !track || !unit) return

    let unitWidth = unit.offsetWidth
    const resizeObserver = new ResizeObserver(() => {
      unitWidth = unit.offsetWidth
    })
    resizeObserver.observe(unit)

    const setX = gsap.quickSetter(track, 'x', 'px')
    const s = state.current

    const tick = (_time: number, deltaMs: number) => {
      const v = velocity.current
      if (v > 0.1) s.direction = 1
      else if (v < -0.1) s.direction = -1

      // Ease towards the velocity-derived boost; decay velocity between scroll events.
      const targetBoost = Math.min(Math.abs(v) * velocityFactor, 14)
      s.boost += (targetBoost - s.boost) * 0.08
      velocity.current *= 0.92

      s.x -= s.direction * baseSpeed * (1 + s.boost) * (deltaMs / 1000)
      if (unitWidth > 0) s.x = gsap.utils.wrap(-unitWidth, 0, s.x)
      setX(s.x)
    }

    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      resizeObserver.disconnect()
    }
  }, [reducedMotion, inView, baseSpeed, velocityFactor])

  return (
    <div ref={rootRef} aria-hidden="true" className={`overflow-hidden ${className}`.trim()}>
      <div ref={trackRef} className="flex w-max will-change-transform">
        {Array.from({ length: COPIES }, (_, index) => (
          <div key={index} ref={index === 0 ? unitRef : undefined} className="flex shrink-0">
            {children}
          </div>
        ))}
      </div>
    </div>
  )
}
