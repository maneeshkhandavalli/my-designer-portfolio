import type { RefObject } from 'react'
import { gsap, MOTION_QUERIES, useGSAP } from '@/lib/gsap'
import { createReveals } from '@/lib/reveal'

/**
 * Wires the shared scroll reveals (lib/reveal.ts) for every `[data-reveal]` inside
 * `scope`, with motion allowed only; cleaned up with the component. Sections inside
 * a pinned horizontal track call `createReveals` themselves with `containerAnimation`.
 */
export function useReveal(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_QUERIES.motionOk, () => {
        if (scope.current) createReveals(scope.current)
      })
    },
    { scope },
  )
}
