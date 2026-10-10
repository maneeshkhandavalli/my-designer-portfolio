/**
 * Single entry point for GSAP. Import gsap, plugins and useGSAP from here
 * (never directly from 'gsap') so plugins are always registered exactly once.
 */
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

/** Shared motion tokens — mirror of the CSS tokens in styles/animations.css. */
export const MOTION = {
  ease: {
    out: 'expo.out',
    inOut: 'power4.inOut',
    reveal: 'power4.out',
  },
  duration: {
    fast: 0.2,
    base: 0.5,
    slow: 1,
    reveal: 1.2,
  },
  /**
   * Page-load: the frame fades in under the Loader at `frame`; everything else
   * (navigation, Hero construction) starts from the Loader handoff — see lib/intro.ts.
   */
  intro: {
    frame: 0,
  },
} as const

/** Media queries for gsap.matchMedia(): branch animations on reduced-motion / viewport. */
export const MOTION_QUERIES = {
  motionOk: '(prefers-reduced-motion: no-preference)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  desktop: '(min-width: 1024px)',
} as const

gsap.defaults({ ease: MOTION.ease.out, duration: MOTION.duration.base })

export { gsap, ScrollTrigger, SplitText, useGSAP }
