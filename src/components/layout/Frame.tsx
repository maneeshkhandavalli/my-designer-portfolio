import { useRef } from 'react'
import { gsap, MOTION, MOTION_QUERIES, useGSAP } from '@/lib/gsap'

/**
 * Persistent thin border framing the viewport. Purely decorative; fades in once on load.
 * The line is ink over the light Hero and white over the dark page (split where the page
 * tone changes); the black matte that hides content outside the frame comes on once the
 * page under it is dark (`.frame-line` in globals.css, driven by lib/chromeTone.ts).
 */
export function Frame() {
  const frameRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_QUERIES.motionOk, () => {
      gsap.from(frameRef.current, {
        autoAlpha: 0,
        scale: 1.008,
        duration: 1.4,
        ease: 'power2.out',
        delay: MOTION.intro.frame,
      })
    })
  })

  return (
    <div
      ref={frameRef}
      aria-hidden="true"
      className="frame-line pointer-events-none fixed inset-(--frame-inset) z-50 border-(length:--frame-width)"
    />
  )
}
