import 'lenis/dist/lenis.css'
import { ReactLenis, useLenis, type LenisRef } from 'lenis/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { gsap, ScrollTrigger } from '@/lib/gsap'

type SmoothScrollProps = {
  children: ReactNode
}

/**
 * Global Lenis smooth scroll, driven by GSAP's ticker so Lenis and
 * ScrollTrigger share one animation frame and never drift apart.
 * Wheel smoothing is disabled for users who prefer reduced motion.
 */
export function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<LenisRef>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const update = (time: number) => {
      lenisRef.current?.lenis?.raf(time * 1000)
    }

    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)
    // Web fonts change layout heights — recompute trigger positions once they're in.
    void document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      gsap.ticker.remove(update)
      gsap.ticker.lagSmoothing(500, 33)
    }
  }, [])

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        smoothWheel: !reducedMotion,
        lerp: 0.1,
      }}
    >
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  )
}

/** Keeps ScrollTrigger positions in sync with Lenis' virtual scroll. */
function ScrollTriggerSync() {
  useLenis(ScrollTrigger.update)
  return null
}
