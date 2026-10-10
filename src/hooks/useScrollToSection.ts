import { useLenis } from 'lenis/react'
import { useCallback } from 'react'
import type { SectionId } from '@/lib/sections'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * Returns a function that scrolls to a section through Lenis (native fallback),
 * moves keyboard focus to it and updates the URL hash. A section can mark where
 * it should land with `[data-section-anchor]` (Story: after its transition).
 */
export function useScrollToSection() {
  const lenis = useLenis()
  const reducedMotion = usePrefersReducedMotion()

  return useCallback(
    (id: SectionId) => {
      const target = document.getElementById(id)
      if (!target) return
      const landing = target.querySelector<HTMLElement>('[data-section-anchor]') ?? target

      if (lenis) {
        lenis.scrollTo(landing, { immediate: reducedMotion, force: true })
      } else {
        landing.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
      }

      target.focus({ preventScroll: true })
      window.history.pushState(null, '', `#${id}`)
    },
    [lenis, reducedMotion],
  )
}
